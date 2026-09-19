from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from typing import List, Optional
import json

from app.db import get_db
from app.models.project import Project, ProjectCreate, ProjectResponse, ProjectUpdate, ProjectStatus

router = APIRouter()

@router.get("/projects", response_model=List[ProjectResponse])
async def get_projects(
    status: Optional[ProjectStatus] = Query(None, description="Filter by project status"),
    area: Optional[str] = Query(None, description="Filter by research area"),
    query: Optional[str] = Query(None, description="Search in title and description"),
    featured: Optional[bool] = Query(None, description="Filter featured projects"),
    limit: int = Query(50, le=100, description="Maximum number of results"),
    offset: int = Query(0, ge=0, description="Number of results to skip"),
    db: Session = Depends(get_db)
):
    """Get projects with optional filtering and search"""
    
    query_filter = db.query(Project)
    
    # Status filter
    if status:
        query_filter = query_filter.filter(Project.status == status)
    
    # Research area filter
    if area:
        query_filter = query_filter.filter(Project.research_areas.ilike(f"%{area}%"))
    
    # Text search
    if query:
        search_filter = or_(
            Project.title.ilike(f"%{query}%"),
            Project.description.ilike(f"%{query}%"),
            Project.short_description.ilike(f"%{query}%")
        )
        query_filter = query_filter.filter(search_filter)
    
    # Featured filter
    if featured is not None:
        query_filter = query_filter.filter(Project.is_featured == featured)
    
    # Order by featured first, then by start date descending
    query_filter = query_filter.order_by(
        Project.is_featured.desc(),
        Project.start_date.desc().nullslast(),
        Project.title
    )
    
    # Apply pagination
    projects = query_filter.offset(offset).limit(limit).all()
    
    # Convert JSON strings back to lists for response
    result = []
    for proj in projects:
        proj_dict = {
            "id": proj.id,
            "title": proj.title,
            "description": proj.description,
            "short_description": proj.short_description,
            "status": proj.status,
            "start_date": proj.start_date,
            "end_date": proj.end_date,
            "funding_agency": proj.funding_agency,
            "funding_amount": proj.funding_amount,
            "principal_investigator": proj.principal_investigator,
            "team_members": json.loads(proj.team_members) if proj.team_members else [],
            "research_areas": json.loads(proj.research_areas) if proj.research_areas else [],
            "keywords": json.loads(proj.keywords) if proj.keywords else [],
            "datasets_url": proj.datasets_url,
            "repository_url": proj.repository_url,
            "results_url": proj.results_url,
            "image_url": proj.image_url,
            "is_featured": proj.is_featured,
            "created_at": proj.created_at,
            "updated_at": proj.updated_at
        }
        result.append(ProjectResponse(**proj_dict))
    
    return result

@router.get("/projects/{project_id:int}", response_model=ProjectResponse)
async def get_project(project_id: int, db: Session = Depends(get_db)):
    """Get a specific project by ID"""
    
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Convert JSON strings back to lists
    proj_dict = {
        "id": project.id,
        "title": project.title,
        "description": project.description,
        "short_description": project.short_description,
        "status": project.status,
        "start_date": project.start_date,
        "end_date": project.end_date,
        "funding_agency": project.funding_agency,
        "funding_amount": project.funding_amount,
        "principal_investigator": project.principal_investigator,
        "team_members": json.loads(project.team_members) if project.team_members else [],
        "research_areas": json.loads(project.research_areas) if project.research_areas else [],
        "keywords": json.loads(project.keywords) if project.keywords else [],
        "datasets_url": project.datasets_url,
        "repository_url": project.repository_url,
        "results_url": project.results_url,
        "image_url": project.image_url,
        "is_featured": project.is_featured,
        "created_at": project.created_at,
        "updated_at": project.updated_at
    }
    
    return ProjectResponse(**proj_dict)

@router.get("/projects/stats")
async def get_projects_stats(db: Session = Depends(get_db)):
    """Get project statistics"""
    
    total = db.query(Project).count()
    by_status = db.query(Project.status, func.count(Project.id)).group_by(Project.status).all()
    featured = db.query(Project).filter(Project.is_featured == True).count()
    
    return {
        "total": total,
        "featured": featured,
        "by_status": [{"status": status.value, "count": count} for status, count in by_status],
        "ongoing": db.query(Project).filter(Project.status == ProjectStatus.ONGOING).count(),
        "completed": db.query(Project).filter(Project.status == ProjectStatus.COMPLETED).count()
    }
