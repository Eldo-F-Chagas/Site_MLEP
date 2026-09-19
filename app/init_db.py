"""
Database initialization script for MLEP website
Creates all tables and populates with sample data
"""

import json
import os
from datetime import datetime
from sqlalchemy.orm import Session
from app.db import engine, SessionLocal, Base
from app.models.publication import Publication
from app.models.project import Project
from app.models.news import News
from app.models.member import Member
from app.models.contact import Contact
from app.models.course import Course, Module, Lesson, Material, ForumTopic, ForumPost
from app.models.user import User


def create_tables():
    """Create all database tables"""
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("Tables created successfully!")


def populate_courses(db: Session):
    """Populate database with sample courses"""
    print("Creating sample courses...")

    # Check if courses already exist
    existing_courses = db.query(Course).count()
    if existing_courses > 0:
        print(f"Found {existing_courses} existing courses. Skipping course creation.")
        return

    # Course 1: Python básico ao avançado
    python_course = Course(
        slug="python-basico-ao-avancado",
        title="Python básico ao avançado",
        summary="Fundamentos, data wrangling, visualização, automação e boas práticas.",
        description="Um curso completo de Python voltado para ciência de dados e física ambiental. Aprenda desde os conceitos básicos até técnicas avançadas de análise de dados.",
        level="iniciante",
        hours=40,
        tags=json.dumps(["python", "datascience", "programacao"]),
        cover_url="/assets/img/courses/python-course.jpg",
        is_active=True
    )
    db.add(python_course)
    db.flush()
    
    # Modules for Python course
    python_modules = [
        {"title": "Fundamentos", "description": "Conceitos básicos de Python", "order": 1},
        {"title": "Estruturas de Dados", "description": "Listas, dicionários, sets e tuplas", "order": 2},
        {"title": "Análise de Dados", "description": "Pandas, NumPy e visualização", "order": 3},
        {"title": "Projetos Práticos", "description": "Aplicações em física ambiental", "order": 4}
    ]
    
    for mod_data in python_modules:
        module = Module(
            course_id=python_course.id,
            title=mod_data["title"],
            description=mod_data["description"],
            order=mod_data["order"]
        )
        db.add(module)
        db.flush()
        
        # Add lessons to each module
        if mod_data["order"] == 1:  # Fundamentos
            lessons = [
                {"slug": "introducao", "title": "Introdução ao Python", "order": 1, "video_url": "/videos/python/intro.mp4", "duration": 1800},
                {"slug": "variaveis", "title": "Variáveis e Tipos de Dados", "order": 2, "video_url": "/videos/python/variaveis.mp4", "duration": 2100},
                {"slug": "estruturas-controle", "title": "Estruturas de Controle", "order": 3, "video_url": "/videos/python/controle.mp4", "duration": 2400}
            ]
        elif mod_data["order"] == 2:  # Estruturas de Dados
            lessons = [
                {"slug": "listas", "title": "Trabalhando com Listas", "order": 1, "video_url": "/videos/python/listas.mp4", "duration": 1900},
                {"slug": "dicionarios", "title": "Dicionários e Sets", "order": 2, "video_url": "/videos/python/dicionarios.mp4", "duration": 2200}
            ]
        else:
            lessons = []
        
        for lesson_data in lessons:
            lesson = Lesson(
                module_id=module.id,
                slug=lesson_data["slug"],
                title=lesson_data["title"],
                description=f"Aprenda sobre {lesson_data['title'].lower()} em Python",
                objectives="Compreender os conceitos fundamentais e aplicar em exercícios práticos",
                order=lesson_data["order"],
                video_url=lesson_data["video_url"],
                video_duration=lesson_data["duration"],
                is_free=lesson_data["order"] == 1  # First lesson is free
            )
            db.add(lesson)
            db.flush()
            
            # Add materials for each lesson
            materials = [
                {
                    "filename": f"aula_{lesson.slug}_slides.pdf",
                    "original_filename": f"Slides - {lesson.title}.pdf",
                    "file_url": f"/assets/materials/python/{lesson.slug}/slides.pdf",
                    "file_size_bytes": 1024 * 1024 * 2,  # 2MB
                    "file_type": "pdf",
                    "description": f"Slides da aula sobre {lesson.title}"
                },
                {
                    "filename": f"aula_{lesson.slug}_exercicios.ipynb",
                    "original_filename": f"Exercícios - {lesson.title}.ipynb",
                    "file_url": f"/assets/materials/python/{lesson.slug}/exercicios.ipynb",
                    "file_size_bytes": 1024 * 512,  # 512KB
                    "file_type": "ipynb",
                    "description": f"Notebook com exercícios práticos"
                }
            ]
            
            for mat_data in materials:
                material = Material(
                    course_id=python_course.id,
                    lesson_id=lesson.id,
                    filename=mat_data["filename"],
                    original_filename=mat_data["original_filename"],
                    file_url=mat_data["file_url"],
                    file_size_bytes=mat_data["file_size_bytes"],
                    file_type=mat_data["file_type"],
                    description=mat_data["description"],
                    download_count=0
                )
                db.add(material)
    
    # Course 2: LaTeX para Data Science
    latex_course = Course(
        slug="latex-para-data-science",
        title="LaTeX para Data Science",
        summary="Produção de relatórios técnicos, artigos e apresentações científicas.",
        description="Aprenda a criar documentos científicos profissionais usando LaTeX, com foco em relatórios de análise de dados e artigos científicos.",
        level="intermediario",
        hours=16,
        tags=json.dumps(["latex", "relatorios", "documentacao"]),
        cover_url="/assets/img/courses/latex-course.jpg",
        is_active=True
    )
    db.add(latex_course)
    db.flush()
    
    # Course 3: Curvas de Níveis
    curves_course = Course(
        slug="curvas-de-niveis",
        title="Curvas de Níveis",
        summary="Geração e análise de curvas de nível e aplicações em física ambiental.",
        description="Explore técnicas de visualização e análise de dados topográficos e ambientais através de curvas de nível.",
        level="intermediario",
        hours=24,
        tags=json.dumps(["gis", "ambiente", "visualizacao"]),
        cover_url="/assets/img/courses/curves-course.jpg",
        is_active=True
    )
    db.add(curves_course)
    db.flush()
    
    # Add some forum topics
    topics = [
        {
            "course_id": python_course.id,
            "title": "Dúvidas sobre instalação do Python",
            "author": "João Silva",
            "lesson_id": None
        },
        {
            "course_id": python_course.id,
            "title": "Exercícios da Aula 1",
            "author": "Maria Santos",
            "lesson_id": None
        }
    ]
    
    for topic_data in topics:
        topic = ForumTopic(
            course_id=topic_data["course_id"],
            lesson_id=topic_data["lesson_id"],
            title=topic_data["title"],
            author=topic_data["author"]
        )
        db.add(topic)
        db.flush()
        
        # Add some posts to topics
        posts = [
            {
                "author": "Prof. MLEP",
                "body_md": "Olá! Para instalar o Python, recomendo usar o Anaconda. Vocês podem baixar em https://anaconda.com"
            },
            {
                "author": topic_data["author"],
                "body_md": "Obrigado pela dica! Consegui instalar com sucesso."
            }
        ]
        
        for post_data in posts:
            post = ForumPost(
                topic_id=topic.id,
                author=post_data["author"],
                body_md=post_data["body_md"]
            )
            db.add(post)
    
    print("Sample courses created successfully!")


def main():
    """Main initialization function"""
    print("Initializing MLEP database...")
    
    # Create tables
    create_tables()
    
    # Create database session
    db = SessionLocal()
    
    try:
        # Demo content is opt-in so production never publishes fabricated data.
        if os.getenv("SEED_DEMO_DATA", "false").lower() in {"1", "true", "yes"}:
            populate_courses(db)
        
        # Commit all changes
        db.commit()
        print("Database initialization completed successfully!")
        
    except Exception as e:
        print(f"Error during initialization: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
