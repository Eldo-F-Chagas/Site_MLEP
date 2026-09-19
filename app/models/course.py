"""
Course models for the MLEP Data Lab LMS system
"""

from datetime import datetime
from typing import Optional, List, Literal
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from pydantic import BaseModel, ConfigDict, Field
from app.db import Base


# SQLAlchemy Models
class Course(Base):
    __tablename__ = "courses"
    
    id = Column(Integer, primary_key=True, index=True)
    slug = Column(String(100), unique=True, index=True, nullable=False)
    title = Column(String(200), nullable=False)
    summary = Column(Text, nullable=False)
    description = Column(Text)
    level = Column(String(20), nullable=False)  # iniciante, intermediario, avancado
    hours = Column(Integer, nullable=False)
    tags = Column(Text)  # JSON string
    cover_url = Column(String(500))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    modules = relationship("Module", back_populates="course", cascade="all, delete-orphan")
    materials = relationship("Material", back_populates="course", cascade="all, delete-orphan")
    forum_topics = relationship("ForumTopic", back_populates="course", cascade="all, delete-orphan")


class Module(Base):
    __tablename__ = "modules"
    
    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text)
    order = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    course = relationship("Course", back_populates="modules")
    lessons = relationship("Lesson", back_populates="module", cascade="all, delete-orphan")


class Lesson(Base):
    __tablename__ = "lessons"
    
    id = Column(Integer, primary_key=True, index=True)
    module_id = Column(Integer, ForeignKey("modules.id"), nullable=False)
    slug = Column(String(100), nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text)
    objectives = Column(Text)
    prerequisites = Column(Text)
    order = Column(Integer, nullable=False)
    video_url = Column(String(500))
    video_duration = Column(Integer)  # seconds
    is_free = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    module = relationship("Module", back_populates="lessons")
    materials = relationship("Material", back_populates="lesson", cascade="all, delete-orphan")
    forum_topics = relationship("ForumTopic", back_populates="lesson", cascade="all, delete-orphan")


class Material(Base):
    __tablename__ = "materials"
    
    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    lesson_id = Column(Integer, ForeignKey("lessons.id"), nullable=True)  # None for course-wide materials
    filename = Column(String(255), nullable=False)
    original_filename = Column(String(255), nullable=False)
    file_url = Column(String(500), nullable=False)
    file_size_bytes = Column(Integer, nullable=False)
    file_type = Column(String(50), nullable=False)  # pdf, ipynb, csv, zip, etc.
    description = Column(Text)
    download_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    course = relationship("Course", back_populates="materials")
    lesson = relationship("Lesson", back_populates="materials")


class ForumTopic(Base):
    __tablename__ = "forum_topics"
    
    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    lesson_id = Column(Integer, ForeignKey("lessons.id"), nullable=True)  # None for general course topics
    title = Column(String(200), nullable=False)
    author = Column(String(100), nullable=False)
    is_pinned = Column(Boolean, default=False)
    is_locked = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    course = relationship("Course", back_populates="forum_topics")
    lesson = relationship("Lesson", back_populates="forum_topics")
    posts = relationship("ForumPost", back_populates="topic", cascade="all, delete-orphan")


class ForumPost(Base):
    __tablename__ = "forum_posts"
    
    id = Column(Integer, primary_key=True, index=True)
    topic_id = Column(Integer, ForeignKey("forum_topics.id"), nullable=False)
    author = Column(String(100), nullable=False)
    body_md = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    topic = relationship("ForumTopic", back_populates="posts")


# Pydantic Schemas
class CourseBase(BaseModel):
    slug: str = Field(..., max_length=100)
    title: str = Field(..., max_length=200)
    summary: str
    description: Optional[str] = None
    level: Literal["iniciante", "intermediario", "avancado"]
    hours: int = Field(..., gt=0)
    tags: List[str] = Field(default_factory=list)
    cover_url: Optional[str] = None


class CourseCreate(CourseBase):
    pass


class CourseUpdate(BaseModel):
    title: Optional[str] = None
    summary: Optional[str] = None
    description: Optional[str] = None
    level: Optional[Literal["iniciante", "intermediario", "avancado"]] = None
    hours: Optional[int] = None
    tags: Optional[List[str]] = None
    cover_url: Optional[str] = None
    is_active: Optional[bool] = None


class CourseResponse(CourseBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class ModuleBase(BaseModel):
    title: str = Field(..., max_length=200)
    description: Optional[str] = None
    order: int


class ModuleCreate(ModuleBase):
    course_id: int


class ModuleResponse(ModuleBase):
    id: int
    course_id: int
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class LessonBase(BaseModel):
    slug: str = Field(..., max_length=100)
    title: str = Field(..., max_length=200)
    description: Optional[str] = None
    objectives: Optional[str] = None
    prerequisites: Optional[str] = None
    order: int
    video_url: Optional[str] = None
    video_duration: Optional[int] = None
    is_free: bool = False


class LessonCreate(LessonBase):
    module_id: int


class LessonResponse(LessonBase):
    id: int
    module_id: int
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class MaterialBase(BaseModel):
    filename: str = Field(..., max_length=255)
    original_filename: str = Field(..., max_length=255)
    file_url: str = Field(..., max_length=500)
    file_size_bytes: int = Field(..., gt=0)
    file_type: str = Field(..., max_length=50)
    description: Optional[str] = None


class MaterialCreate(MaterialBase):
    course_id: int
    lesson_id: Optional[int] = None


class MaterialResponse(MaterialBase):
    id: int
    course_id: int
    lesson_id: Optional[int]
    download_count: int
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class ForumTopicBase(BaseModel):
    title: str = Field(..., max_length=200)
    author: str = Field(..., max_length=100)


class ForumTopicCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=200)
    lesson_id: Optional[int] = None


class ForumTopicResponse(ForumTopicBase):
    id: int
    course_id: int
    lesson_id: Optional[int]
    is_pinned: bool
    is_locked: bool
    created_at: datetime
    updated_at: datetime
    post_count: int = 0
    
    model_config = ConfigDict(from_attributes=True)


class ForumPostBase(BaseModel):
    author: str = Field(..., max_length=100)
    body_md: str


class ForumPostCreate(BaseModel):
    body_md: str = Field(..., min_length=1, max_length=10_000)


class ForumPostResponse(ForumPostBase):
    id: int
    topic_id: int
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


# Complex response schemas with relationships
class LessonWithMaterials(LessonResponse):
    materials: List[MaterialResponse] = Field(default_factory=list)


class ModuleWithLessons(ModuleResponse):
    lessons: List[LessonResponse] = Field(default_factory=list)


class CourseWithModules(CourseResponse):
    modules: List[ModuleWithLessons] = Field(default_factory=list)
    material_count: int = 0
    lesson_count: int = 0


class ForumTopicWithPosts(ForumTopicResponse):
    posts: List[ForumPostResponse] = Field(default_factory=list)
