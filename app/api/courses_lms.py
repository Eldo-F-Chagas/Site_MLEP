"""
API endpoints for the MLEP Data Lab LMS system
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, and_
import json

from app.db import get_db
from app.auth_local import require_auth
from app.models.user import User
from app.models.course import (
    Course, Module, Lesson, Material, ForumTopic, ForumPost,
    CourseResponse, CourseWithModules, ModuleWithLessons, LessonWithMaterials,
    MaterialResponse, ForumTopicResponse, ForumTopicWithPosts, ForumPostResponse,
    ForumTopicCreate, ForumPostCreate
)

router = APIRouter(prefix="/api/courses", tags=["courses"])


# Course endpoints
@router.get("/", response_model=List[CourseResponse])
async def get_courses(
    level: Optional[str] = Query(None, description="Filter by level"),
    tag: Optional[str] = Query(None, description="Filter by tag"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_auth)
):
    """Get all active courses with optional filters"""
    query = db.query(Course).filter(Course.is_active == True)
    
    if level:
        query = query.filter(Course.level == level)
    
    if tag:
        query = query.filter(Course.tags.contains(f'"{tag}"'))
    
    courses = query.order_by(Course.created_at.desc()).all()
    
    # Parse tags from JSON string
    for course in courses:
        if course.tags:
            try:
                course.tags = json.loads(course.tags)
            except:
                course.tags = []
        else:
            course.tags = []
    
    return courses


@router.get("/{slug}", response_model=CourseWithModules)
async def get_course(slug: str, db: Session = Depends(get_db), current_user: User = Depends(require_auth)):
    """Get course details with modules and lessons"""
    course = db.query(Course).filter(
        and_(Course.slug == slug, Course.is_active == True)
    ).options(
        joinedload(Course.modules).joinedload(Module.lessons)
    ).first()
    
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    # Parse tags
    if course.tags:
        try:
            course.tags = json.loads(course.tags)
        except:
            course.tags = []
    else:
        course.tags = []
    
    # Count materials and lessons
    material_count = db.query(func.count(Material.id)).filter(Material.course_id == course.id).scalar()
    lesson_count = db.query(func.count(Lesson.id)).join(Module).filter(Module.course_id == course.id).scalar()
    
    # Convert to response model
    course_dict = {
        **course.__dict__,
        'material_count': material_count,
        'lesson_count': lesson_count,
        'modules': []
    }
    
    for module in sorted(course.modules, key=lambda x: x.order):
        module_dict = {
            **module.__dict__,
            'lessons': sorted(module.lessons, key=lambda x: x.order)
        }
        course_dict['modules'].append(module_dict)
    
    return course_dict


# Lesson endpoints
@router.get("/{slug}/lessons/{lesson_slug}", response_model=LessonWithMaterials)
async def get_lesson(slug: str, lesson_slug: str, db: Session = Depends(get_db), current_user: User = Depends(require_auth)):
    """Get lesson details with materials"""
    lesson = db.query(Lesson).join(Module).join(Course).filter(
        and_(
            Course.slug == slug,
            Lesson.slug == lesson_slug,
            Course.is_active == True
        )
    ).options(joinedload(Lesson.materials)).first()
    
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    
    return lesson


# Materials endpoints
@router.get("/{slug}/materials", response_model=List[MaterialResponse])
async def get_course_materials(slug: str, db: Session = Depends(get_db), current_user: User = Depends(require_auth)):
    """Get all materials for a course"""
    course = db.query(Course).filter(
        and_(Course.slug == slug, Course.is_active == True)
    ).first()
    
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    materials = db.query(Material).filter(Material.course_id == course.id).all()
    return materials


@router.get("/{slug}/lessons/{lesson_slug}/materials", response_model=List[MaterialResponse])
async def get_lesson_materials(
    slug: str,
    lesson_slug: str,
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_auth),
):
    """Get materials for a specific lesson"""
    lesson = db.query(Lesson).join(Module).join(Course).filter(
        and_(
            Course.slug == slug,
            Lesson.slug == lesson_slug,
            Course.is_active == True
        )
    ).first()
    
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    
    materials = db.query(Material).filter(Material.lesson_id == lesson.id).all()
    return materials


@router.post("/{slug}/materials/{material_id}/download")
async def download_material(
    slug: str,
    material_id: int,
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_auth),
):
    """Increment download count for a material"""
    material = db.query(Material).join(Course).filter(
        and_(
            Course.slug == slug,
            Material.id == material_id,
            Course.is_active == True
        )
    ).first()
    
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")
    
    material.download_count += 1
    db.commit()
    
    return {"message": "Download count updated", "download_count": material.download_count}


# Forum endpoints
@router.get("/{slug}/forum", response_model=List[ForumTopicResponse])
async def get_forum_topics(
    slug: str,
    lesson_id: Optional[int] = Query(None, description="Filter by lesson"),
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_auth),
):
    """Get forum topics for a course or lesson"""
    course = db.query(Course).filter(
        and_(Course.slug == slug, Course.is_active == True)
    ).first()
    
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    query = db.query(ForumTopic).filter(ForumTopic.course_id == course.id)
    
    if lesson_id is not None:
        query = query.filter(ForumTopic.lesson_id == lesson_id)
    else:
        query = query.filter(ForumTopic.lesson_id.is_(None))
    
    topics = query.order_by(
        ForumTopic.is_pinned.desc(),
        ForumTopic.updated_at.desc()
    ).all()
    
    # Add post count to each topic
    for topic in topics:
        topic.post_count = db.query(func.count(ForumPost.id)).filter(
            ForumPost.topic_id == topic.id
        ).scalar()
    
    return topics


@router.post("/{slug}/forum/topics", response_model=ForumTopicResponse)
async def create_forum_topic(
    slug: str,
    topic_data: ForumTopicCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_auth),
):
    """Create a new forum topic"""
    course = db.query(Course).filter(
        and_(Course.slug == slug, Course.is_active == True)
    ).first()
    
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    # Validate lesson if provided
    if topic_data.lesson_id:
        lesson = db.query(Lesson).join(Module).filter(
            and_(
                Module.course_id == course.id,
                Lesson.id == topic_data.lesson_id
            )
        ).first()
        if not lesson:
            raise HTTPException(status_code=404, detail="Lesson not found")
    
    topic = ForumTopic(
        course_id=course.id,
        lesson_id=topic_data.lesson_id,
        title=topic_data.title,
        author=current_user.name or current_user.email
    )
    
    db.add(topic)
    db.commit()
    db.refresh(topic)
    
    topic.post_count = 0
    return topic


@router.get("/{slug}/forum/topics/{topic_id}", response_model=ForumTopicWithPosts)
async def get_forum_topic(
    slug: str,
    topic_id: int,
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_auth),
):
    """Get forum topic with all posts"""
    topic = db.query(ForumTopic).join(Course).filter(
        and_(
            Course.slug == slug,
            ForumTopic.id == topic_id,
            Course.is_active == True
        )
    ).options(joinedload(ForumTopic.posts)).first()
    
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    
    # Sort posts by creation date
    topic.posts = sorted(topic.posts, key=lambda x: x.created_at)
    topic.post_count = len(topic.posts)
    
    return topic


@router.post("/{slug}/forum/topics/{topic_id}/posts", response_model=ForumPostResponse)
async def create_forum_post(
    slug: str,
    topic_id: int,
    post_data: ForumPostCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_auth),
):
    """Create a new forum post"""
    topic = db.query(ForumTopic).join(Course).filter(
        and_(
            Course.slug == slug,
            ForumTopic.id == topic_id,
            Course.is_active == True
        )
    ).first()
    
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    
    if topic.is_locked:
        raise HTTPException(status_code=403, detail="Topic is locked")
    
    post = ForumPost(
        topic_id=topic.id,
        author=current_user.name or current_user.email,
        body_md=post_data.body_md
    )
    
    db.add(post)
    
    # Update topic's updated_at timestamp
    topic.updated_at = func.now()
    
    db.commit()
    db.refresh(post)
    
    return post


# Statistics endpoints
@router.get("/{slug}/stats")
async def get_course_stats(
    slug: str,
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_auth),
):
    """Get course statistics"""
    course = db.query(Course).filter(
        and_(Course.slug == slug, Course.is_active == True)
    ).first()
    
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    stats = {
        "lesson_count": db.query(func.count(Lesson.id)).join(Module).filter(
            Module.course_id == course.id
        ).scalar(),
        "material_count": db.query(func.count(Material.id)).filter(
            Material.course_id == course.id
        ).scalar(),
        "forum_topic_count": db.query(func.count(ForumTopic.id)).filter(
            ForumTopic.course_id == course.id
        ).scalar(),
        "total_downloads": db.query(func.sum(Material.download_count)).filter(
            Material.course_id == course.id
        ).scalar() or 0
    }
    
    return stats
