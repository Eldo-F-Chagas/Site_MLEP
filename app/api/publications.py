from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from typing import List, Optional
import json

from app.db import get_db
from app.models.publication import Publication, PublicationCreate, PublicationResponse, PublicationUpdate

router = APIRouter()

@router.get("/publications", response_model=List[PublicationResponse])
async def get_publications(
    query: Optional[str] = Query(None, description="Search in title, authors, abstract"),
    year: Optional[int] = Query(None, description="Filter by publication year"),
    tag: Optional[str] = Query(None, description="Filter by tag"),
    research_area: Optional[str] = Query(None, description="Filter by research area"),
    featured: Optional[bool] = Query(None, description="Filter featured publications"),
    limit: int = Query(50, le=100, description="Maximum number of results"),
    offset: int = Query(0, ge=0, description="Number of results to skip"),
    db: Session = Depends(get_db)
):
    """Get publications with optional filtering and search"""
    
    query_filter = db.query(Publication)
    
    # Text search
    if query:
        search_filter = or_(
            Publication.title.ilike(f"%{query}%"),
            Publication.authors.ilike(f"%{query}%"),
            Publication.abstract.ilike(f"%{query}%")
        )
        query_filter = query_filter.filter(search_filter)
    
    # Year filter
    if year:
        query_filter = query_filter.filter(Publication.year == year)
    
    # Tag filter
    if tag:
        query_filter = query_filter.filter(Publication.tags.ilike(f"%{tag}%"))
    
    # Research area filter
    if research_area:
        query_filter = query_filter.filter(Publication.research_area.ilike(f"%{research_area}%"))
    
    # Featured filter
    if featured is not None:
        query_filter = query_filter.filter(Publication.is_featured == featured)
    
    # Order by year descending, then by title
    query_filter = query_filter.order_by(Publication.year.desc(), Publication.title)
    
    # Apply pagination
    publications = query_filter.offset(offset).limit(limit).all()
    
    # Convert JSON strings back to lists for response
    result = []
    for pub in publications:
        pub_dict = {
            "id": pub.id,
            "title": pub.title,
            "authors": json.loads(pub.authors) if pub.authors else [],
            "abstract": pub.abstract,
            "journal": pub.journal,
            "year": pub.year,
            "volume": pub.volume,
            "pages": pub.pages,
            "doi": pub.doi,
            "pdf_url": pub.pdf_url,
            "tags": json.loads(pub.tags) if pub.tags else [],
            "research_area": pub.research_area,
            "is_featured": pub.is_featured,
            "created_at": pub.created_at,
            "updated_at": pub.updated_at
        }
        result.append(PublicationResponse(**pub_dict))
    
    return result

@router.get("/publications/{publication_id:int}", response_model=PublicationResponse)
async def get_publication(publication_id: int, db: Session = Depends(get_db)):
    """Get a specific publication by ID"""
    
    publication = db.query(Publication).filter(Publication.id == publication_id).first()
    if not publication:
        raise HTTPException(status_code=404, detail="Publication not found")
    
    # Convert JSON strings back to lists
    pub_dict = {
        "id": publication.id,
        "title": publication.title,
        "authors": json.loads(publication.authors) if publication.authors else [],
        "abstract": publication.abstract,
        "journal": publication.journal,
        "year": publication.year,
        "volume": publication.volume,
        "pages": publication.pages,
        "doi": publication.doi,
        "pdf_url": publication.pdf_url,
        "tags": json.loads(publication.tags) if publication.tags else [],
        "research_area": publication.research_area,
        "is_featured": publication.is_featured,
        "created_at": publication.created_at,
        "updated_at": publication.updated_at
    }
    
    return PublicationResponse(**pub_dict)

@router.get("/publications/stats")
async def get_publications_stats(db: Session = Depends(get_db)):
    """Get publication statistics"""
    
    total = db.query(Publication).count()
    by_year = db.query(Publication.year, func.count(Publication.id)).group_by(Publication.year).all()
    featured = db.query(Publication).filter(Publication.is_featured == True).count()
    
    return {
        "total": total,
        "featured": featured,
        "by_year": [{"year": year, "count": count} for year, count in by_year if year],
        "latest_year": max([year for year, _ in by_year if year]) if by_year else None
    }
