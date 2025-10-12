#!/usr/bin/env python3
"""
Test authentication functions
"""

import os
import sys
import asyncio

# Add the app directory to the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db import SessionLocal
from app.models.user import UserLogin, User
from app.auth_local import authenticate_user, verify_password

async def test_authentication():
    """Test authentication"""
    print("🧪 Testing authentication...")
    
    db = SessionLocal()
    
    try:
        # Get user from database
        user = db.query(User).filter(User.email == "test@mlep.com").first()
        
        if not user:
            print("❌ User not found in database")
            return False
        
        print(f"✅ User found: {user.email}")
        print(f"   Name: {user.name}")
        print(f"   Password hash: {user.password_hash[:30]}...")
        print(f"   Is active: {user.is_active}")
        
        # Test password verification
        test_password = "TestPassword123"
        is_valid = verify_password(test_password, user.password_hash)
        print(f"🔐 Password verification: {is_valid}")
        
        if not is_valid:
            print("❌ Password verification failed")
            return False
        
        # Test authentication function
        login_data = UserLogin(
            email="test@mlep.com",
            password="TestPassword123"
        )
        
        print(f"📝 Testing authenticate_user function...")
        auth_user = await authenticate_user(login_data, db)
        
        print(f"✅ Authentication successful!")
        print(f"   User ID: {auth_user.id}")
        print(f"   Email: {auth_user.email}")
        print(f"   Name: {auth_user.name}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(test_authentication())
