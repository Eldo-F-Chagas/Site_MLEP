from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc
from typing import List, Optional
import json

from app.db import get_db
from app.models.news import News, NewsCreate, NewsResponse, NewsUpdate, NewsType

router = APIRouter()

@router.get("/news", response_model=List[NewsResponse])
async def get_news(
    type: Optional[NewsType] = Query(None, description="Filter by news type"),
    tag: Optional[str] = Query(None, description="Filter by tag"),
    query: Optional[str] = Query(None, description="Search in title and content"),
    featured: Optional[bool] = Query(None, description="Filter featured news"),
    published: Optional[bool] = Query(True, description="Filter published news"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, le=50, description="Items per page"),
    db: Session = Depends(get_db)
):
    """Get news with optional filtering and search"""
    
    query_filter = db.query(News)
    
    # Published filter (default to published only)
    if published is not None:
        query_filter = query_filter.filter(News.is_published == published)
    
    # Type filter
    if type:
        query_filter = query_filter.filter(News.type == type)
    
    # Tag filter
    if tag:
        query_filter = query_filter.filter(News.tags.ilike(f"%{tag}%"))
    
    # Text search
    if query:
        search_filter = or_(
            News.title.ilike(f"%{query}%"),
            News.content.ilike(f"%{query}%"),
            News.summary.ilike(f"%{query}%")
        )
        query_filter = query_filter.filter(search_filter)
    
    # Featured filter
    if featured is not None:
        query_filter = query_filter.filter(News.is_featured == featured)
    
    # Order by publish date descending
    query_filter = query_filter.order_by(desc(News.publish_date))
    
    # Apply pagination
    offset = (page - 1) * limit
    news_items = query_filter.offset(offset).limit(limit).all()
    
    # Convert JSON strings back to lists for response
    result = []
    for news in news_items:
        news_dict = {
            "id": news.id,
            "title": news.title,
            "content": news.content,
            "summary": news.summary,
            "type": news.type,
            "author": news.author,
            "publish_date": news.publish_date,
            "event_date": news.event_date,
            "event_location": news.event_location,
            "tags": json.loads(news.tags) if news.tags else [],
            "image_url": news.image_url,
            "external_url": news.external_url,
            "is_featured": news.is_featured,
            "is_published": news.is_published,
            "created_at": news.created_at,
            "updated_at": news.updated_at
        }
        result.append(NewsResponse(**news_dict))
    
    return result

@router.get("/news/{news_id}", response_model=NewsResponse)
async def get_news_item(news_id: int, db: Session = Depends(get_db)):
    """Get a specific news item by ID"""
    
    news = db.query(News).filter(News.id == news_id).first()
    if not news:
        raise HTTPException(status_code=404, detail="News item not found")
    
    # Check if published (unless it's an admin request)
    if not news.is_published:
        raise HTTPException(status_code=404, detail="News item not found")
    
    # Convert JSON strings back to lists
    news_dict = {
        "id": news.id,
        "title": news.title,
        "content": news.content,
        "summary": news.summary,
        "type": news.type,
        "author": news.author,
        "publish_date": news.publish_date,
        "event_date": news.event_date,
        "event_location": news.event_location,
        "tags": json.loads(news.tags) if news.tags else [],
        "image_url": news.image_url,
        "external_url": news.external_url,
        "is_featured": news.is_featured,
        "is_published": news.is_published,
        "created_at": news.created_at,
        "updated_at": news.updated_at
    }
    
    return NewsResponse(**news_dict)

@router.get("/events", response_model=List[NewsResponse])
async def get_events(
    upcoming: Optional[bool] = Query(None, description="Filter upcoming events"),
    limit: int = Query(20, le=50, description="Maximum number of results"),
    db: Session = Depends(get_db)
):
    """Get events (news items of type 'event')"""
    
    query_filter = db.query(News).filter(News.type == NewsType.EVENT, News.is_published == True)
    
    if upcoming is not None:
        from datetime import datetime
        if upcoming:
            query_filter = query_filter.filter(News.event_date >= datetime.now())
            query_filter = query_filter.order_by(News.event_date.asc())
        else:
            query_filter = query_filter.filter(News.event_date < datetime.now())
            query_filter = query_filter.order_by(desc(News.event_date))
    else:
        query_filter = query_filter.order_by(desc(News.event_date))
    
    events = query_filter.limit(limit).all()
    
    # Convert to response format
    result = []
    for event in events:
        event_dict = {
            "id": event.id,
            "title": event.title,
            "content": event.content,
            "summary": event.summary,
            "type": event.type,
            "author": event.author,
            "publish_date": event.publish_date,
            "event_date": event.event_date,
            "event_location": event.event_location,
            "tags": json.loads(event.tags) if event.tags else [],
            "image_url": event.image_url,
            "external_url": event.external_url,
            "is_featured": event.is_featured,
            "is_published": event.is_published,
            "created_at": event.created_at,
            "updated_at": event.updated_at
        }
        result.append(NewsResponse(**event_dict))
    
    return result
