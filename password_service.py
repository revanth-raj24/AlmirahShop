"""
Password reset service for handling password reset tokens and validation
"""
import secrets
import logging
from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy.orm import Session
from models import User

logger = logging.getLogger("fastecom.password")

# Token expiration time: 15 minutes
RESET_TOKEN_EXPIRY_MINUTES = 15

# Rate limiting: 1 request per 60 seconds per email
RATE_LIMIT_SECONDS = 60


def generate_reset_token() -> str:
    """Generate a secure 64-character hexadecimal token"""
    return secrets.token_urlsafe(48)  # 48 bytes = 64 chars when URL-safe encoded


def create_reset_token(user: User, db: Session) -> str:
    """
    Create a new reset token for a user.
    Invalidates any existing token and creates a new one.
    """
    token = generate_reset_token()
    expires_at = datetime.utcnow() + timedelta(minutes=RESET_TOKEN_EXPIRY_MINUTES)
    
    user.reset_token = token
    user.reset_token_expires = expires_at
    db.commit()
    db.refresh(user)
    
    logger.info(f"Reset token created for user {user.email}, expires at {expires_at}")
    return token


def validate_reset_token(email: str, token: str, db: Session) -> Optional[User]:
    """
    Validate a reset token for a user.
    Returns the User if valid, None otherwise.
    """
    user = db.query(User).filter(User.email == email).first()
    
    if not user:
        logger.warning(f"Password reset attempt for non-existent email: {email}")
        return None
    
    if not user.reset_token or not user.reset_token_expires:
        logger.warning(f"Password reset attempt with no token for user: {email}")
        return None
    
    if user.reset_token != token:
        logger.warning(f"Password reset attempt with invalid token for user: {email}")
        return None
    
    if datetime.utcnow() > user.reset_token_expires:
        logger.warning(f"Password reset attempt with expired token for user: {email}")
        # Clear expired token
        user.reset_token = None
        user.reset_token_expires = None
        db.commit()
        return None
    
    logger.info(f"Reset token validated successfully for user: {email}")
    return user


def invalidate_reset_token(user: User, db: Session):
    """Invalidate a reset token after successful password reset"""
    user.reset_token = None
    user.reset_token_expires = None
    db.commit()
    logger.info(f"Reset token invalidated for user: {user.email}")


def check_rate_limit(email: str, db: Session) -> tuple[bool, Optional[datetime]]:
    """
    Check if a password reset request is within rate limits.
    Returns (is_allowed, next_allowed_time)
    """
    user = db.query(User).filter(User.email == email).first()
    
    if not user:
        # If user doesn't exist, we still allow the request (for security)
        return True, None
    
    if not user.reset_token_expires:
        # No previous token, allow request
        return True, None
    
    # Check if last token was created less than RATE_LIMIT_SECONDS ago
    # Calculate when the token was created (expires - expiry_minutes)
    token_created_at = user.reset_token_expires - timedelta(minutes=RESET_TOKEN_EXPIRY_MINUTES)
    time_since_last_token = (datetime.utcnow() - token_created_at).total_seconds()
    
    if time_since_last_token < RATE_LIMIT_SECONDS:
        next_allowed = token_created_at + timedelta(seconds=RATE_LIMIT_SECONDS)
        logger.warning(f"Rate limit exceeded for password reset: {email}, next allowed at {next_allowed}")
        return False, next_allowed
    
    return True, None

