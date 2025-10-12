from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, Enum
from sqlalchemy.sql import func
from app.db import Base
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
import enum

class ContactType(str, enum.Enum):
    GENERAL = "general"
    COLLABORATION = "collaboration"
    MEDIA = "media"
    STUDENT = "student"
    FUNDING = "funding"

class ContactStatus(str, enum.Enum):
    NEW = "new"
    READ = "read"
    REPLIED = "replied"
    CLOSED = "closed"

class Contact(Base):
    __tablename__ = "contacts"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    email = Column(String(200), nullable=False, index=True)
    subject = Column(String(300), nullable=False)
    message = Column(Text, nullable=False)
    contact_type = Column(Enum(ContactType), default=ContactType.GENERAL)
    status = Column(Enum(ContactStatus), default=ContactStatus.NEW, index=True)
    ip_address = Column(String(45))  # For basic spam protection
    user_agent = Column(String(500))
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class Newsletter(Base):
    __tablename__ = "newsletter_subscribers"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(200), unique=True, nullable=False, index=True)
    name = Column(String(200))
    is_active = Column(Boolean, default=True)
    subscribed_at = Column(DateTime(timezone=True), server_default=func.now())
    unsubscribed_at = Column(DateTime(timezone=True))

# Pydantic models for API
class ContactCreate(BaseModel):
    name: str
    email: EmailStr
    subject: str
    message: str
    contact_type: ContactType = ContactType.GENERAL

class ContactResponse(BaseModel):
    id: int
    name: str
    email: str
    subject: str
    message: str
    contact_type: ContactType
    status: ContactStatus
    created_at: datetime

    class Config:
        from_attributes = True

class NewsletterSubscribe(BaseModel):
    email: EmailStr
    name: Optional[str] = None

class NewsletterResponse(BaseModel):
    id: int
    email: str
    name: Optional[str] = None
    is_active: bool
    subscribed_at: datetime

    class Config:
        from_attributes = True
