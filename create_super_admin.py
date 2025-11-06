"""
Script to create the first super admin account.
Run this script once to create your initial super admin.

Usage:
    python create_super_admin.py
"""

import sys
from sqlalchemy.orm import Session
from database import SessionLocal
from models import User
from auth_utils import hash_password
from email_utils import generate_otp, send_otp_email
from datetime import datetime, timedelta

def create_super_admin(username: str, email: str, password: str, phone: str = None):
    """Create a super admin account"""
    db: Session = SessionLocal()
    
    try:
        # Check if any super admin already exists
        existing_admin = db.query(User).filter(
            (User.role == "admin") | (User.is_admin == True)
        ).first()
        
        if existing_admin:
            print(f"❌ Super admin already exists: {existing_admin.username}")
            print("   Use the API endpoint /admin/create-super-admin if needed.")
            return False
        
        # Check if username/email already exists
        if db.query(User).filter(User.username == username).first():
            print(f"❌ Username '{username}' already exists")
            return False
        
        if db.query(User).filter(User.email == email).first():
            print(f"❌ Email '{email}' already exists")
            return False
        
        # Generate OTP for email verification
        otp = generate_otp()
        expiry = datetime.utcnow() + timedelta(minutes=10)
        hashed_pw = hash_password(password)
        
        # Create super admin user
        super_admin = User(
            username=username,
            email=email,
            phone=phone,
            hashed_password=hashed_pw,
            is_active=False,  # Will be True after OTP verification
            otp=otp,
            otp_expiry=expiry,
            role="admin",
            is_admin=True,  # Super admin flag
            is_approved=True  # Auto-approved
        )
        db.add(super_admin)
        db.commit()
        db.refresh(super_admin)
        
        # Send OTP email
        try:
            send_otp_email(email, otp)
            print(f"✅ Super admin account created successfully!")
            print(f"   Username: {username}")
            print(f"   Email: {email}")
            print(f"   OTP sent to email: {otp}")
            print(f"\n📧 Please verify your email with the OTP:")
            print(f"   Option 1: Visit http://localhost:5173/admin/verify-otp?email={email}")
            print(f"   Option 2: Use API endpoint POST /verify-otp with email and OTP")
            print(f"   Option 3: Login at http://localhost:5173/login and verify through OTP component")
            print(f"\n   Your OTP: {otp}")
            return True
        except Exception as e:
            print(f"⚠️  Super admin created but OTP email failed: {str(e)}")
            print(f"   OTP: {otp}")
            print(f"\n📧 Verify your email:")
            print(f"   Visit: http://localhost:5173/admin/verify-otp?email={email}")
            print(f"   Or use API: POST /verify-otp with email={email} and otp={otp}")
            return True
            
    except Exception as e:
        db.rollback()
        print(f"❌ Error creating super admin: {str(e)}")
        return False
    finally:
        db.close()

if __name__ == "__main__":
    print("=" * 60)
    print("Create Super Admin Account")
    print("=" * 60)
    print()
    
    # Get input from user
    username = input("Enter username: ").strip()
    if not username:
        print("❌ Username is required")
        sys.exit(1)
    
    email = input("Enter email: ").strip()
    if not email:
        print("❌ Email is required")
        sys.exit(1)
    
    password = input("Enter password: ").strip()
    if not password:
        print("❌ Password is required")
        sys.exit(1)
    
    if len(password) < 6:
        print("❌ Password must be at least 6 characters")
        sys.exit(1)
    
    phone = input("Enter phone (optional): ").strip() or None
    
    print()
    print("Creating super admin account...")
    print()
    
    success = create_super_admin(username, email, password, phone)
    
    if success:
        print()
        print("=" * 60)
        print("✅ Setup complete!")
        print("=" * 60)
    else:
        print()
        print("=" * 60)
        print("❌ Setup failed")
        print("=" * 60)
        sys.exit(1)

