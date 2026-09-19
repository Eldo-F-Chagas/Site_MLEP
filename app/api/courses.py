from fastapi import APIRouter
import os

router = APIRouter()

@router.get("/courses/datalab")
async def get_datalab_info():
    """Get Data Lab course information and redirect URL"""
    
    # Get Data Lab URL from environment variable
    data_lab_url = os.getenv("DATA_LAB_URL", "/cursos")
    
    return {
        "name": "Data Lab",
        "description": "Cursos de Machine Learning aplicado à Física Ambiental",
        "url": data_lab_url,
        "features": [
            "Hands-on machine learning techniques for environmental data",
            "Real-world case studies and datasets",
            "Expert instruction from MLEP research group"
        ],
        "target_audience": [
            "Researchers in environmental sciences",
            "Graduate students in physics and related fields",
            "Data scientists interested in environmental applications"
        ],
        "topics": [
            "Environmental data preprocessing and analysis",
            "Machine learning for climate modeling",
            "Satellite data analysis with AI",
            "Air quality prediction models",
            "Hydrological modeling with ML"
        ]
    }

@router.get("/courses/stats")
async def get_courses_stats():
    """Get course-related statistics"""
    
    # This could be expanded to include actual course enrollment data
    # For now, return basic information about available courses
    
    return {
        "total_courses": 1,
        "active_courses": 1,
        "courses": [
            {
                "name": "Data Lab",
                "type": "external",
                "status": "active",
                "url": os.getenv("DATA_LAB_URL", "/cursos")
            }
        ]
    }
