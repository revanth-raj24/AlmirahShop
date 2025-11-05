import os
import smtplib
import random
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logger = logging.getLogger("fastecom.email")

# --- Configuration ---
# Load from environment variables, fallback to defaults
SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))  # TLS
SENDER_EMAIL = os.getenv("SENDER_EMAIL") or os.getenv("EMAIL_USER")
APP_PASSWORD = os.getenv("APP_PASSWORD") or os.getenv("EMAIL_PASS")


def generate_otp() -> str:
    """Generate 6-digit OTP"""
    return str(random.randint(100000, 999999))


def send_otp_email(to_email: str, otp: str):
    """
    Send OTP email - exact same logic as the working example
    """
    if not SENDER_EMAIL or not APP_PASSWORD:
        error_msg = "Email credentials not configured. Please set SENDER_EMAIL and APP_PASSWORD in .env file."
        logger.error(error_msg)
        raise ValueError(error_msg)
    
    subject = "Your OTP Verification Code - FastEcom"
    message = f"""Your OTP Verification Code - FastEcom

Your verification code is: {otp}

This code will expire in 10 minutes.

If you didn't request this code, please ignore this email."""
    
    try:
        # Create the email - exact same as working example
        msg = MIMEMultipart()
        msg["From"] = SENDER_EMAIL
        msg["To"] = to_email
        msg["Subject"] = subject

        msg.attach(MIMEText(message, "plain"))

        # Connect to Gmail SMTP - exact same as working example
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()  # Secure connection
            server.login(SENDER_EMAIL, APP_PASSWORD)
            server.send_message(msg)

        logger.info("✅ Email sent successfully!")
        return True

    except Exception as e:
        logger.error(f"❌ Error while sending email: {e}")
        raise
