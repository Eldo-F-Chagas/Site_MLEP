from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean
from sqlalchemy.sql import func
from app.db import Base
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class Publication(Base):
    __tablename__ = "publications"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(500), nullable=False, index=True)
    authors = Column(Text, nullable=False)  # JSON string of authors
    abstract = Column(Text)
    journal = Column(String(200))
    year = Column(Integer, index=True)
    volume = Column(String(50))
    pages = Column(String(50))
    doi = Column(String(200), unique=True)
    pdf_url = Column(String(500))
    tags = Column(Text)  # JSON string of tags
    research_area = Column(String(100), index=True)
    is_featured = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

# Pydantic models for API
class PublicationBase(BaseModel):
    title: str
    authors: List[str]
    abstract: Optional[str] = None
    journal: Optional[str] = None
    year: int
    volume: Optional[str] = None
    pages: Optional[str] = None
    doi: Optional[str] = None
    pdf_url: Optional[str] = None
    tags: Optional[List[str]] = []
    research_area: Optional[str] = None
    is_featured: bool = False

class PublicationCreate(PublicationBase):
    pass

class PublicationUpdate(BaseModel):
    title: Optional[str] = None
    authors: Optional[List[str]] = None
    abstract: Optional[str] = None
    journal: Optional[str] = None
    year: Optional[int] = None
    volume: Optional[str] = None
    pages: Optional[str] = None
    doi: Optional[str] = None
    pdf_url: Optional[str] = None
    tags: Optional[List[str]] = None
    research_area: Optional[str] = None
    is_featured: Optional[bool] = None

class PublicationResponse(PublicationBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
