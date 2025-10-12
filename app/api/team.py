from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, asc
from typing import List, Optional
import json

from app.db import get_db
from app.models.member import Member, MemberCreate, MemberResponse, MemberUpdate, MemberRole

router = APIRouter()

@router.get("/team", response_model=List[MemberResponse])
async def get_team_members(
    role: Optional[MemberRole] = Query(None, description="Filter by member role"),
    active: Optional[bool] = Query(True, description="Filter active members"),
    query: Optional[str] = Query(None, description="Search in name and bio"),
    db: Session = Depends(get_db)
):
    """Get team members with optional filtering"""
    
    query_filter = db.query(Member)
    
    # Active filter (default to active only)
    if active is not None:
        query_filter = query_filter.filter(Member.is_active == active)
    
    # Role filter
    if role:
        query_filter = query_filter.filter(Member.role == role)
    
    # Text search
    if query:
        search_filter = or_(
            Member.name.ilike(f"%{query}%"),
            Member.bio.ilike(f"%{query}%"),
            Member.position.ilike(f"%{query}%")
        )
        query_filter = query_filter.filter(search_filter)
    
    # Order by display_order, then by role hierarchy, then by name
    role_order = {
        MemberRole.PRINCIPAL_INVESTIGATOR: 1,
        MemberRole.RESEARCHER: 2,
        MemberRole.POSTDOC: 3,
        MemberRole.PHD_STUDENT: 4,
        MemberRole.MASTERS_STUDENT: 5,
        MemberRole.UNDERGRADUATE: 6,
        MemberRole.COLLABORATOR: 7,
        MemberRole.ALUMNI: 8
    }
    
    members = query_filter.all()
    
    # Sort by custom role order
    members.sort(key=lambda m: (m.display_order, role_order.get(m.role, 9), m.name))
    
    # Convert JSON strings back to lists for response
    result = []
    for member in members:
        member_dict = {
            "id": member.id,
            "name": member.name,
            "email": member.email,
            "role": member.role,
            "position": member.position,
            "bio": member.bio,
            "short_bio": member.short_bio,
            "photo_url": member.photo_url,
            "orcid": member.orcid,
            "google_scholar": member.google_scholar,
            "github": member.github,
            "lattes": member.lattes,
            "linkedin": member.linkedin,
            "personal_website": member.personal_website,
            "research_interests": json.loads(member.research_interests) if member.research_interests else [],
            "education": json.loads(member.education) if member.education else [],
            "start_date": member.start_date,
            "end_date": member.end_date,
            "is_active": member.is_active,
            "display_order": member.display_order,
            "created_at": member.created_at,
            "updated_at": member.updated_at
        }
        result.append(MemberResponse(**member_dict))
    
    return result

@router.get("/team/{member_id}", response_model=MemberResponse)
async def get_team_member(member_id: int, db: Session = Depends(get_db)):
    """Get a specific team member by ID"""
    
    member = db.query(Member).filter(Member.id == member_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Team member not found")
    
    # Convert JSON strings back to lists
    member_dict = {
        "id": member.id,
        "name": member.name,
        "email": member.email,
        "role": member.role,
        "position": member.position,
        "bio": member.bio,
        "short_bio": member.short_bio,
        "photo_url": member.photo_url,
        "orcid": member.orcid,
        "google_scholar": member.google_scholar,
        "github": member.github,
        "lattes": member.lattes,
        "linkedin": member.linkedin,
        "personal_website": member.personal_website,
        "research_interests": json.loads(member.research_interests) if member.research_interests else [],
        "education": json.loads(member.education) if member.education else [],
        "start_date": member.start_date,
        "end_date": member.end_date,
        "is_active": member.is_active,
        "display_order": member.display_order,
        "created_at": member.created_at,
        "updated_at": member.updated_at
    }
    
    return MemberResponse(**member_dict)

@router.get("/team/by-role/{role}", response_model=List[MemberResponse])
async def get_team_by_role(role: MemberRole, db: Session = Depends(get_db)):
    """Get team members by specific role"""
    
    members = db.query(Member).filter(
        Member.role == role,
        Member.is_active == True
    ).order_by(Member.display_order, Member.name).all()
    
    # Convert to response format
    result = []
    for member in members:
        member_dict = {
            "id": member.id,
            "name": member.name,
            "email": member.email,
            "role": member.role,
            "position": member.position,
            "bio": member.bio,
            "short_bio": member.short_bio,
            "photo_url": member.photo_url,
            "orcid": member.orcid,
            "google_scholar": member.google_scholar,
            "github": member.github,
            "lattes": member.lattes,
            "linkedin": member.linkedin,
            "personal_website": member.personal_website,
            "research_interests": json.loads(member.research_interests) if member.research_interests else [],
            "education": json.loads(member.education) if member.education else [],
            "start_date": member.start_date,
            "end_date": member.end_date,
            "is_active": member.is_active,
            "display_order": member.display_order,
            "created_at": member.created_at,
            "updated_at": member.updated_at
        }
        result.append(MemberResponse(**member_dict))
    
    return result

@router.get("/team/stats")
async def get_team_stats(db: Session = Depends(get_db)):
    """Get team statistics"""
    
    total_active = db.query(Member).filter(Member.is_active == True).count()
    total_alumni = db.query(Member).filter(Member.is_active == False).count()
    
    by_role = db.query(Member.role, db.func.count(Member.id)).filter(
        Member.is_active == True
    ).group_by(Member.role).all()
    
    return {
        "total_active": total_active,
        "total_alumni": total_alumni,
        "by_role": [{"role": role.value, "count": count} for role, count in by_role]
    }
