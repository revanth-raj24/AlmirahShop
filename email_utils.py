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


def send_password_reset_email(to_email: str, reset_token: str, reset_url: str):
    """
    Send password reset email with reset link
    """
    if not SENDER_EMAIL or not APP_PASSWORD:
        error_msg = "Email credentials not configured. Please set SENDER_EMAIL and APP_PASSWORD in .env file."
        logger.error(error_msg)
        raise ValueError(error_msg)
    
    subject = "Password Reset Request - FastEcom"
    
    # HTML email template
    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body {{
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
            }}
            .container {{
                background-color: #f9f9f9;
                border-radius: 8px;
                padding: 30px;
                border: 1px solid #ddd;
            }}
            .button {{
                display: inline-block;
                padding: 12px 30px;
                background-color: #2C2C2C;
                color: #F5F5F0;
                text-decoration: none;
                border-radius: 4px;
                margin: 20px 0;
            }}
            .button:hover {{
                background-color: #8B7E74;
            }}
            .footer {{
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #ddd;
                font-size: 12px;
                color: #666;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <h2>Password Reset Request</h2>
            <p>Hello,</p>
            <p>We received a request to reset your password for your FastEcom account.</p>
            <p>Click the button below to reset your password. This link will expire in 15 minutes.</p>
            <a href="{reset_url}" class="button">Reset Password</a>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #666; font-size: 12px;">{reset_url}</p>
            <p>If you didn't request a password reset, please ignore this email. Your password will remain unchanged.</p>
            <div class="footer">
                <p>This is an automated message. Please do not reply to this email.</p>
                <p>&copy; 2024 FastEcom. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    # Plain text version
    text_body = f"""Password Reset Request - FastEcom

Hello,

We received a request to reset your password for your FastEcom account.

Click the link below to reset your password. This link will expire in 15 minutes.

{reset_url}

If you didn't request a password reset, please ignore this email. Your password will remain unchanged.

This is an automated message. Please do not reply to this email.
© 2024 FastEcom. All rights reserved.
"""
    
    try:
        msg = MIMEMultipart("alternative")
        msg["From"] = SENDER_EMAIL
        msg["To"] = to_email
        msg["Subject"] = subject

        # Attach both plain text and HTML versions
        msg.attach(MIMEText(text_body, "plain"))
        msg.attach(MIMEText(html_body, "html"))

        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(SENDER_EMAIL, APP_PASSWORD)
            server.send_message(msg)

        logger.info(f"✅ Password reset email sent successfully to {to_email}")
        return True

    except Exception as e:
        logger.error(f"❌ Error while sending password reset email: {e}")
        raise


def send_password_reset_success_email(to_email: str):
    """
    Send confirmation email after successful password reset
    """
    if not SENDER_EMAIL or not APP_PASSWORD:
        error_msg = "Email credentials not configured. Please set SENDER_EMAIL and APP_PASSWORD in .env file."
        logger.error(error_msg)
        raise ValueError(error_msg)
    
    subject = "Password Changed Successfully - FastEcom"
    
    # HTML email template
    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body {{
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
            }}
            .container {{
                background-color: #f9f9f9;
                border-radius: 8px;
                padding: 30px;
                border: 1px solid #ddd;
            }}
            .success-icon {{
                color: #10B981;
                font-size: 48px;
                text-align: center;
                margin: 20px 0;
            }}
            .footer {{
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #ddd;
                font-size: 12px;
                color: #666;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="success-icon">✓</div>
            <h2>Password Changed Successfully</h2>
            <p>Hello,</p>
            <p>Your password has been successfully changed for your FastEcom account.</p>
            <p>If you did not make this change, please contact our support team immediately.</p>
            <div class="footer">
                <p>This is an automated message. Please do not reply to this email.</p>
                <p>&copy; 2024 FastEcom. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    # Plain text version
    text_body = f"""Password Changed Successfully - FastEcom

Hello,

Your password has been successfully changed for your FastEcom account.

If you did not make this change, please contact our support team immediately.

This is an automated message. Please do not reply to this email.
© 2024 FastEcom. All rights reserved.
"""
    
    try:
        msg = MIMEMultipart("alternative")
        msg["From"] = SENDER_EMAIL
        msg["To"] = to_email
        msg["Subject"] = subject

        msg.attach(MIMEText(text_body, "plain"))
        msg.attach(MIMEText(html_body, "html"))

        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(SENDER_EMAIL, APP_PASSWORD)
            server.send_message(msg)

        logger.info(f"✅ Password reset success email sent to {to_email}")
        return True

    except Exception as e:
        logger.error(f"❌ Error while sending password reset success email: {e}")
        raise
