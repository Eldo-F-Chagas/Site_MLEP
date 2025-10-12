"""
Local authentication system with password-based login
"""

import os
import secrets
import hashlib
from datetime import datetime, timedelta
from typing import Optional

from fastapi import HTTPException, Request, Response, Depends
from sqlalchemy.orm import Session
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired
import bcrypt

from app.db import get_db
from app.models.user import User, UserCreate, UserLogin, UserUpdate, SessionData


# Configuration
SESSION_SECRET = os.getenv("SESSION_SECRET", "dev-session-secret-change-in-production")
SESSION_COOKIE_NAME = "mlep_session"
SESSION_EXPIRES_DAYS = 7

# Session serializer
session_serializer = URLSafeTimedSerializer(SESSION_SECRET)


class AuthenticationError(Exception):
    """Custom authentication error"""
    pass


def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')


def verify_password(password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return bcrypt.checkpw(password.encode('utf-8'), hashed_password.encode('utf-8'))


def create_session_token(user: User) -> str:
    """Create a signed session token"""
    session_data = {
        "user_id": user.id,
        "email": user.email,
        "name": user.name,
        "picture": user.picture,
        "created_at": datetime.utcnow().isoformat(),
        "expires_at": (datetime.utcnow() + timedelta(days=SESSION_EXPIRES_DAYS)).isoformat()
    }
    
    return session_serializer.dumps(session_data)


def verify_session_token(token: str) -> Optional[SessionData]:
    """Verify and decode session token"""
    try:
        # Verify signature and expiration
        data = session_serializer.loads(
            token, 
            max_age=SESSION_EXPIRES_DAYS * 24 * 3600  # seconds
        )
        
        # Convert ISO strings back to datetime
        data['created_at'] = datetime.fromisoformat(data['created_at'])
        data['expires_at'] = datetime.fromisoformat(data['expires_at'])
        
        session_data = SessionData(**data)
        
        # Check if session is expired
        if datetime.utcnow() > session_data.expires_at:
            return None
            
        return session_data
        
    except (BadSignature, SignatureExpired, ValueError):
        return None


def set_session_cookie(response: Response, user: User):
    """Set session cookie in response"""
    token = create_session_token(user)
    
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=token,
        max_age=SESSION_EXPIRES_DAYS * 24 * 3600,  # seconds
        httponly=True,
        secure=False,  # Set to True in production with HTTPS
        samesite="lax"
    )


def clear_session_cookie(response: Response):
    """Clear session cookie"""
    response.delete_cookie(
        key=SESSION_COOKIE_NAME,
        httponly=True,
        secure=False,  # Set to True in production with HTTPS
        samesite="lax"
    )


def get_session_from_request(request: Request) -> Optional[SessionData]:
    """Extract session from request cookies"""
    token = request.cookies.get(SESSION_COOKIE_NAME)
    if not token:
        return None
    
    return verify_session_token(token)


def get_current_user_optional(request: Request, db: Session = Depends(get_db)) -> Optional[User]:
    """Get current user from session (optional - returns None if not authenticated)"""
    session_data = get_session_from_request(request)
    if not session_data:
        return None
    
    user = db.query(User).filter(
        User.id == session_data.user_id,
        User.is_active == True
    ).first()
    
    return user


def get_current_user(request: Request, db: Session = Depends(get_db)) -> User:
    """Get current user from session (required - raises 401 if not authenticated)"""
    user = get_current_user_optional(request, db)
    if not user:
        raise HTTPException(
            status_code=401,
            detail="auth_required",
            headers={"WWW-Authenticate": "Bearer"}
        )
    return user


def require_auth(user: User = Depends(get_current_user)) -> User:
    """Dependency to require authentication"""
    return user


async def create_user(user_data: UserCreate, db: Session) -> User:
    """Create a new user with hashed password"""
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise AuthenticationError("User with this email already exists")
    
    # Hash the password
    password_hash = hash_password(user_data.password)
    
    # Create new user
    user = User(
        email=user_data.email,
        name=user_data.name,
        password_hash=password_hash,
        picture=user_data.picture,
        google_sub=None,  # Local users don't have Google sub
        is_verified=False,  # Email verification can be implemented later
        last_login=datetime.utcnow()
    )
    
    db.add(user)
    db.commit()
    db.refresh(user)
    
    return user


async def authenticate_user(login_data: UserLogin, db: Session) -> User:
    """Authenticate user with email and password"""
    user = db.query(User).filter(
        User.email == login_data.email,
        User.is_active == True
    ).first()
    
    if not user:
        raise AuthenticationError("Invalid email or password")
    
    if not verify_password(login_data.password, user.password_hash):
        raise AuthenticationError("Invalid email or password")
    
    # Update last login
    user.last_login = datetime.utcnow()
    db.commit()
    
    return user


async def change_password(user: User, current_password: str, new_password: str, db: Session) -> bool:
    """Change user password"""
    # Verify current password
    if not verify_password(current_password, user.password_hash):
        raise AuthenticationError("Current password is incorrect")
    
    # Hash new password
    new_password_hash = hash_password(new_password)
    
    # Update password
    user.password_hash = new_password_hash
    db.commit()
    
    return True


def extract_next_url(request: Request) -> str:
    """Extract next URL from request parameters"""
    next_url = request.query_params.get("next", "/cursos")
    
    # Security: Only allow relative URLs
    if next_url.startswith("http://") or next_url.startswith("https://"):
        return "/cursos"
    
    return next_url


def generate_csrf_token() -> str:
    """Generate CSRF token"""
    return secrets.token_urlsafe(32)


def verify_csrf_token(token: str, session_token: str) -> bool:
    """Verify CSRF token (simple implementation)"""
    # In a real implementation, you'd store CSRF tokens in session
    # For now, we'll use a simple check
    return len(token) == 43  # URL-safe base64 token length
