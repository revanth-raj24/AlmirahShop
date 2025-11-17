from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
import bcrypt
import re
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from database import get_db
from models import User

# Secret key and algorithm
SECRET_KEY = "your_super_secret_key_123"  # You can generate one later
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    # Generate a salt
    salt = bcrypt.gensalt()
    # Hash the password
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    # Return as string
    return hashed.decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against a hash"""
    return bcrypt.checkpw(
        plain_password.encode('utf-8'),
        hashed_password.encode('utf-8')
    )

# Token creation
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/users/login")

def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired token",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        return username
    except JWTError:
        raise credentials_exception

def get_current_user_obj(
    current_user: str = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> User:
    """Get current user as User object"""
    user = db.query(User).filter(User.username == current_user).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

def admin_only(
    current_user_obj: User = Depends(get_current_user_obj)
) -> User:
    """Dependency to ensure user is admin (super admin via is_admin=True or role='admin')"""
    is_admin = (
        current_user_obj.role == "admin" or 
        current_user_obj.is_admin == True
    )
    if not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user_obj

def seller_only(
    current_user_obj: User = Depends(get_current_user_obj)
) -> User:
    """
    Dependency to ensure user is seller and approved.

    NOTE: Login is allowed for unapproved sellers. This dependency is only
    used for seller-protected resources and will return a 403 with a
    machine-readable detail when the seller is not yet approved.
    """
    if current_user_obj.role != "seller":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Seller access required"
        )
    if not current_user_obj.is_approved:
        # Keep semantics but make detail stable for frontend checks
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="SellerNotApproved"
        )
    return current_user_obj

def customer_only(
    current_user_obj: User = Depends(get_current_user_obj)
) -> User:
    """Dependency to ensure user is customer"""
    if current_user_obj.role != "customer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Customer access required"
        )
    return current_user_obj

# ==================== VALIDATION FUNCTIONS ====================

def validate_username(username: str) -> None:
    """
    Validate username according to rules:
    - Length 3-20
    - Allowed: letters, digits, underscore, dot
    - Must start with a letter
    - No consecutive special chars (._)
    - Cannot end with a special char
    
    Raises ValueError with clear message if invalid.
    """
    if not username:
        raise ValueError("Username is required")
    
    username = username.strip()
    
    # Length check
    if len(username) < 3:
        raise ValueError("Username must be at least 3 characters long")
    if len(username) > 20:
        raise ValueError("Username must be at most 20 characters long")
    
    # Regex pattern: ^[A-Za-z](?:[A-Za-z0-9]|[._](?=[A-Za-z0-9])){2,19}$
    # This ensures:
    # - Starts with letter
    # - Followed by 2-19 chars that are either alphanumeric OR special chars followed by alphanumeric
    # - Effectively prevents consecutive special chars and ending with special char
    pattern = r'^[A-Za-z](?:[A-Za-z0-9]|[._](?=[A-Za-z0-9])){2,19}$'
    
    if not re.match(pattern, username):
        raise ValueError(
            "Username must start with a letter, contain only letters, digits, underscores, and dots. "
            "No consecutive special characters allowed, and cannot end with a special character."
        )


def validate_password_strength(password: str, username: str | None = None, email: str | None = None) -> None:
    """
    Validate password strength according to rules:
    - Length 10-64
    - Must include: at least one lowercase, one uppercase, one digit, one special
    - No whitespace
    - Must NOT contain the username (case-insensitive)
    - If email provided, must NOT contain the part before '@' (case-insensitive)
    - Must NOT be in denylist of common passwords
    
    Raises ValueError with clear message if invalid.
    """
    if not password:
        raise ValueError("Password is required")
    
    # Length check
    if len(password) < 10:
        raise ValueError("Password must be at least 10 characters long")
    if len(password) > 64:
        raise ValueError("Password must be at most 64 characters long")
    
    # Whitespace check
    if re.search(r'\s', password):
        raise ValueError("Password cannot contain whitespace")
    
    # Base regex: must have lowercase, uppercase, digit, and special char
    # ^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_\-+=\[\]{};:'\",.<>/?\\|`~])\S{10,64}$
    base_pattern = r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_\-+=\[\]{};:\'",.<>/?\\|`~])\S{10,64}$'
    
    if not re.match(base_pattern, password):
        raise ValueError(
            "Password must contain at least one lowercase letter, one uppercase letter, "
            "one digit, and one special character (!@#$%^&*()_+-=[]{};:'\",.<>/?\\|`~)"
        )
    
    # Check for username in password (case-insensitive)
    if username:
        username_lower = username.lower()
        password_lower = password.lower()
        if username_lower in password_lower:
            raise ValueError("Password cannot contain your username")
    
    # Check for email local part (before @) in password (case-insensitive)
    if email:
        email_local_part = email.split('@')[0].lower() if '@' in email else email.lower()
        password_lower = password.lower()
        if email_local_part and len(email_local_part) >= 3 and email_local_part in password_lower:
            raise ValueError("Password cannot contain your email address")
    
    # Denylist check
    common_passwords = {
        "password", "Password123", "123456", "123456789", "qwerty",
        "letmein", "admin", "welcome", "iloveyou", "abc123"
    }
    if password in common_passwords:
        raise ValueError("Password is too common. Please choose a stronger password.")
