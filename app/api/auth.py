"""
Authentication API endpoints - Local Database Authentication
"""

import os
from typing import Optional
from urllib.parse import urlencode

from fastapi import APIRouter, Depends, HTTPException, Request, Response, Form
from fastapi.responses import RedirectResponse, HTMLResponse, JSONResponse
from sqlalchemy.orm import Session
from pydantic import ValidationError

from app.db import get_db
from app.auth_local import (
    create_user, authenticate_user, set_session_cookie, clear_session_cookie,
    get_current_user_optional, get_current_user, extract_next_url,
    AuthenticationError, change_password, generate_csrf_token
)
from app.models.user import UserProfile, UserCreate, UserLogin, PasswordChange

router = APIRouter(tags=["auth"])


@router.get("/login")
async def login_page(request: Request, db: Session = Depends(get_db)):
    """Serve login page"""
    # Check if user is already authenticated
    user = get_current_user_optional(request, db)
    if user:
        next_url = extract_next_url(request)
        return RedirectResponse(url=next_url, status_code=302)

    # Serve login page
    from fastapi.responses import FileResponse
    return FileResponse("web/login.html")


@router.get("/register")
async def register_page(request: Request, db: Session = Depends(get_db)):
    """Serve registration page"""
    # Check if user is already authenticated
    user = get_current_user_optional(request, db)
    if user:
        next_url = extract_next_url(request)
        return RedirectResponse(url=next_url, status_code=302)

    # Serve registration page
    from fastapi.responses import FileResponse
    return FileResponse("web/register.html")


@router.post("/auth/login")
async def login(request: Request, response: Response, db: Session = Depends(get_db)):
    """Login with email and password"""
    try:
        # Get form data
        form_data = await request.form()
        email = form_data.get("email")
        password = form_data.get("password")
        next_url = form_data.get("next", "/cursos")

        print(f"🔐 Login attempt: email={email}, password={'*' * len(password) if password else None}")

        if not email or not password:
            raise HTTPException(status_code=400, detail="Email and password are required")

        # Create login data
        login_data = UserLogin(email=email, password=password)

        # Authenticate user
        print(f"🔍 Authenticating user: {email}")
        user = await authenticate_user(login_data, db)
        print(f"✅ Authentication successful for: {user.email}")

        # Set session cookie
        redirect_response = RedirectResponse(url=next_url, status_code=302)
        set_session_cookie(redirect_response, user)

        return redirect_response

    except AuthenticationError as e:
        print(f"❌ Authentication failed: {e}")
        # Redirect back to login with error
        error_url = f"/login?error={str(e)}&next={next_url}"
        return RedirectResponse(url=error_url, status_code=302)
    except ValidationError as e:
        error_msg = "Invalid input data"
        error_url = f"/login?error={error_msg}&next={next_url}"
        return RedirectResponse(url=error_url, status_code=302)
    except Exception as e:
        error_url = f"/login?error=Login failed&next={next_url}"
        return RedirectResponse(url=error_url, status_code=302)


@router.post("/auth/register")
async def register(request: Request, response: Response, db: Session = Depends(get_db)):
    """Register new user"""
    try:
        # Get form data
        form_data = await request.form()
        email = form_data.get("email")
        name = form_data.get("name")
        password = form_data.get("password")
        confirm_password = form_data.get("confirm_password")
        next_url = form_data.get("next", "/cursos")

        if not all([email, name, password, confirm_password]):
            raise HTTPException(status_code=400, detail="All fields are required")

        # Create user data
        user_data = UserCreate(
            email=email,
            name=name,
            password=password,
            confirm_password=confirm_password
        )

        # Create user
        user = await create_user(user_data, db)

        # Set session cookie and redirect
        redirect_response = RedirectResponse(url=next_url, status_code=302)
        set_session_cookie(redirect_response, user)

        return redirect_response

    except AuthenticationError as e:
        error_url = f"/register?error={str(e)}&next={next_url}"
        return RedirectResponse(url=error_url, status_code=302)
    except ValidationError as e:
        error_msg = "Invalid input data"
        if e.errors():
            error_msg = e.errors()[0]['msg']
        error_url = f"/register?error={error_msg}&next={next_url}"
        return RedirectResponse(url=error_url, status_code=302)
    except Exception as e:
        error_url = f"/register?error=Registration failed&next={next_url}"
        return RedirectResponse(url=error_url, status_code=302)


@router.post("/auth/change-password")
async def change_password_endpoint(
    request: Request,
    password_data: PasswordChange,
    db: Session = Depends(get_db)
):
    """Change user password"""
    user = get_current_user(request, db)

    try:
        await change_password(
            user,
            password_data.current_password,
            password_data.new_password,
            db
        )
        return {"message": "Password changed successfully"}
    except AuthenticationError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/logout")
@router.get("/logout")
async def logout(request: Request):
    """Logout user"""
    response = RedirectResponse(url="/", status_code=302)
    clear_session_cookie(response)
    return response


@router.get("/api/auth/me")
async def get_current_user_profile(request: Request, db: Session = Depends(get_db)):
    """Get current user profile"""
    user = get_current_user_optional(request, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    return UserProfile(
        id=user.id,
        email=user.email,
        name=user.name,
        picture=user.picture
    )


@router.get("/api/auth/status")
async def auth_status(request: Request, db: Session = Depends(get_db)):
    """Check authentication status"""
    user = get_current_user_optional(request, db)

    if user:
        return {
            "authenticated": True,
            "user": {
                "id": user.id,
                "email": user.email,
                "name": user.name,
                "picture": user.picture
            },
            "auth_type": "local"
        }
    else:
        return {
            "authenticated": False,
            "auth_type": "local"
        }


# Protected route example
@router.get("/profile")
async def profile_page(request: Request, db: Session = Depends(get_db)):
    """Serve user profile page (protected)"""
    user = get_current_user_optional(request, db)
    if not user:
        next_url = "/profile"
        return RedirectResponse(
            url=f"/login?next={next_url}",
            status_code=302
        )
    
    from fastapi.responses import FileResponse
    return FileResponse("web/profile.html")


# Authentication configuration
@router.get("/api/auth/config")
async def auth_config():
    """Get authentication configuration"""
    return {
        "auth_type": "local",
        "login_methods": ["email"],
        "registration_enabled": True,
        "login_url": "/login",
        "register_url": "/register",
        "logout_url": "/logout"
    }
