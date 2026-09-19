"""
User models for authentication system
"""

from datetime import datetime
from typing import Optional
from sqlalchemy import Column, Integer, String, DateTime, Boolean
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator
from app.db import Base


# SQLAlchemy Model
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=False)
    password_hash = Column(String(255), nullable=False)
    picture = Column(String(500), nullable=True)
    google_sub = Column(String(255), unique=False, index=True, nullable=True)  # Optional for local users
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)  # Email verification
    created_at = Column(DateTime, default=datetime.utcnow)
    last_login = Column(DateTime, default=datetime.utcnow)


# Pydantic Schemas
class UserBase(BaseModel):
    email: EmailStr
    name: str = Field(min_length=2, max_length=255)
    picture: Optional[str] = None


class UserCreate(UserBase):
    password: str = Field(min_length=8, max_length=72)
    confirm_password: str = Field(min_length=8, max_length=72)

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        if len(value.encode("utf-8")) > 72:
            raise ValueError("Password must not exceed 72 bytes")
        if not any(character.isupper() for character in value):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(character.islower() for character in value):
            raise ValueError("Password must contain at least one lowercase letter")
        if not any(character.isdigit() for character in value):
            raise ValueError("Password must contain at least one digit")
        return value

    @model_validator(mode="after")
    def passwords_match(self):
        if self.confirm_password != self.password:
            raise ValueError("Passwords do not match")
        return self


class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=72)


class UserUpdate(BaseModel):
    name: Optional[str] = None
    picture: Optional[str] = None
    last_login: Optional[datetime] = None


class UserResponse(UserBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    google_sub: Optional[str] = None
    is_active: bool
    is_verified: bool
    created_at: datetime
    last_login: datetime

class PasswordChange(BaseModel):
    current_password: str = Field(min_length=1, max_length=72)
    new_password: str = Field(min_length=8, max_length=72)
    confirm_password: str = Field(min_length=8, max_length=72)

    @field_validator("new_password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        return UserCreate.validate_password(value)

    @model_validator(mode="after")
    def passwords_match(self):
        if self.confirm_password != self.new_password:
            raise ValueError("Passwords do not match")
        return self


class UserProfile(BaseModel):
    """User profile for frontend display"""
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    name: Optional[str] = None
    picture: Optional[str] = None
    
# Session models
class SessionData(BaseModel):
    """Session data structure"""
    user_id: int
    email: str
    name: Optional[str] = None
    picture: Optional[str] = None
    created_at: datetime
    expires_at: datetime
