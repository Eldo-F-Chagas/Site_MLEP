from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, Enum
from sqlalchemy.sql import func
from app.db import Base
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import enum

class NewsType(str, enum.Enum):
    NEWS = "news"
    EVENT = "event"
    ANNOUNCEMENT = "announcement"
    ACHIEVEMENT = "achievement"

class News(Base):
    __tablename__ = "news"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(300), nullable=False, index=True)
    content = Column(Text, nullable=False)
    summary = Column(String(500))
    type = Column(Enum(NewsType), default=NewsType.NEWS, index=True)
    author = Column(String(200))
    publish_date = Column(DateTime, default=func.now(), index=True)
    event_date = Column(DateTime)  # For events
    event_location = Column(String(300))  # For events
    tags = Column(Text)  # JSON string of tags
    image_url = Column(String(500))
    external_url = Column(String(500))
    is_featured = Column(Boolean, default=False)
    is_published = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

# Pydantic models for API
class NewsBase(BaseModel):
    title: str
    content: str
    summary: Optional[str] = None
    type: NewsType = NewsType.NEWS
    author: Optional[str] = None
    publish_date: Optional[datetime] = None
    event_date: Optional[datetime] = None
    event_location: Optional[str] = None
    tags: Optional[List[str]] = []
    image_url: Optional[str] = None
    external_url: Optional[str] = None
    is_featured: bool = False
    is_published: bool = True

class NewsCreate(NewsBase):
    pass

class NewsUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    summary: Optional[str] = None
    type: Optional[NewsType] = None
    author: Optional[str] = None
    publish_date: Optional[datetime] = None
    event_date: Optional[datetime] = None
    event_location: Optional[str] = None
    tags: Optional[List[str]] = None
    image_url: Optional[str] = None
    external_url: Optional[str] = None
    is_featured: Optional[bool] = None
    is_published: Optional[bool] = None

class NewsResponse(NewsBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
