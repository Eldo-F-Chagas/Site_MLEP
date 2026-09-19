import os
import secrets

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
import logging

from app.db import get_db
from app.models.contact import (
    Contact, ContactCreate, ContactResponse,
    Newsletter, NewsletterSubscribe, NewsletterResponse
)

router = APIRouter()
logger = logging.getLogger(__name__)


def require_admin_token(request: Request) -> None:
    expected = os.getenv("ADMIN_STATS_TOKEN", "")
    provided = request.headers.get("x-admin-token", "")
    if not expected or not secrets.compare_digest(provided, expected):
        raise HTTPException(status_code=403, detail="Admin access required")

@router.post("/contact", response_model=dict)
async def submit_contact_form(
    contact_data: ContactCreate,
    request: Request,
    db: Session = Depends(get_db)
):
    """Submit a contact form"""
    
    try:
        # Get client IP and user agent for basic spam protection
        client_ip = request.client.host if request.client else None
        user_agent = request.headers.get("user-agent", "")
        
        # Create contact record
        contact = Contact(
            name=contact_data.name,
            email=contact_data.email,
            subject=contact_data.subject,
            message=contact_data.message,
            contact_type=contact_data.contact_type,
            ip_address=client_ip,
            user_agent=user_agent[:500]  # Truncate if too long
        )
        
        db.add(contact)
        db.commit()
        db.refresh(contact)
        
        logger.info(f"New contact form submission from {contact_data.email}: {contact_data.subject}")
        
        return {
            "success": True,
            "message": "Your message has been sent successfully. We'll get back to you soon!",
            "contact_id": contact.id
        }
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error submitting contact form: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="There was an error sending your message. Please try again later."
        )

@router.post("/newsletter/subscribe", response_model=dict)
async def subscribe_newsletter(
    subscription_data: NewsletterSubscribe,
    db: Session = Depends(get_db)
):
    """Subscribe to newsletter"""
    
    try:
        # Check if email already exists
        existing = db.query(Newsletter).filter(Newsletter.email == subscription_data.email).first()
        
        if existing:
            if existing.is_active:
                return {
                    "success": True,
                    "message": "You are already subscribed to our newsletter!",
                    "already_subscribed": True
                }
            else:
                # Reactivate subscription
                existing.is_active = True
                existing.unsubscribed_at = None
                db.commit()
                return {
                    "success": True,
                    "message": "Welcome back! Your newsletter subscription has been reactivated.",
                    "reactivated": True
                }
        
        # Create new subscription
        subscription = Newsletter(
            email=subscription_data.email,
            name=subscription_data.name
        )
        
        db.add(subscription)
        db.commit()
        db.refresh(subscription)
        
        logger.info(f"New newsletter subscription: {subscription_data.email}")
        
        return {
            "success": True,
            "message": "Thank you for subscribing to our newsletter!",
            "subscription_id": subscription.id
        }
        
    except IntegrityError:
        db.rollback()
        return {
            "success": True,
            "message": "You are already subscribed to our newsletter!",
            "already_subscribed": True
        }
    except Exception as e:
        db.rollback()
        logger.error(f"Error subscribing to newsletter: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="There was an error processing your subscription. Please try again later."
        )

@router.post("/newsletter/unsubscribe", response_model=dict)
async def unsubscribe_newsletter(
    email: str,
    db: Session = Depends(get_db),
    _admin=Depends(require_admin_token),
):
    """Administrative unsubscription until verified email links are configured."""
    
    try:
        subscription = db.query(Newsletter).filter(Newsletter.email == email).first()
        
        if not subscription:
            raise HTTPException(status_code=404, detail="Email not found in our newsletter list")
        
        if not subscription.is_active:
            return {
                "success": True,
                "message": "You are already unsubscribed from our newsletter.",
                "already_unsubscribed": True
            }
        
        # Deactivate subscription
        from datetime import datetime
        subscription.is_active = False
        subscription.unsubscribed_at = datetime.now()
        db.commit()
        
        logger.info(f"Newsletter unsubscription: {email}")
        
        return {
            "success": True,
            "message": "You have been successfully unsubscribed from our newsletter."
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error unsubscribing from newsletter: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="There was an error processing your unsubscription. Please try again later."
        )

@router.get("/contact/stats")
async def get_contact_stats(
    db: Session = Depends(get_db),
    _admin=Depends(require_admin_token),
):
    """Get contact form statistics (for admin use)"""
    
    total_contacts = db.query(Contact).count()
    total_subscribers = db.query(Newsletter).filter(Newsletter.is_active == True).count()
    
    contacts_by_type = db.query(Contact.contact_type, func.count(Contact.id)).group_by(Contact.contact_type).all()
    contacts_by_status = db.query(Contact.status, func.count(Contact.id)).group_by(Contact.status).all()
    
    return {
        "total_contacts": total_contacts,
        "total_newsletter_subscribers": total_subscribers,
        "contacts_by_type": [{"type": type.value, "count": count} for type, count in contacts_by_type],
        "contacts_by_status": [{"status": status.value, "count": count} for status, count in contacts_by_status]
    }
