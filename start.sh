#!/bin/bash

# MLEP Site Startup Script
echo "🚀 Iniciando MLEP Site..."

# Create data directory if it doesn't exist
mkdir -p data

# Initialize database
echo "📊 Inicializando banco de dados..."
python -c "
from app.db import engine, Base
from app.models.user import User
Base.metadata.create_all(bind=engine)
print('✅ Database initialized successfully')
"

# Create test user if it doesn't exist
echo "👤 Criando usuário de teste..."
python create_test_user.py

# Start the server
echo "🌐 Iniciando servidor..."
echo "📍 Site estará disponível em: http://localhost:8000"
echo "🔐 Login de teste: test@mlep.com / TestPassword123"
echo ""

uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
