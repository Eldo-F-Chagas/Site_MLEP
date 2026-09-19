"""Local email/password authentication endpoints."""

import logging
from urllib.parse import urlencode

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import FileResponse, RedirectResponse
from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.auth_local import (
    AuthenticationError,
    authenticate_user,
    change_password,
    clear_session_cookie,
    create_user,
    extract_next_url,
    get_current_user,
    get_current_user_optional,
    sanitize_next_url,
    set_session_cookie,
)
from app.db import get_db
from app.models.user import PasswordChange, UserCreate, UserLogin, UserProfile

router = APIRouter(tags=["auth"])
logger = logging.getLogger(__name__)


def _error_redirect(page: str, message: str, next_url: str) -> RedirectResponse:
    query = urlencode({"error": message, "next": next_url})
    return RedirectResponse(url=f"/{page}?{query}", status_code=303)


@router.get("/login")
async def login_page(request: Request, db: Session = Depends(get_db)):
    if get_current_user_optional(request, db):
        return RedirectResponse(url=extract_next_url(request), status_code=303)
    return FileResponse("web/login.html")


@router.get("/register")
async def register_page(request: Request, db: Session = Depends(get_db)):
    if get_current_user_optional(request, db):
        return RedirectResponse(url=extract_next_url(request), status_code=303)
    return FileResponse("web/register.html")


@router.post("/auth/login")
async def login(request: Request, db: Session = Depends(get_db)):
    form_data = await request.form()
    email = str(form_data.get("email", "")).strip()
    password = str(form_data.get("password", ""))
    next_url = sanitize_next_url(str(form_data.get("next", "/cursos")))

    if not email or not password:
        return _error_redirect("login", "Informe e-mail e senha.", next_url)

    try:
        user = await authenticate_user(UserLogin(email=email, password=password), db)
    except (AuthenticationError, ValidationError):
        return _error_redirect("login", "E-mail ou senha inválidos.", next_url)
    except Exception:
        logger.exception("Unexpected login failure")
        return _error_redirect("login", "Não foi possível entrar. Tente novamente.", next_url)

    response = RedirectResponse(url=next_url, status_code=303)
    set_session_cookie(response, user)
    return response


@router.post("/auth/register")
async def register(request: Request, db: Session = Depends(get_db)):
    form_data = await request.form()
    next_url = sanitize_next_url(str(form_data.get("next", "/cursos")))

    try:
        user_data = UserCreate(
            email=str(form_data.get("email", "")).strip(),
            name=str(form_data.get("name", "")).strip(),
            password=str(form_data.get("password", "")),
            confirm_password=str(form_data.get("confirm_password", "")),
        )
        user = await create_user(user_data, db)
    except AuthenticationError as exc:
        return _error_redirect("register", str(exc), next_url)
    except ValidationError as exc:
        message = exc.errors()[0].get("msg", "Dados inválidos.") if exc.errors() else "Dados inválidos."
        return _error_redirect("register", message, next_url)
    except Exception:
        logger.exception("Unexpected registration failure")
        return _error_redirect("register", "Não foi possível criar a conta. Tente novamente.", next_url)

    response = RedirectResponse(url=next_url, status_code=303)
    set_session_cookie(response, user)
    return response


@router.post("/auth/change-password")
async def change_password_endpoint(
    request: Request,
    password_data: PasswordChange,
    db: Session = Depends(get_db),
):
    user = get_current_user(request, db)
    try:
        await change_password(user, password_data.current_password, password_data.new_password, db)
    except AuthenticationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {"message": "Password changed successfully"}


@router.post("/logout")
async def logout():
    response = RedirectResponse(url="/", status_code=303)
    clear_session_cookie(response)
    return response


@router.get("/api/auth/me", response_model=UserProfile)
async def get_current_user_profile(request: Request, db: Session = Depends(get_db)):
    user = get_current_user(request, db)
    return UserProfile.model_validate(user)


@router.get("/api/auth/status")
async def auth_status(request: Request, db: Session = Depends(get_db)):
    user = get_current_user_optional(request, db)
    if not user:
        return {"authenticated": False, "auth_type": "local"}
    return {
        "authenticated": True,
        "user": UserProfile.model_validate(user).model_dump(),
        "auth_type": "local",
    }


@router.get("/profile")
async def profile_page(request: Request, db: Session = Depends(get_db)):
    if not get_current_user_optional(request, db):
        return RedirectResponse(url="/login?next=/profile", status_code=303)
    return FileResponse("web/profile.html")


@router.get("/settings")
async def settings_page(request: Request, db: Session = Depends(get_db)):
    if not get_current_user_optional(request, db):
        return RedirectResponse(url="/login?next=/settings", status_code=303)
    return FileResponse("web/settings.html")


@router.get("/api/auth/config")
async def auth_config():
    return {
        "auth_type": "local",
        "login_methods": ["email"],
        "registration_enabled": True,
        "login_url": "/login",
        "register_url": "/register",
        "logout_url": "/logout",
    }
