from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, Enum
from sqlalchemy.sql import func
from app.db import Base
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
import enum

class MemberRole(str, enum.Enum):
    PRINCIPAL_INVESTIGATOR = "principal_investigator"
    RESEARCHER = "researcher"
    POSTDOC = "postdoc"
    PHD_STUDENT = "phd_student"
    MASTERS_STUDENT = "masters_student"
    UNDERGRADUATE = "undergraduate"
    COLLABORATOR = "collaborator"
    ALUMNI = "alumni"

class Member(Base):
    __tablename__ = "members"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False, index=True)
    email = Column(String(200), unique=True, index=True)
    role = Column(Enum(MemberRole), nullable=False, index=True)
    position = Column(String(200))
    bio = Column(Text)
    short_bio = Column(String(500))
    photo_url = Column(String(500))
    orcid = Column(String(100))
    google_scholar = Column(String(200))
    github = Column(String(200))
    lattes = Column(String(200))
    linkedin = Column(String(200))
    personal_website = Column(String(200))
    research_interests = Column(Text)  # JSON string of research interests
    education = Column(Text)  # JSON string of education background
    start_date = Column(DateTime)
    end_date = Column(DateTime)  # For alumni
    is_active = Column(Boolean, default=True)
    display_order = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

# Pydantic models for API
class MemberBase(BaseModel):
    name: str
    email: Optional[EmailStr] = None
    role: MemberRole
    position: Optional[str] = None
    bio: Optional[str] = None
    short_bio: Optional[str] = None
    photo_url: Optional[str] = None
    orcid: Optional[str] = None
    google_scholar: Optional[str] = None
    github: Optional[str] = None
    lattes: Optional[str] = None
    linkedin: Optional[str] = None
    personal_website: Optional[str] = None
    research_interests: Optional[List[str]] = []
    education: Optional[List[str]] = []
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    is_active: bool = True
    display_order: int = 0

class MemberCreate(MemberBase):
    pass

class MemberUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[MemberRole] = None
    position: Optional[str] = None
    bio: Optional[str] = None
    short_bio: Optional[str] = None
    photo_url: Optional[str] = None
    orcid: Optional[str] = None
    google_scholar: Optional[str] = None
    github: Optional[str] = None
    lattes: Optional[str] = None
    linkedin: Optional[str] = None
    personal_website: Optional[str] = None
    research_interests: Optional[List[str]] = None
    education: Optional[List[str]] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    is_active: Optional[bool] = None
    display_order: Optional[int] = None

class MemberResponse(MemberBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
