#!/usr/bin/env python3
"""
Create test user directly in database
"""

import os
import sys
import sqlite3
import bcrypt

# Add the app directory to the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def create_test_user():
    """Create test user directly in database"""
    print("🧪 Creating test user directly in database...")
    
    # Hash password
    password = "TestPassword123"
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    password_hash = hashed.decode('utf-8')
    
    print(f"🔐 Password hash: {password_hash[:30]}...")
    
    # Connect to database
    conn = sqlite3.connect('mlep.db')
    cursor = conn.cursor()
    
    try:
        # Delete existing test user
        cursor.execute("DELETE FROM users WHERE email = ?", ('test@mlep.com',))
        
        # Insert new test user
        cursor.execute("""
            INSERT INTO users (email, name, password_hash, is_active, is_verified) 
            VALUES (?, ?, ?, ?, ?)
        """, ('test@mlep.com', 'Test User', password_hash, 1, 0))
        
        conn.commit()
        
        # Verify user was created
        cursor.execute("SELECT id, email, name FROM users WHERE email = ?", ('test@mlep.com',))
        user = cursor.fetchone()
        
        if user:
            print(f"✅ Test user created successfully!")
            print(f"   ID: {user[0]}")
            print(f"   Email: {user[1]}")
            print(f"   Name: {user[2]}")
            print(f"   Password: {password}")
            return True
        else:
            print("❌ Failed to create test user")
            return False
            
    except Exception as e:
        print(f"❌ Error: {e}")
        return False
    finally:
        conn.close()

if __name__ == "__main__":
    create_test_user()
