from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, Enum
from sqlalchemy.sql import func
from app.db import Base
from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List
from datetime import datetime
import enum

class ProjectStatus(str, enum.Enum):
    ONGOING = "ongoing"
    COMPLETED = "completed"
    PLANNED = "planned"
    PAUSED = "paused"

class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(300), nullable=False, index=True)
    description = Column(Text, nullable=False)
    short_description = Column(String(500))
    status = Column(Enum(ProjectStatus), default=ProjectStatus.ONGOING, index=True)
    start_date = Column(DateTime)
    end_date = Column(DateTime)
    funding_agency = Column(String(200))
    funding_amount = Column(String(100))
    principal_investigator = Column(String(200))
    team_members = Column(Text)  # JSON string of team member IDs
    research_areas = Column(Text)  # JSON string of research areas
    keywords = Column(Text)  # JSON string of keywords
    datasets_url = Column(String(500))
    repository_url = Column(String(500))
    results_url = Column(String(500))
    image_url = Column(String(500))
    is_featured = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

# Pydantic models for API
class ProjectBase(BaseModel):
    title: str
    description: str
    short_description: Optional[str] = None
    status: ProjectStatus = ProjectStatus.ONGOING
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    funding_agency: Optional[str] = None
    funding_amount: Optional[str] = None
    principal_investigator: Optional[str] = None
    team_members: List[str] = Field(default_factory=list)
    research_areas: List[str] = Field(default_factory=list)
    keywords: List[str] = Field(default_factory=list)
    datasets_url: Optional[str] = None
    repository_url: Optional[str] = None
    results_url: Optional[str] = None
    image_url: Optional[str] = None
    is_featured: bool = False

class ProjectCreate(ProjectBase):
    pass

class ProjectUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    short_description: Optional[str] = None
    status: Optional[ProjectStatus] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    funding_agency: Optional[str] = None
    funding_amount: Optional[str] = None
    principal_investigator: Optional[str] = None
    team_members: Optional[List[str]] = None
    research_areas: Optional[List[str]] = None
    keywords: Optional[List[str]] = None
    datasets_url: Optional[str] = None
    repository_url: Optional[str] = None
    results_url: Optional[str] = None
    image_url: Optional[str] = None
    is_featured: Optional[bool] = None

class ProjectResponse(ProjectBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
