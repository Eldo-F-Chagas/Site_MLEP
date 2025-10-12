#!/usr/bin/env python3
"""
Test user creation
"""

import os
import sys
import asyncio

# Add the app directory to the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db import SessionLocal
from app.models.user import UserCreate
from app.auth_local import create_user

async def test_user_creation():
    """Test creating a user"""
    print("🧪 Testing user creation...")
    
    db = SessionLocal()
    
    try:
        # Create test user data
        user_data = UserCreate(
            email="test@mlep.com",
            name="Test User",
            password="TestPassword123",
            confirm_password="TestPassword123"
        )
        
        print(f"📝 Creating user: {user_data.email}")
        
        # Create user
        user = await create_user(user_data, db)
        
        print(f"✅ User created successfully!")
        print(f"   ID: {user.id}")
        print(f"   Email: {user.email}")
        print(f"   Name: {user.name}")
        print(f"   Password hash: {user.password_hash[:20]}...")
        
        return True
        
    except Exception as e:
        print(f"❌ Error creating user: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(test_user_creation())
