from fastapi import FastAPI, HTTPException, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, RedirectResponse
from pathlib import Path
import os
from sqlalchemy.orm import Session

from app.api import publications, projects, news, team, contact, courses, courses_lms, auth
from app.auth_local import get_current_user_optional
from app.db import engine, Base, get_db

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="MLEP Research Group API",
    description="Machine Learning Applied to Environmental Physics - Research Group Website API",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc"
)

# Add compression middleware (should be first)
app.add_middleware(GZipMiddleware, minimum_size=1000)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:8000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],  # More specific than "*"
    allow_headers=["*"],
)

# Include API routers
app.include_router(publications.router, prefix="/api", tags=["publications"])
app.include_router(projects.router, prefix="/api", tags=["projects"])
app.include_router(news.router, prefix="/api", tags=["news"])
app.include_router(team.router, prefix="/api", tags=["team"])
app.include_router(contact.router, prefix="/api", tags=["contact"])
app.include_router(courses.router, prefix="/api", tags=["courses"])
app.include_router(courses_lms.router)
app.include_router(auth.router)

# Course page routes (dynamic routing) - Protected
@app.get("/cursos/{course_slug}")
async def course_page(course_slug: str, request: Request):
    """Serve individual course page"""
    user = get_current_user_optional(request)
    if not user:
        return RedirectResponse(url=f"/login?next=/cursos/{course_slug}", status_code=302)
    return FileResponse("web/curso.html")

@app.get("/cursos/{course_slug}/aulas/{lesson_slug}")
async def lesson_page(course_slug: str, lesson_slug: str, request: Request):
    """Serve lesson page"""
    user = get_current_user_optional(request)
    if not user:
        return RedirectResponse(url=f"/login?next=/cursos/{course_slug}/aulas/{lesson_slug}", status_code=302)
    return FileResponse("web/aula.html")

@app.get("/cursos/{course_slug}/forum")
async def course_forum_page(course_slug: str):
    """Serve course forum page"""
    return FileResponse("web/forum.html")

@app.get("/cursos/{course_slug}/forum/{topic_id}")
async def forum_topic_page(course_slug: str, topic_id: int):
    """Serve forum topic page"""
    return FileResponse("web/forum-topic.html")

@app.get("/cursos/{course_slug}/materiais")
async def course_materials_page(course_slug: str):
    """Serve course materials page"""
    return FileResponse("web/materiais.html")

# Add cache headers middleware
@app.middleware("http")
async def add_cache_headers(request: Request, call_next):
    response = await call_next(request)

    # Cache static assets for 1 year
    if request.url.path.startswith("/assets/"):
        if any(request.url.path.endswith(ext) for ext in [".css", ".js", ".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico", ".woff", ".woff2"]):
            response.headers["Cache-Control"] = "public, max-age=31536000, immutable"
        else:
            response.headers["Cache-Control"] = "public, max-age=3600"

    # Cache HTML pages for 5 minutes
    elif request.url.path.endswith(".html") or not "." in request.url.path.split("/")[-1]:
        response.headers["Cache-Control"] = "public, max-age=300"

    return response

# Mount static files
if os.path.exists("web"):
    app.mount("/assets", StaticFiles(directory="web/assets"), name="assets")

    # Mount i18n only if directory exists
    if os.path.exists("web/i18n"):
        app.mount("/i18n", StaticFiles(directory="web/i18n"), name="i18n")

@app.get("/")
async def serve_index():
    """Serve the main index.html file"""
    return FileResponse("web/index.html")

# Protected route for courses catalog
@app.get("/cursos")
async def courses_catalog(request: Request, db: Session = Depends(get_db)):
    """Serve courses catalog page (protected)"""
    user = get_current_user_optional(request, db)
    if not user:
        return RedirectResponse(url="/login?next=/cursos", status_code=302)
    return FileResponse("web/cursos.html")

@app.get("/{path:path}")
async def serve_static_files(path: str):
    """Serve static HTML files"""
    file_path = Path(f"web/{path}")

    # If it's a directory or doesn't have an extension, try to serve index.html
    if file_path.is_dir() or not file_path.suffix:
        file_path = file_path / "index.html" if file_path.is_dir() else Path(f"web/{path}.html")

    if file_path.exists() and file_path.is_file():
        return FileResponse(str(file_path))
    
    # Return 404 page if file doesn't exist
    if Path("web/404.html").exists():
        return FileResponse("web/404.html", status_code=404)
    
    raise HTTPException(status_code=404, detail="Page not found")

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "message": "MLEP API is running"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
