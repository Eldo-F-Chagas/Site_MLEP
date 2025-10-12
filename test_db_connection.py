#!/usr/bin/env python3
"""
Test database connection
"""

import os
import sys

# Add the app directory to the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db import SessionLocal, engine
from sqlalchemy import text

def test_db_connection():
    """Test database connection"""
    print("🧪 Testing database connection...")

    from app.db import DATABASE_URL
    print(f"📍 Database URL: {DATABASE_URL}")

    db = SessionLocal()
    
    try:
        # Test raw SQL query
        result = db.execute(text("SELECT id, email, name FROM users WHERE email = 'test@mlep.com'"))
        user_row = result.fetchone()
        
        if user_row:
            print(f"✅ User found via raw SQL:")
            print(f"   ID: {user_row[0]}")
            print(f"   Email: {user_row[1]}")
            print(f"   Name: {user_row[2]}")
        else:
            print("❌ User not found via raw SQL")
            return False
        
        # Test SQLAlchemy model
        from app.models.user import User
        user_obj = db.query(User).filter(User.email == "test@mlep.com").first()
        
        if user_obj:
            print(f"✅ User found via SQLAlchemy:")
            print(f"   ID: {user_obj.id}")
            print(f"   Email: {user_obj.email}")
            print(f"   Name: {user_obj.name}")
            print(f"   Password hash: {user_obj.password_hash[:30]}...")
        else:
            print("❌ User not found via SQLAlchemy")
            
            # Debug: check all users
            all_users = db.query(User).all()
            print(f"📋 Total users in database: {len(all_users)}")
            for u in all_users:
                print(f"   - {u.id}: {u.email}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()

if __name__ == "__main__":
    test_db_connection()
