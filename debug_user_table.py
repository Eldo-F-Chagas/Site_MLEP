#!/usr/bin/env python3
"""
Debug script to create user table specifically
"""

import os
import sys

# Add the app directory to the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db import engine, Base
from app.models.user import User

def debug_user_table():
    """Debug user table creation"""
    print("🔍 Debugging user table creation...")
    
    try:
        # Import the User model
        print(f"✅ User model imported: {User}")
        print(f"✅ Table name: {User.__tablename__}")
        print(f"✅ Base metadata tables: {list(Base.metadata.tables.keys())}")
        
        # Create just the users table
        User.__table__.create(engine, checkfirst=True)
        print("✅ User table created successfully!")
        
        # Verify table structure
        from sqlalchemy import inspect
        inspector = inspect(engine)
        
        if 'users' in inspector.get_table_names():
            columns = inspector.get_columns('users')
            print("📋 User table columns:")
            for col in columns:
                print(f"  - {col['name']}: {col['type']} (nullable: {col['nullable']})")
        else:
            print("❌ User table not found after creation")
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    debug_user_table()
