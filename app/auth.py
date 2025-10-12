"""
Authentication system with Google OAuth
"""

import os
import secrets
from datetime import datetime, timedelta
from typing import Optional
from urllib.parse import urlencode, parse_qs, urlparse

from fastapi import HTTPException, Request, Response, Depends
from fastapi.security import HTTPBearer
from sqlalchemy.orm import Session
from authlib.integrations.starlette_client import OAuth
from authlib.integrations.starlette_client import OAuthError
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired

from app.db import get_db
from app.models.user import User, UserCreate, UserUpdate, SessionData


# Configuration
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
SESSION_SECRET = os.getenv("SESSION_SECRET", "dev-session-secret-change-in-production")
APP_BASE_URL = os.getenv("APP_BASE_URL", "http://localhost:8000")
SESSION_COOKIE_NAME = "mlep_session"
SESSION_EXPIRES_DAYS = 7

# Initialize OAuth
oauth = OAuth()

def is_oauth_configured():
    """Check if OAuth is properly configured"""
    return (GOOGLE_CLIENT_ID and
            GOOGLE_CLIENT_SECRET and
            GOOGLE_CLIENT_ID != "your-google-client-id.apps.googleusercontent.com" and
            GOOGLE_CLIENT_SECRET != "your-google-client-secret" and
            len(GOOGLE_CLIENT_ID) > 20 and
            len(GOOGLE_CLIENT_SECRET) > 20)

if is_oauth_configured():
    try:
        oauth.register(
            name='google',
            client_id=GOOGLE_CLIENT_ID,
            client_secret=GOOGLE_CLIENT_SECRET,
            server_metadata_url='https://accounts.google.com/.well-known/openid_configuration',
            client_kwargs={
                'scope': 'openid email profile'
            }
        )
    except Exception as e:
        print(f"Warning: Failed to register OAuth client: {e}")
        oauth = None
else:
    print("Warning: Google OAuth not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env file")
    oauth = None

# Session serializer
session_serializer = URLSafeTimedSerializer(SESSION_SECRET)


class AuthenticationError(Exception):
    """Custom authentication error"""
    pass


def create_session_token(user: User) -> str:
    """Create a signed session token"""
    expires_at = datetime.utcnow() + timedelta(days=SESSION_EXPIRES_DAYS)
    
    session_data = SessionData(
        user_id=user.id,
        email=user.email,
        name=user.name,
        picture=user.picture,
        created_at=datetime.utcnow(),
        expires_at=expires_at
    )
    
    return session_serializer.dumps(session_data.dict())


def verify_session_token(token: str) -> Optional[SessionData]:
    """Verify and decode session token"""
    try:
        # Verify signature and expiration
        data = session_serializer.loads(
            token, 
            max_age=SESSION_EXPIRES_DAYS * 24 * 3600  # seconds
        )
        
        session_data = SessionData(**data)
        
        # Check if session is expired
        if datetime.utcnow() > session_data.expires_at:
            return None
            
        return session_data
        
    except (BadSignature, SignatureExpired, ValueError):
        return None


def get_session_from_request(request: Request) -> Optional[SessionData]:
    """Extract session from request cookies"""
    token = request.cookies.get(SESSION_COOKIE_NAME)
    if not token:
        return None
    
    return verify_session_token(token)


def set_session_cookie(response: Response, user: User) -> None:
    """Set session cookie in response"""
    token = create_session_token(user)
    
    # Cookie settings
    secure = APP_BASE_URL.startswith("https://")
    
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=token,
        max_age=SESSION_EXPIRES_DAYS * 24 * 3600,  # seconds
        httponly=True,
        secure=secure,
        samesite="lax"
    )


def clear_session_cookie(response: Response) -> None:
    """Clear session cookie"""
    response.delete_cookie(
        key=SESSION_COOKIE_NAME,
        httponly=True,
        secure=APP_BASE_URL.startswith("https://"),
        samesite="lax"
    )


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


async def create_or_update_user(google_user_info: dict, db: Session) -> User:
    """Create or update user from Google user info"""
    google_sub = google_user_info.get("sub")
    email = google_user_info.get("email")
    name = google_user_info.get("name")
    picture = google_user_info.get("picture")
    
    if not google_sub or not email:
        raise AuthenticationError("Invalid Google user info")
    
    # Check if user exists
    user = db.query(User).filter(User.google_sub == google_sub).first()
    
    if user:
        # Update existing user
        user.email = email
        user.name = name
        user.picture = picture
        user.last_login = datetime.utcnow()
    else:
        # Create new user
        user = User(
            email=email,
            name=name,
            picture=picture,
            google_sub=google_sub,
            last_login=datetime.utcnow()
        )
        db.add(user)
    
    db.commit()
    db.refresh(user)
    
    return user


def generate_oauth_state() -> str:
    """Generate secure state parameter for OAuth"""
    return secrets.token_urlsafe(32)


def build_oauth_redirect_url(base_url: str, next_url: Optional[str] = None) -> str:
    """Build OAuth redirect URL with next parameter"""
    params = {}
    if next_url:
        params['next'] = next_url
    
    if params:
        return f"{base_url}?{urlencode(params)}"
    return base_url


def extract_next_url(request: Request, fallback: str = "/cursos") -> str:
    """Extract and validate next URL from request"""
    next_url = request.query_params.get("next", fallback)
    
    # Security: only allow relative URLs or same origin
    if next_url.startswith("/"):
        return next_url
    
    try:
        parsed = urlparse(next_url)
        if not parsed.netloc:  # Relative URL
            return next_url
        
        # Check if same origin
        request_host = request.headers.get("host", "")
        if parsed.netloc == request_host:
            return next_url
    except:
        pass
    
    # Fallback to safe default
    return fallback


# OAuth error handling
class OAuthErrorHandler:
    @staticmethod
    def handle_oauth_error(error: OAuthError) -> HTTPException:
        """Handle OAuth errors"""
        error_description = getattr(error, 'description', str(error))
        
        if 'access_denied' in error_description:
            return HTTPException(
                status_code=400,
                detail="oauth_access_denied"
            )
        
        return HTTPException(
            status_code=400,
            detail=f"oauth_error: {error_description}"
        )


# Utility functions for frontend
def get_user_avatar_url(user: User, size: int = 40) -> str:
    """Get user avatar URL with fallback"""
    if user.picture:
        return user.picture
    
    # Fallback to Gravatar or default avatar
    import hashlib
    email_hash = hashlib.md5(user.email.lower().encode()).hexdigest()
    return f"https://www.gravatar.com/avatar/{email_hash}?s={size}&d=identicon"


def get_user_display_name(user: User) -> str:
    """Get user display name with fallback"""
    if user.name:
        return user.name
    
    # Extract name from email
    return user.email.split('@')[0].title()
