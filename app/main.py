"""FastAPI application for the MLEP website."""

from __future__ import annotations

import os
import time
from collections import defaultdict, deque
from contextlib import asynccontextmanager
from pathlib import Path
from urllib.parse import quote, urlsplit

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import FileResponse, JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session

from app.api import auth, contact, courses, courses_lms, news, projects, publications, team
from app.auth_local import get_current_user_optional
from app.db import Base, engine, get_db

# Import every model before creating the schema.
from app.models import contact as contact_models  # noqa: F401
from app.models import course as course_models  # noqa: F401
from app.models import member as member_models  # noqa: F401
from app.models import news as news_models  # noqa: F401
from app.models import project as project_models  # noqa: F401
from app.models import publication as publication_models  # noqa: F401
from app.models import user as user_models  # noqa: F401


ROOT_DIR = Path(__file__).resolve().parents[1]
WEB_DIR = ROOT_DIR / "web"


def _env_bool(name: str, default: bool = False) -> bool:
    return os.getenv(name, str(default)).strip().lower() in {"1", "true", "yes", "on"}


@asynccontextmanager
async def lifespan(_: FastAPI):
    """Create the development schema at startup.

    Production deployments can disable this with AUTO_CREATE_TABLES=false and
    run Alembic migrations instead.
    """
    if _env_bool("AUTO_CREATE_TABLES", True):
        Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title="MLEP Research Group API",
    description="Machine Learning Applied to Environmental Physics",
    version="1.1.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    lifespan=lifespan,
)

app.add_middleware(GZipMiddleware, minimum_size=1000)

allowed_origins = [
    origin.strip()
    for origin in os.getenv(
        "ALLOWED_ORIGINS",
        "http://localhost:3000,http://localhost:8000,http://127.0.0.1:3000,http://127.0.0.1:8000",
    ).split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Content-Type", "Authorization", "X-CSRF-Token", "X-Admin-Token"],
)


_rate_limit_buckets: dict[str, deque[float]] = defaultdict(deque)
_limited_paths = {
    "/auth/login": (10, 60),
    "/auth/register": (5, 300),
    "/api/contact": (5, 300),
    "/api/newsletter/subscribe": (5, 300),
}


@app.middleware("http")
async def security_and_cache_headers(request: Request, call_next):
    """Apply basic request protections and safe cache policies."""
    if request.method not in {"GET", "HEAD", "OPTIONS"}:
        origin = request.headers.get("origin")
        fetch_site = request.headers.get("sec-fetch-site")
        origin_host = urlsplit(origin).netloc if origin else ""
        request_host = request.headers.get("host", "")
        if (origin and origin_host != request_host) or fetch_site == "cross-site":
            return JSONResponse({"detail": "Cross-site request rejected"}, status_code=403)

    if request.method == "POST" and request.url.path in _limited_paths:
        limit, window = _limited_paths[request.url.path]
        client = request.client.host if request.client else "unknown"
        bucket = _rate_limit_buckets[f"{client}:{request.url.path}"]
        now = time.monotonic()
        while bucket and bucket[0] <= now - window:
            bucket.popleft()
        if len(bucket) >= limit:
            return JSONResponse(
                {"detail": "Too many requests. Please try again later."},
                status_code=429,
                headers={"Retry-After": str(window)},
            )
        bucket.append(now)

    response = await call_next(request)
    path = request.url.path

    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    response.headers.setdefault("Permissions-Policy", "camera=(), microphone=(), geolocation=()")

    if path.startswith("/api/") or path in {"/login", "/register", "/profile", "/settings"}:
        response.headers["Cache-Control"] = "no-store"
    elif path.startswith(("/assets/", "/i18n/")):
        response.headers["Cache-Control"] = "public, max-age=3600"
    else:
        response.headers["Cache-Control"] = "no-cache"

    return response


# API routes must be registered before the frontend catch-all.
app.include_router(publications.router, prefix="/api", tags=["publications"])
app.include_router(projects.router, prefix="/api", tags=["projects"])
app.include_router(news.router, prefix="/api", tags=["news"])
app.include_router(team.router, prefix="/api", tags=["team"])
app.include_router(contact.router, prefix="/api", tags=["contact"])
app.include_router(courses.router, prefix="/api", tags=["courses"])
app.include_router(courses_lms.router)
app.include_router(auth.router)


