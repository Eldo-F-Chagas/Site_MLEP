#!/usr/bin/env python3
"""
Migration script to update database for local authentication
"""

import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Add the app directory to the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db import Base, DATABASE_URL
from app.models.user import User


def migrate_database():
    """Migrate database to support local authentication"""
    
    # Get database URL
    database_url = DATABASE_URL
    engine = create_engine(database_url)
    
    print("🔄 Starting database migration for local authentication...")
    
    try:
        # Create a connection
        with engine.connect() as conn:
            # Check if users table exists
            result = conn.execute(text("""
                SELECT name FROM sqlite_master 
                WHERE type='table' AND name='users';
            """))
            
            table_exists = result.fetchone() is not None
            
            if table_exists:
                print("✅ Users table exists. Checking for new columns...")
                
                # Check if password_hash column exists
                result = conn.execute(text("PRAGMA table_info(users)"))
                columns = [row[1] for row in result.fetchall()]
                
                migrations_needed = []
                
                if 'password_hash' not in columns:
                    migrations_needed.append("ADD COLUMN password_hash VARCHAR(255)")
                
                if 'is_verified' not in columns:
                    migrations_needed.append("ADD COLUMN is_verified BOOLEAN DEFAULT 0")
                
                # Make google_sub nullable
                if 'google_sub' in columns:
                    # SQLite doesn't support ALTER COLUMN, so we'll handle this differently
                    print("📝 Note: google_sub column will be made nullable in new schema")
                
                # Apply migrations
                if migrations_needed:
                    print(f"🔧 Applying {len(migrations_needed)} migrations...")
                    
                    for migration in migrations_needed:
                        try:
                            conn.execute(text(f"ALTER TABLE users {migration}"))
                            print(f"✅ Applied: {migration}")
                        except Exception as e:
                            print(f"⚠️  Migration failed: {migration} - {e}")
                    
                    conn.commit()
                    print("✅ Database migration completed!")
                else:
                    print("✅ Database is already up to date!")
            
            else:
                print("🆕 Users table doesn't exist. Creating new schema...")
                # Create all tables with new schema
                Base.metadata.create_all(engine)
                print("✅ Database tables created!")
        
        # Verify the migration
        print("\n🔍 Verifying migration...")
        with engine.connect() as conn:
            result = conn.execute(text("PRAGMA table_info(users)"))
            columns = [row[1] for row in result.fetchall()]
            
            required_columns = ['id', 'email', 'name', 'password_hash', 'is_verified', 'is_active']
            missing_columns = [col for col in required_columns if col not in columns]
            
            if missing_columns:
                print(f"❌ Missing columns: {missing_columns}")
                return False
            else:
                print("✅ All required columns present!")
                print(f"📋 Available columns: {', '.join(columns)}")
                return True
    
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        return False


def create_test_user():
    """Create a test user for testing the new authentication system"""
    
    try:
        from app.auth_local import create_user
        from app.models.user import UserCreate
        from app.db import SessionLocal
        
        db = SessionLocal()
        
        # Check if test user already exists
        existing_user = db.query(User).filter(User.email == "test@mlep.com").first()
        if existing_user:
            print("✅ Test user already exists: test@mlep.com")
            db.close()
            return
        
        # Create test user
        test_user_data = UserCreate(
            email="test@mlep.com",
            name="Test User",
            password="TestPassword123",
            confirm_password="TestPassword123"
        )
        
        import asyncio
        user = asyncio.run(create_user(test_user_data, db))
        
        print("✅ Test user created successfully!")
        print("📧 Email: test@mlep.com")
        print("🔑 Password: TestPassword123")
        
        db.close()
        
    except Exception as e:
        print(f"⚠️  Could not create test user: {e}")
        print("💡 You can create users manually through the registration page")


def main():
    """Main migration function"""
    print("🚀 MLEP Local Authentication Migration")
    print("=" * 50)
    
    # Run database migration
    success = migrate_database()
    
    if success:
        print("\n" + "=" * 50)
        print("✅ Migration completed successfully!")
        
        # Create test user
        print("\n🧪 Creating test user...")
        create_test_user()
        
        print("\n" + "=" * 50)
        print("🎉 Local authentication system is ready!")
        print("\n📋 Next steps:")
        print("1. Restart the server: uvicorn app.main:app --reload")
        print("2. Visit: http://localhost:8000/login")
        print("3. Register a new account or use test credentials")
        print("4. Access courses at: http://localhost:8000/cursos")
        
    else:
        print("\n❌ Migration failed. Please check the errors above.")
        sys.exit(1)


if __name__ == "__main__":
    main()