@app.get("/api/health", tags=["health"])
async def health_check():
    return {"status": "healthy", "message": "MLEP API is running"}


if WEB_DIR.is_dir():
    app.mount("/assets", StaticFiles(directory=WEB_DIR / "assets"), name="assets")
    if (WEB_DIR / "i18n").is_dir():
        app.mount("/i18n", StaticFiles(directory=WEB_DIR / "i18n"), name="i18n")


def _page(name: str, *, status_code: int = 200) -> FileResponse:
    file_path = WEB_DIR / name
    if not file_path.is_file():
        raise HTTPException(status_code=404, detail="Page not found")
    return FileResponse(file_path, status_code=status_code)


def _safe_course_redirect(path: str) -> str:
    return f"/login?next={quote(path, safe='/')}"


@app.get("/")
async def serve_index():
    return _page("index.html")


@app.get("/cursos")
async def courses_catalog(request: Request, db: Session = Depends(get_db)):
    if not get_current_user_optional(request, db):
        return RedirectResponse(url=_safe_course_redirect("/cursos"), status_code=303)
    return _page("cursos.html")


@app.get("/cursos/{course_slug}")
async def course_page(course_slug: str, request: Request, db: Session = Depends(get_db)):
    if not get_current_user_optional(request, db):
        return RedirectResponse(url=_safe_course_redirect(f"/cursos/{course_slug}"), status_code=303)
    return _page("curso.html")


@app.get("/cursos/{course_slug}/aulas/{lesson_slug}")
async def lesson_page(course_slug: str, lesson_slug: str, request: Request, db: Session = Depends(get_db)):
    if not get_current_user_optional(request, db):
        return RedirectResponse(
            url=_safe_course_redirect(f"/cursos/{course_slug}/aulas/{lesson_slug}"),
            status_code=303,
        )
    return _page("aula.html")


@app.get("/cursos/{course_slug}/forum")
async def course_forum_page(course_slug: str, request: Request, db: Session = Depends(get_db)):
    if not get_current_user_optional(request, db):
        return RedirectResponse(url=_safe_course_redirect(f"/cursos/{course_slug}/forum"), status_code=303)
    return _page("forum.html")


@app.get("/cursos/{course_slug}/forum/{topic_id}")
async def forum_topic_page(course_slug: str, topic_id: int, request: Request, db: Session = Depends(get_db)):
    if not get_current_user_optional(request, db):
        return RedirectResponse(
            url=_safe_course_redirect(f"/cursos/{course_slug}/forum/{topic_id}"),
            status_code=303,
        )
    return _page("forum-topic.html")


@app.get("/cursos/{course_slug}/materiais")
async def course_materials_page(course_slug: str, request: Request, db: Session = Depends(get_db)):
    if not get_current_user_optional(request, db):
        return RedirectResponse(
            url=_safe_course_redirect(f"/cursos/{course_slug}/materiais"),
            status_code=303,
        )
    return _page("materiais.html")


@app.get("/{path:path}")
async def serve_static_files(path: str):
    """Serve extensionless frontend pages without shadowing the API."""
    if path.startswith("api/"):
        raise HTTPException(status_code=404, detail="API endpoint not found")

    relative_path = Path(path)
    if ".." in relative_path.parts:
        raise HTTPException(status_code=404, detail="Page not found")

    file_path = WEB_DIR / relative_path
    if file_path.is_dir():
        file_path = file_path / "index.html"
    elif not file_path.suffix:
        file_path = file_path.with_suffix(".html")

    try:
        file_path.resolve().relative_to(WEB_DIR.resolve())
    except ValueError as exc:
        raise HTTPException(status_code=404, detail="Page not found") from exc

    if file_path.is_file():
        return FileResponse(file_path)

    not_found = WEB_DIR / "404.html"
    if not_found.is_file():
        return FileResponse(not_found, status_code=404)
    raise HTTPException(status_code=404, detail="Page not found")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
