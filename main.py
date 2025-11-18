from fastapi import FastAPI, Depends, HTTPException, status, Request, Form, UploadFile, File
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.responses import JSONResponse, HTMLResponse
from fastapi.openapi.docs import get_swagger_ui_html
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from datetime import timedelta, datetime
from database import Base, engine, SessionLocal
from models import Product as ProductModel, User, Order, OrderItem, CartItem, WishlistItem, Address, Review, ProductVariant
from schemas import ProductCreate, Product as ProductSchema, ProductListResponse, BulkProductCreate, BulkProductCreateResponse, UserCreate, UserResponse, UserDetailResponse, CartItemCreate, CartItemResponse, CartItemQuantityUpdate, OrderResponse, OrderItemResponse, WishlistItemResponse, VerifyOTPRequest, ResendOTPRequest, SellerCreate, SellerResponse, ForgotPasswordRequest, ResetPasswordRequest, AddressCreate, AddressUpdate, AddressResponse, ProfileResponse, ProfileUpdate, ChangePasswordRequest, SellerOrderItemResponse, SellerOrderItemListResponse, RejectOrderItemRequest, OverrideOrderItemStatusRequest, ProductWithSellerInfo, RejectProductRequest, ReturnRequestCreate, ReturnRejectRequest, ReturnOverrideRequest, ReturnItemResponse, ReturnListResponse, ReviewCreate, ReviewResponse, ProductDetailResponse, VariantCreate, VariantUpdate, VariantResponse, AdminProductResponse, ProductUpdate, SellerInfo
from auth_utils import hash_password, verify_password, create_access_token, get_current_user, get_current_user_obj, admin_only, seller_only, customer_only, validate_username, validate_password_strength
from fastapi import Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.exc import IntegrityError
from sqlalchemy import text, desc, or_, func
import logging
import os
import json
import uuid
from email_utils import generate_otp, send_otp_email, send_password_reset_email, send_password_reset_success_email
from password_service import create_reset_token, validate_reset_token, invalidate_reset_token, check_rate_limit

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("fastecom")

TAGS_METADATA = [
    {"name": "Products", "description": "Manage products catalog."},
    {"name": "Users", "description": "User registration and profile."},
    {"name": "Auth", "description": "Authentication endpoints."},
    {"name": "Cart", "description": "Shopping cart operations."},
    {"name": "Orders", "description": "Order creation and retrieval."},
    {"name": "Returns", "description": "Order return operations."},
    {"name": "Wishlist", "description": "Wishlist operations."},
    {"name": "Seller", "description": "Seller dashboard operations."},
    {"name": "Seller Orders", "description": "Seller order management."},
    {"name": "Seller Returns", "description": "Seller return management."},
    {"name": "Admin", "description": "Admin panel operations."},
    {"name": "Admin Returns", "description": "Admin return management."},
]

app = FastAPI(
    title="FastEcom API",
    description="Simple e-commerce API with auth, cart, and orders",
    version="1.0.0",
    openapi_tags=TAGS_METADATA,
    docs_url=None,  # Disable default docs to use custom
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

# Custom Swagger UI with alternative CDN (using unpkg.com instead of jsdelivr)
@app.get("/docs", include_in_schema=False)
async def custom_swagger_ui_html():
    return get_swagger_ui_html(
        openapi_url=app.openapi_url,
        title=app.title + " - Swagger UI",
        swagger_js_url="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui-bundle.js",
        swagger_css_url="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui.css",
        swagger_favicon_url="https://fastapi.tiangolo.com/img/favicon.png",
        swagger_ui_parameters={
            "persistAuthorization": True,
            "displayRequestDuration": True,
        }
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Create all tables in DB
Base.metadata.create_all(bind=engine)

# Safe migration: Add new verification columns if they don't exist
def migrate_verification_fields():
    """Safely add verification_status, verification_notes, submitted_at columns if they don't exist"""
    try:
        with engine.begin() as conn:  # Use begin() for automatic transaction management
            # Check if verification_status column exists
            result = conn.execute(text("PRAGMA table_info(products)"))
            columns = [row[1] for row in result]
            
            if "verification_status" not in columns:
                logger.info("Adding verification_status column to products table")
                conn.execute(text("ALTER TABLE products ADD COLUMN verification_status VARCHAR DEFAULT 'Pending'"))
                # Update existing products: if is_verified=True, set status=Approved, else Pending
                conn.execute(text("UPDATE products SET verification_status = CASE WHEN is_verified = 1 THEN 'Approved' ELSE 'Pending' END"))
            
            if "verification_notes" not in columns:
                logger.info("Adding verification_notes column to products table")
                conn.execute(text("ALTER TABLE products ADD COLUMN verification_notes TEXT"))
            
            if "submitted_at" not in columns:
                logger.info("Adding submitted_at column to products table")
                conn.execute(text("ALTER TABLE products ADD COLUMN submitted_at DATETIME"))
                # Set submitted_at to current time for existing products
                conn.execute(text("UPDATE products SET submitted_at = datetime('now') WHERE submitted_at IS NULL"))
                
            logger.info("Migration completed successfully")
    except Exception as e:
        logger.exception(f"Migration error: {e}")
        # Don't fail startup if migration fails - columns might already exist

# Safe migration: Add return fields to order_items if they don't exist
def migrate_return_fields():
    """Safely add return-related columns to order_items table if they don't exist"""
    try:
        with engine.begin() as conn:
            # Check if return_status column exists
            result = conn.execute(text("PRAGMA table_info(order_items)"))
            columns = [row[1] for row in result]
            
            if "return_status" not in columns:
                logger.info("Adding return_status column to order_items table")
                conn.execute(text("ALTER TABLE order_items ADD COLUMN return_status VARCHAR DEFAULT 'None'"))
                # Create index for return_status
                conn.execute(text("CREATE INDEX IF NOT EXISTS ix_order_items_return_status ON order_items(return_status)"))
            
            if "return_reason" not in columns:
                logger.info("Adding return_reason column to order_items table")
                conn.execute(text("ALTER TABLE order_items ADD COLUMN return_reason TEXT"))
            
            if "return_notes" not in columns:
                logger.info("Adding return_notes column to order_items table")
                conn.execute(text("ALTER TABLE order_items ADD COLUMN return_notes TEXT"))
            
            if "return_requested_at" not in columns:
                logger.info("Adding return_requested_at column to order_items table")
                conn.execute(text("ALTER TABLE order_items ADD COLUMN return_requested_at DATETIME"))
            
            if "return_processed_at" not in columns:
                logger.info("Adding return_processed_at column to order_items table")
                conn.execute(text("ALTER TABLE order_items ADD COLUMN return_processed_at DATETIME"))
            
            if "is_return_eligible" not in columns:
                logger.info("Adding is_return_eligible column to order_items table")
                conn.execute(text("ALTER TABLE order_items ADD COLUMN is_return_eligible BOOLEAN DEFAULT 1"))
                # Set existing items as eligible by default
                conn.execute(text("UPDATE order_items SET is_return_eligible = 1 WHERE is_return_eligible IS NULL"))
            
            logger.info("Return fields migration completed successfully")
    except Exception as e:
        logger.exception(f"Return fields migration error: {e}")
        # Don't fail startup if migration fails - columns might already exist

# Safe migration: Add product detail fields if they don't exist
def migrate_product_detail_fields():
    """Safely add new product detail columns if they don't exist"""
    try:
        with engine.begin() as conn:
            result = conn.execute(text("PRAGMA table_info(products)"))
            columns = [row[1] for row in result]
            
            if "sizes" not in columns:
                logger.info("Adding sizes column to products table")
                conn.execute(text("ALTER TABLE products ADD COLUMN sizes TEXT"))
            
            if "colors" not in columns:
                logger.info("Adding colors column to products table")
                conn.execute(text("ALTER TABLE products ADD COLUMN colors TEXT"))
            
            if "variants" not in columns:
                logger.info("Adding variants column to products table")
                conn.execute(text("ALTER TABLE products ADD COLUMN variants TEXT"))
            
            if "size_fit" not in columns:
                logger.info("Adding size_fit column to products table")
                conn.execute(text("ALTER TABLE products ADD COLUMN size_fit TEXT"))
            
            if "material_care" not in columns:
                logger.info("Adding material_care column to products table")
                conn.execute(text("ALTER TABLE products ADD COLUMN material_care TEXT"))
            
            if "specifications" not in columns:
                logger.info("Adding specifications column to products table")
                conn.execute(text("ALTER TABLE products ADD COLUMN specifications TEXT"))
            
            logger.info("Product detail fields migration completed successfully")
    except Exception as e:
        logger.exception(f"Product detail fields migration error: {e}")

# Safe migration: Add size and color to cart_items if they don't exist
def migrate_cart_item_fields():
    """Safely add size and color columns to cart_items table if they don't exist"""
    try:
        with engine.begin() as conn:
            result = conn.execute(text("PRAGMA table_info(cart_items)"))
            columns = [row[1] for row in result]
            
            if "size" not in columns:
                logger.info("Adding size column to cart_items table")
                conn.execute(text("ALTER TABLE cart_items ADD COLUMN size TEXT"))
            
            if "color" not in columns:
                logger.info("Adding color column to cart_items table")
                conn.execute(text("ALTER TABLE cart_items ADD COLUMN color TEXT"))
            
            logger.info("Cart item fields migration completed successfully")
    except Exception as e:
        logger.exception(f"Cart item fields migration error: {e}")

# Safe migration: Create reviews table if it doesn't exist
def migrate_reviews_table():
    """Safely create reviews table if it doesn't exist"""
    try:
        with engine.begin() as conn:
            # Check if reviews table exists
            result = conn.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name='reviews'"))
            if not result.fetchone():
                logger.info("Creating reviews table")
                # Create reviews table
                conn.execute(text("""
                    CREATE TABLE reviews (
                        id INTEGER PRIMARY KEY,
                        product_id INTEGER NOT NULL,
                        user_id INTEGER NOT NULL,
                        rating INTEGER NOT NULL,
                        review_text TEXT,
                        created_at DATETIME,
                        FOREIGN KEY(product_id) REFERENCES products(id),
                        FOREIGN KEY(user_id) REFERENCES users(id)
                    )
                """))
                # Create indexes
                conn.execute(text("CREATE INDEX IF NOT EXISTS ix_reviews_product_id ON reviews(product_id)"))
                conn.execute(text("CREATE INDEX IF NOT EXISTS ix_reviews_user_id ON reviews(user_id)"))
                logger.info("Reviews table created successfully")
    except Exception as e:
        logger.exception(f"Reviews table migration error: {e}")

# Safe migration: Create product_variants table if it doesn't exist
def migrate_product_variants_table():
    """Safely create product_variants table if it doesn't exist"""
    try:
        with engine.begin() as conn:
            # Check if product_variants table exists
            result = conn.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name='product_variants'"))
            if not result.fetchone():
                logger.info("Creating product_variants table")
                conn.execute(text("""
                    CREATE TABLE product_variants (
                        id INTEGER PRIMARY KEY,
                        product_id INTEGER NOT NULL,
                        size TEXT,
                        color TEXT,
                        image_url TEXT,
                        price REAL,
                        stock INTEGER DEFAULT 0,
                        created_at DATETIME,
                        updated_at DATETIME,
                        FOREIGN KEY(product_id) REFERENCES products(id)
                    )
                """))
                # Create indexes
                conn.execute(text("CREATE INDEX IF NOT EXISTS ix_product_variants_product_id ON product_variants(product_id)"))
                logger.info("Product variants table created successfully")
    except Exception as e:
        logger.exception(f"Product variants table migration error: {e}")

# Safe migration: Add variant_id to cart_items and order_items
def migrate_variant_id_fields():
    """Safely add variant_id columns to cart_items and order_items if they don't exist"""
    try:
        with engine.begin() as conn:
            # Check cart_items columns
            result = conn.execute(text("PRAGMA table_info(cart_items)"))
            cart_columns = [row[1] for row in result]
            
            if "variant_id" not in cart_columns:
                logger.info("Adding variant_id column to cart_items table")
                conn.execute(text("ALTER TABLE cart_items ADD COLUMN variant_id INTEGER"))
                conn.execute(text("CREATE INDEX IF NOT EXISTS ix_cart_items_variant_id ON cart_items(variant_id)"))
            
            # Check order_items columns
            result = conn.execute(text("PRAGMA table_info(order_items)"))
            order_columns = [row[1] for row in result]
            
            if "variant_id" not in order_columns:
                logger.info("Adding variant_id column to order_items table")
                conn.execute(text("ALTER TABLE order_items ADD COLUMN variant_id INTEGER"))
                conn.execute(text("CREATE INDEX IF NOT EXISTS ix_order_items_variant_id ON order_items(variant_id)"))
            
            if "variant_size" not in order_columns:
                logger.info("Adding variant_size column to order_items table")
                conn.execute(text("ALTER TABLE order_items ADD COLUMN variant_size TEXT"))
            
            if "variant_color" not in order_columns:
                logger.info("Adding variant_color column to order_items table")
                conn.execute(text("ALTER TABLE order_items ADD COLUMN variant_color TEXT"))
            
            if "variant_image_url" not in order_columns:
                logger.info("Adding variant_image_url column to order_items table")
                conn.execute(text("ALTER TABLE order_items ADD COLUMN variant_image_url TEXT"))
            
            logger.info("Variant ID fields migration completed successfully")
    except Exception as e:
        logger.exception(f"Variant ID fields migration error: {e}")

# Run migrations on startup
migrate_verification_fields()
migrate_return_fields()
migrate_product_detail_fields()
migrate_cart_item_fields()
migrate_reviews_table()
migrate_product_variants_table()
migrate_variant_id_fields()

# Static file serving for uploads
UPLOADS_DIR = "uploads"
os.makedirs(UPLOADS_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")

# Static file serving for images (from boltfrontend/public/images)
IMAGES_DIR = "boltfrontend/public/images"
if os.path.exists(IMAGES_DIR):
    app.mount("/images", StaticFiles(directory=IMAGES_DIR), name="images")

# Backend base URL for image normalization (configurable via env)
BACKEND_BASE_URL = os.getenv("BACKEND_BASE_URL", "http://127.0.0.1:8000")

def normalize_image_url(image_url: str | None) -> str | None:
    """Normalize product image URL to absolute URL if needed"""
    if not image_url:
        return None
    # If already absolute URL, return as is
    if image_url.startswith("http://") or image_url.startswith("https://"):
        return image_url
    # If starts with /images, return as is (frontend public folder - Vite will serve it)
    if image_url.startswith("/images"):
        return image_url
    # If starts with /uploads, make it absolute (backend served)
    if image_url.startswith("/uploads"):
        return f"{BACKEND_BASE_URL}{image_url}"
    # Otherwise, assume it's a filename - try /images first (public folder), then /uploads (backend)
    clean_filename = image_url.lstrip('/')
    # If it contains a path separator, return as is
    if '/' in clean_filename:
        return image_url if image_url.startswith('/') else f"/{image_url}"
    # Just a filename, assume it's in /images (public folder)
    return f"/images/{clean_filename}"

# Global exception handler to ensure CORS headers on errors
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "*",
        }
    )

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception(f"Unhandled exception: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc)},
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "*",
        }
    )

# Lightweight migration: add missing columns to products and backfill defaults
def ensure_product_columns():
    with engine.connect() as conn:
        # discover existing columns
        result = conn.execute(text("PRAGMA table_info(products)"))
        existing = {row[1] for row in result.fetchall()}
        to_add = []
        if 'gender' not in existing:
            to_add.append("ALTER TABLE products ADD COLUMN gender TEXT")
        if 'category' not in existing:
            to_add.append("ALTER TABLE products ADD COLUMN category TEXT")
        for stmt in to_add:
            try:
                conn.execute(text(stmt))
            except Exception:
                # if already exists due to race, ignore
                pass
        # backfill defaults for NULLs
        try:
            conn.execute(text("UPDATE products SET gender = COALESCE(gender, 'unisex')"))
            conn.execute(text("UPDATE products SET category = COALESCE(category, 'general')"))
        except Exception:
            logger.exception("Backfill failed for products gender/category")

ensure_product_columns()

# Lightweight migration: add missing columns to users table for OTP verification
def ensure_user_otp_columns():
    try:
        with engine.begin() as conn:
            # Check if users table exists
            result = conn.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name='users'"))
            if not result.fetchone():
                logger.info("Users table does not exist yet, will be created by Base.metadata.create_all()")
                return
            
            # discover existing columns
            result = conn.execute(text("PRAGMA table_info(users)"))
            existing = {row[1] for row in result.fetchall()}
            to_add = []
            if 'is_active' not in existing:
                to_add.append("ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT 0")
            if 'otp' not in existing:
                to_add.append("ALTER TABLE users ADD COLUMN otp TEXT")
            if 'otp_expiry' not in existing:
                to_add.append("ALTER TABLE users ADD COLUMN otp_expiry DATETIME")
            for stmt in to_add:
                try:
                    conn.execute(text(stmt))
                    logger.info(f"Added column to users table: {stmt}")
                except Exception as e:
                    # if already exists due to race, ignore
                    logger.warning(f"Column might already exist: {e}")
                    pass
    except Exception as e:
        logger.exception(f"Error during user OTP columns migration: {e}")

ensure_user_otp_columns()

# Migration: Add role and is_approved to users, seller_id and is_verified to products
def ensure_role_columns():
    try:
        with engine.begin() as conn:
            # Check if users table exists
            result = conn.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name='users'"))
            if not result.fetchone():
                logger.info("Users table does not exist yet, will be created by Base.metadata.create_all()")
                return
            
            # Check existing columns in users table
            result = conn.execute(text("PRAGMA table_info(users)"))
            existing_users = {row[1] for row in result.fetchall()}
            
            if 'role' not in existing_users:
                conn.execute(text("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'customer'"))
                logger.info("Added role column to users table")
                # Backfill existing users with 'customer' role
                conn.execute(text("UPDATE users SET role = 'customer' WHERE role IS NULL"))
            
            if 'is_approved' not in existing_users:
                conn.execute(text("ALTER TABLE users ADD COLUMN is_approved BOOLEAN DEFAULT 0"))
                logger.info("Added is_approved column to users table")
            
            # Check existing columns in products table
            result = conn.execute(text("PRAGMA table_info(products)"))
            existing_products = {row[1] for row in result.fetchall()}
            
            if 'seller_id' not in existing_products:
                conn.execute(text("ALTER TABLE products ADD COLUMN seller_id INTEGER"))
                logger.info("Added seller_id column to products table")
            
            if 'is_verified' not in existing_products:
                conn.execute(text("ALTER TABLE products ADD COLUMN is_verified BOOLEAN DEFAULT 0"))
                logger.info("Added is_verified column to products table")
                # Backfill existing products as verified (for backward compatibility)
                conn.execute(text("UPDATE products SET is_verified = 1 WHERE is_verified IS NULL"))
    except Exception as e:
        logger.exception(f"Error during role columns migration: {e}")

ensure_role_columns()

# Lightweight migration: add missing columns to order_items and orders tables
def ensure_order_seller_columns():
    try:
        with engine.begin() as conn:
            # Check if order_items table exists
            result = conn.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name='order_items'"))
            if not result.fetchone():
                logger.info("order_items table does not exist yet, will be created by Base.metadata.create_all()")
            else:
                # discover existing columns in order_items
                result = conn.execute(text("PRAGMA table_info(order_items)"))
                existing = {row[1] for row in result.fetchall()}
                to_add = []
                if 'seller_id' not in existing:
                    to_add.append("ALTER TABLE order_items ADD COLUMN seller_id INTEGER")
                if 'status' not in existing:
                    to_add.append("ALTER TABLE order_items ADD COLUMN status TEXT DEFAULT 'Pending'")
                if 'rejection_reason' not in existing:
                    to_add.append("ALTER TABLE order_items ADD COLUMN rejection_reason TEXT")
                for stmt in to_add:
                    try:
                        conn.execute(text(stmt))
                        logger.info(f"Added column to order_items table: {stmt}")
                    except Exception as e:
                        logger.warning(f"Failed to add column to order_items: {e}")
                
                # Create index on seller_id if column was added
                if 'seller_id' not in existing:
                    try:
                        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_order_items_seller_id ON order_items(seller_id)"))
                    except Exception:
                        pass
                if 'status' not in existing:
                    try:
                        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_order_items_status ON order_items(status)"))
                    except Exception:
                        pass
            
            # Check if orders table exists
            result = conn.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name='orders'"))
            if not result.fetchone():
                logger.info("orders table does not exist yet, will be created by Base.metadata.create_all()")
            else:
                # discover existing columns in orders
                result = conn.execute(text("PRAGMA table_info(orders)"))
                existing = {row[1] for row in result.fetchall()}
                to_add = []
                if 'ship_name' not in existing:
                    to_add.append("ALTER TABLE orders ADD COLUMN ship_name TEXT")
                if 'ship_phone' not in existing:
                    to_add.append("ALTER TABLE orders ADD COLUMN ship_phone TEXT")
                if 'ship_address_line1' not in existing:
                    to_add.append("ALTER TABLE orders ADD COLUMN ship_address_line1 TEXT")
                if 'ship_address_line2' not in existing:
                    to_add.append("ALTER TABLE orders ADD COLUMN ship_address_line2 TEXT")
                if 'ship_city' not in existing:
                    to_add.append("ALTER TABLE orders ADD COLUMN ship_city TEXT")
                if 'ship_state' not in existing:
                    to_add.append("ALTER TABLE orders ADD COLUMN ship_state TEXT")
                if 'ship_country' not in existing:
                    to_add.append("ALTER TABLE orders ADD COLUMN ship_country TEXT")
                if 'ship_pincode' not in existing:
                    to_add.append("ALTER TABLE orders ADD COLUMN ship_pincode TEXT")
                if 'ordered_at' not in existing:
                    to_add.append("ALTER TABLE orders ADD COLUMN ordered_at DATETIME")
                for stmt in to_add:
                    try:
                        conn.execute(text(stmt))
                        logger.info(f"Added column to orders table: {stmt}")
                    except Exception as e:
                        logger.warning(f"Failed to add column to orders: {e}")
    except Exception as e:
        logger.exception(f"Migration ensure_order_seller_columns failed: {e}")

ensure_order_seller_columns()

# Migration: Add reset_token and reset_token_expires to users table
def ensure_reset_token_columns():
    try:
        with engine.begin() as conn:
            # Check if users table exists
            result = conn.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name='users'"))
            if not result.fetchone():
                logger.info("Users table does not exist yet, will be created by Base.metadata.create_all()")
                return
            
            # Check existing columns in users table
            result = conn.execute(text("PRAGMA table_info(users)"))
            existing = {row[1] for row in result.fetchall()}
            
            if 'reset_token' not in existing:
                conn.execute(text("ALTER TABLE users ADD COLUMN reset_token TEXT"))
                logger.info("Added reset_token column to users table")
            
            if 'reset_token_expires' not in existing:
                conn.execute(text("ALTER TABLE users ADD COLUMN reset_token_expires DATETIME"))
                logger.info("Added reset_token_expires column to users table")
            
            # Create index on reset_token for faster lookups
            try:
                conn.execute(text("CREATE INDEX IF NOT EXISTS idx_users_reset_token ON users(reset_token)"))
            except Exception:
                pass  # Index might already exist
    except Exception as e:
        logger.exception(f"Error during reset token columns migration: {e}")

ensure_reset_token_columns()

# Migration: Add has_address to users, delivery_address to orders, and create addresses table
def ensure_address_columns():
    try:
        with engine.begin() as conn:
            # Check if users table exists
            result = conn.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name='users'"))
            if not result.fetchone():
                logger.info("Users table does not exist yet, will be created by Base.metadata.create_all()")
                return
            
            # Check existing columns in users table
            result = conn.execute(text("PRAGMA table_info(users)"))
            existing_users = {row[1] for row in result.fetchall()}
            
            if 'has_address' not in existing_users:
                conn.execute(text("ALTER TABLE users ADD COLUMN has_address BOOLEAN DEFAULT 0"))
                logger.info("Added has_address column to users table")
            
            # Check existing columns in orders table
            result = conn.execute(text("PRAGMA table_info(orders)"))
            existing_orders = {row[1] for row in result.fetchall()}
            
            if 'delivery_address' not in existing_orders:
                conn.execute(text("ALTER TABLE orders ADD COLUMN delivery_address TEXT"))
                logger.info("Added delivery_address column to orders table")
            
            # Check if addresses table exists
            result = conn.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name='addresses'"))
            if not result.fetchone():
                logger.info("Addresses table will be created by Base.metadata.create_all()")
    except Exception as e:
        logger.exception(f"Error during address columns migration: {e}")

ensure_address_columns()

# Migration: Add gender and dob to users table
def ensure_profile_columns():
    try:
        with engine.begin() as conn:
            # Check if users table exists
            result = conn.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name='users'"))
            if not result.fetchone():
                logger.info("Users table does not exist yet, will be created by Base.metadata.create_all()")
                return
            
            # Check existing columns in users table
            result = conn.execute(text("PRAGMA table_info(users)"))
            existing = {row[1] for row in result.fetchall()}
            
            if 'gender' not in existing:
                conn.execute(text("ALTER TABLE users ADD COLUMN gender TEXT"))
                logger.info("Added gender column to users table")
            
            if 'dob' not in existing:
                conn.execute(text("ALTER TABLE users ADD COLUMN dob DATETIME"))
                logger.info("Added dob column to users table")
    except Exception as e:
        logger.exception(f"Error during profile columns migration: {e}")

ensure_profile_columns()

# Dependency to get DB session (imported from database.py)
from database import get_db

# Handle CORS preflight requests
@app.options("/{full_path:path}")
async def options_handler(request: Request, full_path: str):
    return JSONResponse(
        content={},
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "*",
            "Access-Control-Max-Age": "3600",
        }
    )

# Create Product
@app.post("/products", response_model=ProductSchema, tags=["Products"])
def create_product(product: ProductCreate, db: Session = Depends(get_db)):
    product_data = product.model_dump()
    # Serialize JSON fields
    if 'sizes' in product_data and product_data['sizes']:
        product_data['sizes'] = serialize_json_field(product_data['sizes'])
    if 'colors' in product_data and product_data['colors']:
        product_data['colors'] = serialize_json_field(product_data['colors'])
    if 'variants' in product_data and product_data['variants']:
        product_data['variants'] = serialize_json_field(product_data['variants'])
    if 'specifications' in product_data and product_data['specifications']:
        product_data['specifications'] = serialize_json_field(product_data['specifications'])
    
    new_product = ProductModel(**product_data)
    db.add(new_product)
    db.commit()
    db.refresh(new_product)
    normalize_product_gender(new_product, db)
    return new_product

# Get All Products
@app.get("/products", response_model=list[ProductSchema], tags=["Products"])
def get_products(
    db: Session = Depends(get_db),
    gender: str | None = Query(None, description="Filter by gender: men/women/unisex")
):
    try:
        query = db.query(ProductModel)
        # Only show approved products to customers
        query = query.filter(ProductModel.verification_status == "Approved")
        # Only filter by gender if explicitly provided and valid
        if gender and isinstance(gender, str) and gender.strip() and gender.lower() in ['men', 'women', 'unisex']:
            gender_lower = gender.lower()
            # Include unisex products when filtering by men or women
            if gender_lower == 'men':
                # Show men products AND unisex products (case-insensitive)
                query = query.filter(
                    (func.lower(ProductModel.gender) == 'men') |
                    (func.lower(ProductModel.gender) == 'unisex')
                )
            elif gender_lower == 'women':
                # Show women products AND unisex products (case-insensitive)
                query = query.filter(
                    (func.lower(ProductModel.gender) == 'women') |
                    (func.lower(ProductModel.gender) == 'unisex')
                )
            else:  # unisex
                # Show only unisex products (case-insensitive)
                query = query.filter(func.lower(ProductModel.gender) == 'unisex')
        # When no gender filter, show ALL verified products
        items = query.order_by(ProductModel.id.desc()).all()
        # Normalize gender values to lowercase for Pydantic validation (load variants if needed)
        normalized_items = []
        for item in items:
            try:
                normalized = normalize_product_gender(item, db)
                normalized_items.append(normalized)
            except Exception as e:
                logger.error(f"Error normalizing product {item.id}: {e}")
                logger.exception(f"Full traceback for product {item.id}")
                # Skip this product but continue with others
                continue
        return normalized_items
    except Exception as e:
        logger.exception(f"Failed to fetch products: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch products: {str(e)}")

def serialize_json_field(value):
    """Serialize Python object to JSON string for database storage"""
    if value is None:
        return None
    if isinstance(value, str):
        return value  # Already a string
    return json.dumps(value)

def deserialize_json_field(value):
    """Deserialize JSON string from database to Python object"""
    if value is None or value == "":
        return None
    if isinstance(value, str):
        try:
            parsed = json.loads(value)
            # Return the parsed value (could be list, dict, or other JSON types)
            return parsed
        except (json.JSONDecodeError, TypeError) as e:
            logger.warning(f"Failed to deserialize JSON field: {value}, error: {e}")
            return None  # Return None instead of the raw string for invalid JSON
    # If already a Python object (list, dict, etc.), return as-is
    return value

def normalize_product_gender(product, db: Session = None):
    """Normalize product gender to lowercase for Pydantic validation"""
    try:
        # Normalize gender
        if hasattr(product, 'gender') and product.gender:
            product.gender = product.gender.lower() if product.gender.lower() in ['men', 'women', 'unisex'] else None

        # Normalize image URL
        if hasattr(product, 'image_url') and product.image_url:
            product.image_url = normalize_image_url(product.image_url)

        # Normalize sizes (JSON column) - keep empty lists as empty lists, not None
        if hasattr(product, 'sizes'):
            if product.sizes:
                sizes_list = deserialize_json_field(product.sizes)
                # Keep empty lists as empty lists for schema compatibility
                product.sizes = sizes_list if isinstance(sizes_list, list) else None
            else:
                product.sizes = None

        # Normalize colors (JSON column) - keep empty lists as empty lists, not None
        if hasattr(product, 'colors'):
            if product.colors:
                colors_list = deserialize_json_field(product.colors)
                # Keep empty lists as empty lists for schema compatibility
                product.colors = colors_list if isinstance(colors_list, list) else None
            else:
                product.colors = None

        # Normalize legacy_variants (JSON column) - keep empty dicts as empty dicts, not None
        # Note: The column is named 'legacy_variants' in the model to avoid conflict with 'variants' relationship
        if hasattr(product, 'legacy_variants'):
            try:
                raw = getattr(product, 'legacy_variants', None)
                if raw:
                    parsed = deserialize_json_field(raw)
                    # Keep empty dicts as empty dicts for schema compatibility
                    setattr(product, 'legacy_variants', parsed if isinstance(parsed, dict) else None)
                else:
                    setattr(product, 'legacy_variants', None)
            except Exception as e:
                logger.warning(f"Error normalizing legacy_variants for product {getattr(product, 'id', 'unknown')}: {e}")
                setattr(product, 'legacy_variants', None)

        # Normalize specifications (JSON column) - keep empty dicts as empty dicts, not None
        if hasattr(product, 'specifications'):
            if product.specifications:
                specs_dict = deserialize_json_field(product.specifications)
                # Keep empty dicts as empty dicts for schema compatibility
                product.specifications = specs_dict if isinstance(specs_dict, dict) else None
            else:
                product.specifications = None

        # Load product variants (actual relationship)
        if db and hasattr(product, 'id'):
            variants = db.query(ProductVariant).filter(
                ProductVariant.product_id == product.id
            ).all()

            for variant in variants:
                if variant.image_url:
                    variant.image_url = normalize_image_url(variant.image_url)

            product.product_variants = variants

        return product
    except Exception as e:
        product_id = getattr(product, 'id', 'unknown')
        logger.error(f"Error in normalize_product_gender for product {product_id}: {e}")
        logger.exception(f"Full traceback for product {product_id}")
        # Return product as-is if normalization fails (better than crashing)
        return product


@app.get("/products/paginated", response_model=ProductListResponse, tags=["Products"])
def get_products_paginated(
    page: int = Query(1, ge=1),
    page_size: int = Query(12, ge=1, le=60),
    gender: str | None = Query(None, description="Filter by gender: men/women/unisex"),
    db: Session = Depends(get_db)
):
    try:
        base = db.query(ProductModel)
        # Only show approved products to customers
        base = base.filter(ProductModel.verification_status == "Approved")
        # Only filter by gender if explicitly provided and not empty
        if gender and isinstance(gender, str) and gender.strip() and gender.lower() in ['men', 'women', 'unisex']:
            gender_lower = gender.lower()
            # Include unisex products when filtering by men or women
            if gender_lower == 'men':
                # Show men products AND unisex products (case-insensitive)
                base = base.filter(
                    (func.lower(ProductModel.gender) == 'men') |
                    (func.lower(ProductModel.gender) == 'unisex')
                )
            elif gender_lower == 'women':
                # Show women products AND unisex products (case-insensitive)
                base = base.filter(
                    (func.lower(ProductModel.gender) == 'women') |
                    (func.lower(ProductModel.gender) == 'unisex')
                )
            else:  # unisex
                # Show only unisex products (case-insensitive)
                base = base.filter(func.lower(ProductModel.gender) == 'unisex')
        # When no gender filter, show ALL verified products regardless of gender value
        total = base.count()
        logger.info(f"Fetching products: page={page}, page_size={page_size}, gender={gender}, total={total}")
        offset = (page - 1) * page_size
        items = base.order_by(ProductModel.id.desc()).limit(page_size).offset(offset).all()
        # Normalize gender values to lowercase for Pydantic validation (load variants if needed)
        items = [normalize_product_gender(item, db) for item in items]
        logger.info(f"Returning {len(items)} products")
        return {"items": items, "total": total, "page": page, "page_size": page_size}
    except Exception as e:
        logger.exception("Failed to fetch paginated products")
        raise HTTPException(status_code=500, detail=f"Failed to fetch products: {str(e)}")

@app.get("/products/search", response_model=list[ProductSchema], tags=["Products"])
def search_products(
    name: str | None = Query(None, description="Search by name"),
    min_price: float | None = Query(None, description="Minimum price"),
    max_price: float | None = Query(None, description="Maximum price"),
    gender: str | None = Query(None, description="Filter by gender: men/women/unisex"),
    db: Session = Depends(get_db)
):
    query = db.query(ProductModel)
    # Only show approved products to customers
    query = query.filter(ProductModel.verification_status == "Approved")

    if name:
        query = query.filter(ProductModel.name.ilike(f"%{name}%"))
    if min_price is not None:
        query = query.filter(ProductModel.price >= min_price)
    if max_price is not None:
        query = query.filter(ProductModel.price <= max_price)
    # Only filter by gender if explicitly provided and valid
    if gender and isinstance(gender, str) and gender.strip() and gender.lower() in ['men', 'women', 'unisex']:
        gender_lower = gender.lower()
        # Include unisex products when filtering by men or women
        if gender_lower == 'men':
            # Show men products AND unisex products
            query = query.filter(
                (ProductModel.gender.in_(['men', 'Men', 'MEN'])) |
                (ProductModel.gender.in_(['unisex', 'Unisex', 'UNISEX']))
            )
        elif gender_lower == 'women':
            # Show women products AND unisex products
            query = query.filter(
                (ProductModel.gender.in_(['women', 'Women', 'WOMEN'])) |
                (ProductModel.gender.in_(['unisex', 'Unisex', 'UNISEX']))
            )
        else:  # unisex
            # Show only unisex products
            query = query.filter(
                ProductModel.gender.in_(['unisex', 'Unisex', 'UNISEX'])
            )

    results = query.order_by(ProductModel.id.desc()).all()
    # Normalize gender values to lowercase for Pydantic validation (load variants if needed)
    results = [normalize_product_gender(item, db) for item in results]
    return results

@app.get("/products/{product_id}", response_model=ProductSchema, tags=["Products"])
def get_product(product_id: int, db: Session = Depends(get_db)):
    product = db.query(ProductModel).filter(
        ProductModel.id == product_id,
        ProductModel.verification_status == "Approved"
    ).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Calculate average rating and total reviews
    reviews_query = db.query(Review).filter(Review.product_id == product_id)
    total_reviews = reviews_query.count()
    if total_reviews > 0:
        avg_rating = db.query(func.avg(Review.rating)).filter(Review.product_id == product_id).scalar()
        product.average_rating = round(float(avg_rating), 2) if avg_rating else None
    else:
        product.average_rating = None
    product.total_reviews = total_reviews
    
    # Normalize gender value to lowercase for Pydantic validation (this will also load variants)
    normalize_product_gender(product, db)
    return product

# Get Product Reviews
@app.get("/products/{product_id}/reviews", response_model=list[ReviewResponse], tags=["Products"])
def get_product_reviews(product_id: int, db: Session = Depends(get_db)):
    """Get all reviews for a product"""
    product = db.query(ProductModel).filter(ProductModel.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    reviews = db.query(Review).filter(Review.product_id == product_id).order_by(Review.created_at.desc()).all()
    result = []
    for review in reviews:
        user = db.query(User).filter(User.id == review.user_id).first()
        review_dict = {
            "id": review.id,
            "product_id": review.product_id,
            "user_id": review.user_id,
            "rating": review.rating,
            "review_text": review.review_text,
            "created_at": review.created_at,
            "user_username": user.username if user else None
        }
        result.append(review_dict)
    return result

# Create Product Review
@app.post("/products/{product_id}/reviews", response_model=ReviewResponse, tags=["Products"])
def create_product_review(
    product_id: int,
    review: ReviewCreate,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    """Create a review for a product (authenticated users only)"""
    # Validate rating
    if review.rating < 1 or review.rating > 5:
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")
    
    # Check if product exists
    product = db.query(ProductModel).filter(ProductModel.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Find user
    user = db.query(User).filter(User.username == current_user).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if user already reviewed this product
    existing_review = db.query(Review).filter(
        Review.product_id == product_id,
        Review.user_id == user.id
    ).first()
    if existing_review:
        raise HTTPException(status_code=400, detail="You have already reviewed this product")
    
    # Create review
    new_review = Review(
        product_id=product_id,
        user_id=user.id,
        rating=review.rating,
        review_text=review.review_text
    )
    db.add(new_review)
    db.commit()
    db.refresh(new_review)
    
    return {
        "id": new_review.id,
        "product_id": new_review.product_id,
        "user_id": new_review.user_id,
        "rating": new_review.rating,
        "review_text": new_review.review_text,
        "created_at": new_review.created_at,
        "user_username": user.username
    }

# Get Similar Products
@app.get("/products/{product_id}/similar", response_model=list[ProductSchema], tags=["Products"])
def get_similar_products(product_id: int, limit: int = Query(12, ge=1, le=20), db: Session = Depends(get_db)):
    """Get similar products based on category, gender, or price range"""
    product = db.query(ProductModel).filter(ProductModel.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Build query for similar products
    query = db.query(ProductModel).filter(
        ProductModel.id != product_id,
        ProductModel.verification_status == "Approved"
    )
    
    similar_products = []
    
    # Priority 1: Same category
    if product.category:
        category_products = query.filter(ProductModel.category == product.category).limit(limit).all()
        similar_products.extend(category_products)
    
    # Priority 2: Same gender (if we need more)
    if len(similar_products) < limit and product.gender:
        existing_ids = [p.id for p in similar_products]
        gender_query = query.filter(ProductModel.gender == product.gender)
        if existing_ids:
            gender_query = gender_query.filter(~ProductModel.id.in_(existing_ids))
        gender_products = gender_query.limit(limit - len(similar_products)).all()
        similar_products.extend(gender_products)
    
    # Priority 3: Price range ±20% (if we still need more)
    if len(similar_products) < limit:
        price_min = product.price * 0.8
        price_max = product.price * 1.2
        existing_ids = [p.id for p in similar_products]
        price_query = query.filter(
            ProductModel.price >= price_min,
            ProductModel.price <= price_max
        )
        if existing_ids:
            price_query = price_query.filter(~ProductModel.id.in_(existing_ids))
        price_products = price_query.limit(limit - len(similar_products)).all()
        similar_products.extend(price_products)
    
    # Normalize products (load variants if needed)
    similar_products = [normalize_product_gender(p, db) for p in similar_products[:limit]]
    return similar_products

# Delete Product
@app.delete("/products/{product_id}", tags=["Products"])
def delete_product(product_id: int, db: Session = Depends(get_db)):
    product = db.query(ProductModel).filter(ProductModel.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Remove related cart items referencing this product to avoid FK issues
    db.query(CartItem).filter(CartItem.product_id == product_id).delete()

    db.delete(product)
    db.commit()
    return {"message": "Product deleted successfully"}

# Register User (OTP-enabled)
@app.post("/users/signup", tags=["Users"])
def create_user(user: UserCreate, db: Session = Depends(get_db)):
    logger.info("Signup attempt: username=%s email=%s phone_present=%s", user.username, user.email, bool(user.phone))
    try:
        # Validate username and password BEFORE checking uniqueness
        try:
            validate_username(user.username)
            validate_password_strength(user.password, username=user.username, email=user.email)
        except ValueError as e:
            logger.info("Signup rejected: validation failed: %s", str(e))
            raise HTTPException(status_code=400, detail=str(e))
        
        # Normalize phone: treat empty strings as None
        normalized_phone = None
        if user.phone is not None:
            stripped = user.phone.strip()
            if stripped:
                normalized_phone = stripped

        # Ensure unique username/email/phone
        if db.query(User).filter(User.username == user.username).first():
            logger.info("Signup rejected: username already exists: %s", user.username)
            raise HTTPException(status_code=400, detail="Username already registered")
        if db.query(User).filter(User.email == user.email).first():
            logger.info("Signup rejected: email already exists: %s", user.email)
            raise HTTPException(status_code=400, detail="Email already registered")
        if normalized_phone and db.query(User).filter(User.phone == normalized_phone).first():
            logger.info("Signup rejected: phone already exists: %s", normalized_phone)
            raise HTTPException(status_code=400, detail="Phone already registered")

        # Generate OTP for email verification
        otp = generate_otp()
        expiry = datetime.utcnow() + timedelta(minutes=10)
        hashed_pw = hash_password(user.password)
        
        # Create user with is_active=False (will be True after OTP verification)
        # Customers don't need approval - will be auto-approved on OTP verification
        new_user = User(
            username=user.username, 
            email=user.email, 
            phone=normalized_phone, 
            hashed_password=hashed_pw,
            is_active=False,  # Default to False, will be True after OTP verification
            otp=otp,
            otp_expiry=expiry,
            role="customer",  # Default role for regular signup
            is_approved=False  # Will be set to True on OTP verification
        )
        db.add(new_user)
        try:
            db.commit()
        except IntegrityError as e:
            db.rollback()
            # Best-effort mapping of constraint failures to user-friendly messages
            message = "Duplicate value for a unique field"
            detail = str(e.orig).lower() if hasattr(e, 'orig') else str(e).lower()
            logger.warning("IntegrityError on signup: %s", detail)
            if 'username' in detail:
                message = 'Username already registered'
            elif 'email' in detail:
                message = 'Email already registered'
            elif 'phone' in detail:
                message = 'Phone already registered'
            raise HTTPException(status_code=400, detail=message)

        db.refresh(new_user)
        
        # Send OTP email
        try:
            send_otp_email(user.email, otp)
            logger.info("OTP sent to email: %s", user.email)
        except ValueError as e:
            # Email configuration error - log but don't fail signup
            logger.error("Email configuration error: %s", str(e))
            logger.warning("User created but OTP email not sent. User can request resend.")
        except Exception as e:
            logger.exception("Failed to send OTP email to %s: %s", user.email, str(e))
            # Don't fail the signup if email fails, but log it
            # The user can request a resend if needed

        logger.info("Signup success: user_id=%s username=%s", new_user.id, new_user.username)
        return {"message": "User created successfully. Please verify your email with the OTP sent to your inbox."}
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Unexpected error during signup: %s", str(e))
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Signup failed due to server error: {str(e)}")

# Login User (flexible - accepts form data)
@app.post("/users/login", tags=["Auth"])
def login_user(
    username: str = Form(...),
    password: str = Form(...),
    db: Session = Depends(get_db)
):
    """
    Login endpoint that accepts username/email/phone and password.
    For curl: use -d 'username=test123&password=test@123Q'
    """
    identifier = username  # may be username, email, or phone
    user = (
        db.query(User)
        .filter(
            (User.username == identifier) | (User.email == identifier) | (User.phone == identifier)
        )
        .first()
    )
    if not user or not verify_password(password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    # Check if user is active (OTP verified)
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Account not activated. Please verify your email with the OTP sent to your inbox."
        )
    access_token_expires = timedelta(minutes=30)
    access_token = create_access_token(data={"sub": user.username}, expires_delta=access_token_expires)

    # Determine user role
    user_role = "customer"
    if user.role == "admin" or user.is_admin:
        user_role = "admin"
    elif user.role == "seller":
        user_role = "seller"

    # Include seller approval status when relevant so frontend can route correctly
    is_approved = None
    if user_role == "seller":
        is_approved = bool(getattr(user, "is_approved", False))

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user_role,
        "username": user.username,
        "is_approved": is_approved
    }

@app.get("/seller/status", tags=["Seller"])
def get_seller_status(
    db: Session = Depends(get_db),
    current_user_obj: User = Depends(get_current_user_obj)
):
    """
    Helper endpoint for seller frontend to poll approval status.

    - Returns is_approved flag, username, and seller_id for authenticated sellers.
    - Returns 403 for non-seller roles.
    """
    if current_user_obj.role != "seller":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Seller access required"
        )

    refreshed = db.query(User).filter(User.id == current_user_obj.id).first()
    if not refreshed:
        raise HTTPException(status_code=404, detail="User not found")

    return {
        "is_approved": bool(getattr(refreshed, "is_approved", False)),
        "username": refreshed.username,
        "seller_id": refreshed.id,
        "email": refreshed.email,
    }

@app.get("/profile", tags=["Users"])
def read_profile(current_user: str = Depends(get_current_user)):
    return {"message": f"Welcome, {current_user}!"}

# ==================== PROFILE MANAGEMENT ENDPOINTS ====================

@app.get("/profile/me", response_model=ProfileResponse, tags=["Users"])
def get_profile(
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    """Get current user's profile"""
    user = db.query(User).filter(User.username == current_user).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@app.put("/profile/update", response_model=ProfileResponse, tags=["Users"])
def update_profile(
    profile_update: ProfileUpdate,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    """Update user profile (username, phone, gender, dob)"""
    user = db.query(User).filter(User.username == current_user).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Update only provided fields
    update_data = profile_update.model_dump(exclude_unset=True)
    
    # Validate username if being updated
    if 'username' in update_data and update_data['username']:
        new_username = update_data['username']
        if new_username != user.username:
            validate_username(new_username)
            # Check if username already exists
            existing = db.query(User).filter(User.username == new_username).first()
            if existing:
                raise HTTPException(status_code=400, detail="Username already taken")
            update_data['username'] = new_username
    
    # Validate phone if being updated
    if 'phone' in update_data:
        phone = update_data['phone']
        if phone:
            phone = phone.strip()
            if phone:
                # Check if phone already exists for another user
                existing = db.query(User).filter(
                    User.phone == phone,
                    User.id != user.id
                ).first()
                if existing:
                    raise HTTPException(status_code=400, detail="Phone number already registered")
                update_data['phone'] = phone
            else:
                update_data['phone'] = None
        else:
            update_data['phone'] = None
    
    # Apply updates
    for field, value in update_data.items():
        setattr(user, field, value)
    
    db.commit()
    db.refresh(user)
    return user

@app.put("/profile/change-password", tags=["Users"])
def change_password(
    password_data: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    """Change user password with validation"""
    user = db.query(User).filter(User.username == current_user).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Verify old password
    if not verify_password(password_data.old_password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    
    # Validate new password strength
    try:
        validate_password_strength(
            password_data.new_password,
            username=user.username,
            email=user.email
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    # Check if new password equals old password
    if verify_password(password_data.new_password, user.hashed_password):
        raise HTTPException(
            status_code=400,
            detail="New password cannot be the same as your current password"
        )
    
    # Hash and update password
    user.hashed_password = hash_password(password_data.new_password)
    db.commit()
    
    logger.info(f"Password changed successfully for user: {user.username}")
    return {"message": "Password changed successfully"}

# Seller Registration (separate from customer signup)
@app.post("/users/register-seller", tags=["Users"])
def register_seller(seller: SellerCreate, db: Session = Depends(get_db)):
    logger.info("Seller registration attempt: username=%s email=%s", seller.username, seller.email)
    try:
        # Normalize phone: treat empty strings as None
        normalized_phone = None
        if seller.phone is not None:
            stripped = seller.phone.strip()
            if stripped:
                normalized_phone = stripped

        # Ensure unique username/email/phone
        if db.query(User).filter(User.username == seller.username).first():
            logger.info("Seller registration rejected: username already exists: %s", seller.username)
            raise HTTPException(status_code=400, detail="Username already registered")
        if db.query(User).filter(User.email == seller.email).first():
            logger.info("Seller registration rejected: email already exists: %s", seller.email)
            raise HTTPException(status_code=400, detail="Email already registered")
        if normalized_phone and db.query(User).filter(User.phone == normalized_phone).first():
            logger.info("Seller registration rejected: phone already exists: %s", normalized_phone)
            raise HTTPException(status_code=400, detail="Phone already registered")

        # Generate OTP for email verification
        otp = generate_otp()
        expiry = datetime.utcnow() + timedelta(minutes=10)
        hashed_pw = hash_password(seller.password)
        
        # Create seller user with role="seller" and is_approved=False
        new_seller = User(
            username=seller.username, 
            email=seller.email, 
            phone=normalized_phone, 
            hashed_password=hashed_pw,
            is_active=False,  # Will be True after OTP verification
            otp=otp,
            otp_expiry=expiry,
            role="seller",  # Seller role
            is_approved=False  # Must be approved by admin
        )
        db.add(new_seller)
        try:
            db.commit()
        except IntegrityError as e:
            db.rollback()
            message = "Duplicate value for a unique field"
            detail = str(e.orig).lower() if hasattr(e, 'orig') else str(e).lower()
            logger.warning("IntegrityError on seller registration: %s", detail)
            if 'username' in detail:
                message = 'Username already registered'
            elif 'email' in detail:
                message = 'Email already registered'
            elif 'phone' in detail:
                message = 'Phone already registered'
            raise HTTPException(status_code=400, detail=message)

        db.refresh(new_seller)
        
        # Send OTP email
        try:
            send_otp_email(seller.email, otp)
            logger.info("OTP sent to seller email: %s", seller.email)
        except ValueError as e:
            logger.error("Email configuration error: %s", str(e))
            logger.warning("Seller created but OTP email not sent. Seller can request resend.")
        except Exception as e:
            logger.exception("Failed to send OTP email to %s: %s", seller.email, str(e))

        logger.info("Seller registration success: user_id=%s username=%s", new_seller.id, new_seller.username)
        return {"message": "Seller account created successfully. Please verify your email with the OTP sent to your inbox. Your account will be reviewed by an admin for approval."}
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Unexpected error during seller registration: %s", str(e))
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Seller registration failed due to server error: {str(e)}")

@app.post("/cart/add", response_model=CartItemResponse, tags=["Cart"])
def add_to_cart(
    item: CartItemCreate,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    # Find user
    user = db.query(User).filter(User.username == current_user).first()

    # Check if product exists
    product = db.query(ProductModel).filter(ProductModel.id == item.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Check if product has variants
    variants = db.query(ProductVariant).filter(ProductVariant.product_id == item.product_id).all()
    has_variants = len(variants) > 0

    # If product has variants, variant_id is required
    if has_variants:
        if not item.variant_id:
            raise HTTPException(status_code=400, detail="variant_id is required for products with variants")
        
        # Validate variant exists and belongs to product
        variant = db.query(ProductVariant).filter(
            ProductVariant.id == item.variant_id,
            ProductVariant.product_id == item.product_id
        ).first()
        if not variant:
            raise HTTPException(status_code=404, detail="Variant not found or does not belong to this product")
        
        # Use variant price if available, otherwise product price
        item_price = variant.price if variant.price else product.price
    else:
        # Legacy: Validate size/color if product has sizes/colors (old system)
        if product.sizes:
            sizes_list = deserialize_json_field(product.sizes)
            if item.size and sizes_list and item.size not in sizes_list:
                raise HTTPException(status_code=400, detail=f"Invalid size. Available sizes: {', '.join(sizes_list)}")
            if not item.size and sizes_list:
                raise HTTPException(status_code=400, detail="Size is required for this product")

        if product.colors:
            colors_list = deserialize_json_field(product.colors)
            if item.color and colors_list and item.color not in colors_list:
                raise HTTPException(status_code=400, detail=f"Invalid color. Available colors: {', '.join(colors_list)}")
        
        item_price = product.price

    # Check if product with same variant already in cart
    if has_variants:
        cart_item = (
            db.query(CartItem)
            .filter(
                CartItem.user_id == user.id,
                CartItem.product_id == item.product_id,
                CartItem.variant_id == item.variant_id
            )
            .first()
        )
    else:
        # Legacy: check by size/color
        cart_item = (
            db.query(CartItem)
            .filter(
                CartItem.user_id == user.id,
                CartItem.product_id == item.product_id,
                CartItem.size == item.size,
                CartItem.color == item.color
            )
            .first()
        )

    if cart_item:
        cart_item.quantity += item.quantity
    else:
        cart_item = CartItem(
            user_id=user.id,
            product_id=item.product_id,
            variant_id=item.variant_id if has_variants else None,
            quantity=item.quantity,
            size=item.size if not has_variants else None,
            color=item.color if not has_variants else None
        )
        db.add(cart_item)

    db.commit()
    db.refresh(cart_item)
    # Load variant for response
    if cart_item.variant_id:
        cart_item.variant = db.query(ProductVariant).filter(ProductVariant.id == cart_item.variant_id).first()
    return cart_item


@app.get("/cart", response_model=list[CartItemResponse], tags=["Cart"])
def get_cart(
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    """Get user's cart with variant information"""
    user = db.query(User).filter(User.username == current_user).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    cart_items = db.query(CartItem).filter(CartItem.user_id == user.id).all()
    # Load variants for each cart item
    for item in cart_items:
        if item.variant_id:
            item.variant = db.query(ProductVariant).filter(ProductVariant.id == item.variant_id).first()
    return cart_items


@app.delete("/cart/remove/{product_id}", tags=["Cart"])
def remove_from_cart(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    user = db.query(User).filter(User.username == current_user).first()
    cart_item = (
        db.query(CartItem)
        .filter(CartItem.user_id == user.id, CartItem.product_id == product_id)
        .first()
    )
    if not cart_item:
        raise HTTPException(status_code=404, detail="Item not in cart")

    db.delete(cart_item)
    db.commit()
    return {"message": "Item removed from cart"}


@app.delete("/cart/clear", tags=["Cart"])
def clear_cart(
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    user = db.query(User).filter(User.username == current_user).first()
    db.query(CartItem).filter(CartItem.user_id == user.id).delete()
    db.commit()
    return {"message": "Cart cleared successfully"}


# Update cart item quantity directly
@app.patch("/cart/quantity", response_model=CartItemResponse, tags=["Cart"])
def set_cart_item_quantity(
    update: CartItemQuantityUpdate,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    user = db.query(User).filter(User.username == current_user).first()
    cart_item = (
        db.query(CartItem)
        .filter(CartItem.user_id == user.id, CartItem.product_id == update.product_id)
        .first()
    )

    if not cart_item:
        raise HTTPException(status_code=404, detail="Item not in cart")

    if update.quantity <= 0:
        # If quantity is set to 0 or less, remove item
        db.delete(cart_item)
        db.commit()
        # Return a minimal response indicating removal
        raise HTTPException(status_code=200, detail="Item removed from cart")

    cart_item.quantity = update.quantity
    db.commit()
    db.refresh(cart_item)
    return cart_item


# Increase quantity by 1
@app.post("/cart/increase/{product_id}", response_model=CartItemResponse, tags=["Cart"])
def increase_cart_item(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    user = db.query(User).filter(User.username == current_user).first()
    cart_item = (
        db.query(CartItem)
        .filter(CartItem.user_id == user.id, CartItem.product_id == product_id)
        .first()
    )

    if not cart_item:
        # If not present, add with quantity 1
        cart_item = CartItem(user_id=user.id, product_id=product_id, quantity=1)
        db.add(cart_item)
    else:
        cart_item.quantity += 1

    db.commit()
    db.refresh(cart_item)
    return cart_item


# Decrease quantity by 1 (remove if reaches 0)
@app.post("/cart/decrease/{product_id}", response_model=CartItemResponse, tags=["Cart"])
def decrease_cart_item(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    user = db.query(User).filter(User.username == current_user).first()
    cart_item = (
        db.query(CartItem)
        .filter(CartItem.user_id == user.id, CartItem.product_id == product_id)
        .first()
    )

    if not cart_item:
        raise HTTPException(status_code=404, detail="Item not in cart")

    if cart_item.quantity <= 1:
        db.delete(cart_item)
        db.commit()
        # Similar to above, indicate removal
        raise HTTPException(status_code=200, detail="Item removed from cart")

    cart_item.quantity -= 1
    db.commit()
    db.refresh(cart_item)
    return cart_item

# ---------------- Create Order (checkout) ----------------
@app.post("/orders/create", response_model=OrderResponse, tags=["Orders"])
def create_order(
    address_id: int = Query(None, description="Address ID for delivery"),
    db: Session = Depends(get_db), 
    current_user: str = Depends(get_current_user)
):
    # find user record
    user = db.query(User).filter(User.username == current_user).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Validate address requirement
    if not user.has_address:
        raise HTTPException(
            status_code=400, 
            detail="Address required before placing an order. Please add a delivery address."
        )

    # Get delivery address
    if address_id:
        # Use specified address
        address = db.query(Address).filter(
            Address.id == address_id,
            Address.user_id == user.id
        ).first()
        if not address:
            raise HTTPException(status_code=404, detail="Address not found")
    else:
        # Use default address
        address = db.query(Address).filter(
            Address.user_id == user.id,
            Address.is_default == True
        ).first()
        if not address:
            raise HTTPException(
                status_code=400,
                detail="No default address found. Please select an address."
            )

    # fetch cart items for user
    cart_items = db.query(CartItem).filter(CartItem.user_id == user.id).all()
    if not cart_items:
        raise HTTPException(status_code=400, detail="Cart is empty")

    # Create address snapshot for order
    address_snapshot = {
        "full_name": address.full_name,
        "phone_number": address.phone_number,
        "address_line_1": address.address_line_1,
        "address_line_2": address.address_line_2,
        "landmark": address.landmark,
        "city": address.city,
        "state": address.state,
        "pincode": address.pincode,
        "tag": address.tag
    }

    # create order with shipping snapshot
    # Initial order status is "Active" (item-level statuses are primary)
    order = Order(
        user_id=user.id, 
        total_price=0.0, 
        status="Active",  # Simplified: Active until all items delivered or all rejected
        delivery_address=address_snapshot,
        ship_name=address.full_name,
        ship_phone=address.phone_number,
        ship_address_line1=address.address_line_1,
        ship_address_line2=address.address_line_2,
        ship_city=address.city,
        ship_state=address.state,
        ship_country=None,  # Not in Address model, can be added later
        ship_pincode=address.pincode,
        ordered_at=datetime.utcnow()
    )
    db.add(order)
    db.flush()  # assign PK to order.id before adding items

    total = 0.0
    for ci in cart_items:
        # fetch product to get current price (and validate existence)
        product = db.query(ProductModel).filter(ProductModel.id == ci.product_id).first()
        if not product:
            # optional: skip or abort; here we abort to keep consistency
            raise HTTPException(status_code=404, detail=f"Product id {ci.product_id} not found")

        # Get variant if exists
        variant = None
        variant_price = product.price
        variant_size = None
        variant_color = None
        variant_image_url = None
        
        if ci.variant_id:
            variant = db.query(ProductVariant).filter(ProductVariant.id == ci.variant_id).first()
            if variant:
                variant_price = variant.price if variant.price else product.price
                variant_size = variant.size
                variant_color = variant.color
                variant_image_url = variant.image_url

        item_price = float(variant_price) * int(ci.quantity)
        total += item_price

        order_item = OrderItem(
            order_id=order.id,
            product_id=product.id,
            variant_id=ci.variant_id,
            quantity=ci.quantity,
            price=variant_price,  # price per item (use variant price if available)
            variant_size=variant_size,  # Snapshot variant info
            variant_color=variant_color,
            variant_image_url=variant_image_url,
            seller_id=product.seller_id,  # Copy seller_id from product
            status="Pending"  # Initial status
        )
        db.add(order_item)

    # update total, commit transaction, clear cart
    order.total_price = total
    # delete cart items
    db.query(CartItem).filter(CartItem.user_id == user.id).delete()
    db.commit()
    db.refresh(order)
    
    # Load order items with product details and normalize products
    order_items = db.query(OrderItem).filter(OrderItem.order_id == order.id).all()
    for item in order_items:
        item.product = db.query(ProductModel).filter(ProductModel.id == item.product_id).first()
        if item.product:
            normalize_product_gender(item.product, db)
        # Load variant if exists
        if item.variant_id:
            item.variant = db.query(ProductVariant).filter(ProductVariant.id == item.variant_id).first()
    order.order_items = order_items
    
    return order


# ---------------- List User Orders ----------------
@app.get("/orders", response_model=list[OrderResponse], tags=["Orders"])
def list_orders(db: Session = Depends(get_db), current_user: str = Depends(get_current_user)):
    user = db.query(User).filter(User.username == current_user).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    orders = db.query(Order).filter(Order.user_id == user.id).order_by(Order.created_at.desc()).all()
    # Load order items with product details and seller info
    for order in orders:
        order_items = db.query(OrderItem).filter(OrderItem.order_id == order.id).all()
        for item in order_items:
            item.product = db.query(ProductModel).filter(ProductModel.id == item.product_id).first()
            if item.product:
                normalize_product_gender(item.product, db)
            # Load variant if exists
            if item.variant_id:
                item.variant = db.query(ProductVariant).filter(ProductVariant.id == item.variant_id).first()
            # Add seller info to product if seller_id exists
            if item.seller_id:
                seller = db.query(User).filter(User.id == item.seller_id).first()
                if seller and item.product:
                    # Add seller info as attributes (will be serialized in response)
                    item.product.seller_username = seller.username
                    item.product.seller_email = seller.email
        order.order_items = order_items
    return orders


# ---------------- Get Order Details ----------------
@app.get("/orders/{order_id}", response_model=OrderResponse, tags=["Orders"])
def get_order(order_id: int, db: Session = Depends(get_db), current_user: str = Depends(get_current_user)):
    user = db.query(User).filter(User.username == current_user).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    order = db.query(Order).filter(Order.id == order_id, Order.user_id == user.id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found or access denied")

    # Load order items with product details and seller info
    order_items = db.query(OrderItem).filter(OrderItem.order_id == order.id).all()
    for item in order_items:
        item.product = db.query(ProductModel).filter(ProductModel.id == item.product_id).first()
        if item.product:
            normalize_product_gender(item.product, db)
        # Load variant if exists
        if item.variant_id:
            item.variant = db.query(ProductVariant).filter(ProductVariant.id == item.variant_id).first()
        # Add seller info to product if seller_id exists
        if item.seller_id:
            seller = db.query(User).filter(User.id == item.seller_id).first()
            if seller and item.product:
                # Add seller info as attributes (will be serialized in response)
                item.product.seller_username = seller.username
                item.product.seller_email = seller.email
    order.order_items = order_items

    return order

# ==================== CUSTOMER RETURN ROUTES ====================

@app.post("/returns/request/{order_item_id}", response_model=OrderItemResponse, tags=["Returns"])
def request_return(
    order_item_id: int,
    request_data: ReturnRequestCreate,
    db: Session = Depends(get_db),
    current_user_obj: User = Depends(customer_only)
):
    """Customer requests a return for an order item"""
    # Get order item
    order_item = db.query(OrderItem).filter(OrderItem.id == order_item_id).first()
    if not order_item:
        raise HTTPException(status_code=404, detail="Order item not found")
    
    # Verify order belongs to current user
    order = db.query(Order).filter(Order.id == order_item.order_id).first()
    if not order or order.user_id != current_user_obj.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Check if item is delivered (only delivered items can be returned)
    if order_item.status != "Delivered":
        raise HTTPException(
            status_code=400, 
            detail="Only delivered items can be returned"
        )
    
    # Check if already has a return request
    if order_item.return_status and order_item.return_status != "None":
        raise HTTPException(
            status_code=400,
            detail=f"Return already {order_item.return_status}"
        )
    
    # Check if item is return eligible
    if not order_item.is_return_eligible:
        raise HTTPException(
            status_code=400,
            detail="This item is not eligible for return"
        )
    
    # Update return fields
    order_item.return_status = "ReturnRequested"
    order_item.return_reason = request_data.reason
    order_item.return_notes = request_data.notes
    order_item.return_requested_at = datetime.utcnow()
    
    db.commit()
    db.refresh(order_item)
    
    # Load product for response
    order_item.product = db.query(ProductModel).filter(ProductModel.id == order_item.product_id).first()
    if order_item.product:
        normalize_product_gender(order_item.product, db)
    
    return order_item

@app.patch("/returns/cancel/{order_item_id}", response_model=OrderItemResponse, tags=["Returns"])
def cancel_return(
    order_item_id: int,
    db: Session = Depends(get_db),
    current_user_obj: User = Depends(customer_only)
):
    """Customer cancels a return request"""
    order_item = db.query(OrderItem).filter(OrderItem.id == order_item_id).first()
    if not order_item:
        raise HTTPException(status_code=404, detail="Order item not found")
    
    # Verify order belongs to current user
    order = db.query(Order).filter(Order.id == order_item.order_id).first()
    if not order or order.user_id != current_user_obj.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Only allow cancellation if status is ReturnRequested
    if order_item.return_status != "ReturnRequested":
        raise HTTPException(
            status_code=400,
            detail="Can only cancel return requests that are pending"
        )
    
    # Reset return fields
    order_item.return_status = "None"
    order_item.return_reason = None
    order_item.return_notes = None
    order_item.return_requested_at = None
    
    db.commit()
    db.refresh(order_item)
    
    # Load product for response
    order_item.product = db.query(ProductModel).filter(ProductModel.id == order_item.product_id).first()
    if order_item.product:
        normalize_product_gender(order_item.product, db)
    
    return order_item

@app.get("/returns/my", response_model=list[ReturnItemResponse], tags=["Returns"])
def list_my_returns(
    db: Session = Depends(get_db),
    current_user_obj: User = Depends(customer_only)
):
    """List all return requests for current customer"""
    # Get all order items with return requests for this user
    order_items = (
        db.query(OrderItem)
        .join(Order, OrderItem.order_id == Order.id)
        .filter(
            Order.user_id == current_user_obj.id,
            OrderItem.return_status != "None",
            OrderItem.return_status.isnot(None)
        )
        .order_by(OrderItem.return_requested_at.desc())
        .all()
    )
    
    result = []
    for item in order_items:
        # Load product
        item.product = db.query(ProductModel).filter(ProductModel.id == item.product_id).first()
        if item.product:
            normalize_product_gender(item.product, db)
        
        # Load order info
        order = db.query(Order).filter(Order.id == item.order_id).first()
        
        # Build response
        return_item = ReturnItemResponse(
            id=item.id,
            order_id=item.order_id,
            product_id=item.product_id,
            quantity=item.quantity,
            price=item.price,
            seller_id=item.seller_id,
            status=item.status,
            rejection_reason=item.rejection_reason,
            return_status=item.return_status or "None",
            return_reason=item.return_reason,
            return_notes=item.return_notes,
            return_requested_at=item.return_requested_at,
            return_processed_at=item.return_processed_at,
            is_return_eligible=item.is_return_eligible if item.is_return_eligible is not None else True,
            product=item.product,
            order_ordered_at=order.ordered_at if order else None,
            order_ship_name=order.ship_name if order else None,
            order_ship_phone=order.ship_phone if order else None,
            order_ship_address_line1=order.ship_address_line1 if order else None,
            order_ship_address_line2=order.ship_address_line2 if order else None,
            order_ship_city=order.ship_city if order else None,
            order_ship_state=order.ship_state if order else None,
            order_ship_country=order.ship_country if order else None,
            order_ship_pincode=order.ship_pincode if order else None,
            customer_username=current_user_obj.username,
            customer_email=current_user_obj.email
        )
        result.append(return_item)
    
    return result

@app.post("/products/bulk", response_model=BulkProductCreateResponse, tags=["Products"])
def create_multiple_products(payload: BulkProductCreate, db: Session = Depends(get_db)):
    if not payload.products or len(payload.products) == 0:
        raise HTTPException(status_code=400, detail="No products provided")

    if len(payload.products) > 100:
        raise HTTPException(status_code=400, detail="Maximum 100 products allowed per request")

    created_products = []
    errors = []
    
    try:
        for idx, item in enumerate(payload.products):
            try:
                # Validate required fields
                if not item.name or not item.name.strip():
                    errors.append(f"Product {idx + 1}: Name is required")
                    continue
                if not isinstance(item.price, (int, float)) or item.price <= 0:
                    errors.append(f"Product {idx + 1}: Valid price is required")
                    continue

                product = ProductModel(
                    name=item.name.strip(),
                    description=item.description.strip() if item.description else None,
                    image_url=item.image_url.strip() if item.image_url else None,
                    price=float(item.price),
                    discounted_price=float(item.discounted_price) if item.discounted_price is not None else None,
                    gender=item.gender if item.gender in ['men', 'women', 'unisex'] else None,
                    category=item.category.strip() if item.category else None,
                )
                db.add(product)
                created_products.append(product)
            except Exception as e:
                errors.append(f"Product {idx + 1}: {str(e)}")
                logger.exception(f"Error creating product {idx + 1}")

        if created_products:
            db.commit()
            for product in created_products:
                db.refresh(product)
        else:
            db.rollback()
            raise HTTPException(status_code=400, detail="No products were created. Errors: " + "; ".join(errors))

        return {
            "created": len(created_products),
            "total": len(payload.products),
            "errors": errors,
            "products": created_products
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.exception("Bulk product creation failed")
        raise HTTPException(status_code=500, detail=f"Failed to create products: {str(e)}")


# ---------------- Wishlist Endpoints ----------------
@app.post("/wishlist/add/{product_id}", response_model=WishlistItemResponse, tags=["Wishlist"])
def add_to_wishlist(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    user = db.query(User).filter(User.username == current_user).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Check if product exists
    product = db.query(ProductModel).filter(ProductModel.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Check if already in wishlist
    existing = db.query(WishlistItem).filter(
        WishlistItem.user_id == user.id,
        WishlistItem.product_id == product_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Product already in wishlist")

    wishlist_item = WishlistItem(user_id=user.id, product_id=product_id)
    db.add(wishlist_item)
    db.commit()
    db.refresh(wishlist_item)
    return wishlist_item

@app.delete("/wishlist/remove/{product_id}", tags=["Wishlist"])
def remove_from_wishlist(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    user = db.query(User).filter(User.username == current_user).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    wishlist_item = db.query(WishlistItem).filter(
        WishlistItem.user_id == user.id,
        WishlistItem.product_id == product_id
    ).first()

    if not wishlist_item:
        raise HTTPException(status_code=404, detail="Item not in wishlist")

    db.delete(wishlist_item)
    db.commit()
    return {"message": "Item removed from wishlist"}

@app.get("/wishlist", response_model=list[WishlistItemResponse], tags=["Wishlist"])
def get_wishlist(
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    user = db.query(User).filter(User.username == current_user).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return db.query(WishlistItem).filter(WishlistItem.user_id == user.id).all()

@app.get("/wishlist/check/{product_id}", response_model=dict, tags=["Wishlist"])
def check_wishlist_status(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    user = db.query(User).filter(User.username == current_user).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    exists = db.query(WishlistItem).filter(
        WishlistItem.user_id == user.id,
        WishlistItem.product_id == product_id
    ).first() is not None

    return {"in_wishlist": exists}

# Test endpoint to check OTP (for debugging)
@app.get("/test/user-otp/{email}", tags=["Auth"])
def get_user_otp(email: str, db: Session = Depends(get_db)):
    """Get OTP for a user (for testing purposes only)"""
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {
        "email": user.email,
        "is_active": user.is_active,
        "otp": user.otp,
        "otp_expiry": user.otp_expiry.isoformat() if user.otp_expiry else None,
        "otp_valid": user.otp_expiry > datetime.utcnow() if user.otp_expiry else False
    }

# OTP Verification Endpoints
@app.post("/verify-otp", tags=["Auth"])
def verify_otp(data: VerifyOTPRequest, db: Session = Depends(get_db)):
    """Verify OTP and activate user account"""
    user = db.query(User).filter(User.email == data.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if not user.otp:
        raise HTTPException(status_code=400, detail="No OTP found. Please request a new OTP.")

    if user.otp != data.otp:
        raise HTTPException(status_code=400, detail="Invalid OTP")

    if user.otp_expiry < datetime.utcnow():
        raise HTTPException(status_code=400, detail="OTP expired. Please request a new OTP.")

    # Activate user account
    user.is_active = True
    user.otp = None
    user.otp_expiry = None
    
    # For customers: auto-approve (bypass approval requirement)
    # For sellers: approval still required from admin
    if user.role == "customer":
        user.is_approved = True
    
    db.commit()

    logger.info("Email verified and account activated for user: %s", user.email)
    return {"message": "Email verified successfully! Your account is now active."}

# ==================== SELLER ROUTES ====================

@app.post("/seller/upload", tags=["Seller"])
async def upload_images(
    files: list[UploadFile] = File(...),
    current_seller: User = Depends(seller_only)
):
    """Upload one or more product images (seller only)"""
    if not files or len(files) == 0:
        raise HTTPException(status_code=400, detail="No files provided")
    
    if len(files) > 10:
        raise HTTPException(status_code=400, detail="Maximum 10 images allowed per upload")
    
    uploaded_urls = []
    
    for file in files:
        # Validate file type
        if not file.content_type or not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail=f"File {file.filename} is not an image")
        
        # Generate unique filename
        file_extension = os.path.splitext(file.filename)[1] if file.filename else '.jpg'
        unique_filename = f"{uuid.uuid4().hex}{file_extension}"
        file_path = os.path.join(UPLOADS_DIR, unique_filename)
        
        # Save file
        try:
            with open(file_path, "wb") as buffer:
                content = await file.read()
                buffer.write(content)
            
            # Return the URL path
            file_url = f"/uploads/{unique_filename}"
            uploaded_urls.append(file_url)
        except Exception as e:
            logger.exception(f"Error saving file {file.filename}: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to save file {file.filename}")
    
    return {
        "urls": uploaded_urls,
        "count": len(uploaded_urls)
    }

@app.get("/seller/products", response_model=list[ProductSchema], tags=["Seller"])
def get_seller_products(
    db: Session = Depends(get_db),
    current_seller: User = Depends(seller_only)
):
    """Get all products for the current seller"""
    products = db.query(ProductModel).filter(
        ProductModel.seller_id == current_seller.id
    ).order_by(ProductModel.id.desc()).all()
    return [normalize_product_gender(p, db) for p in products]

@app.post("/seller/products/create", response_model=ProductSchema, tags=["Seller"])
def create_seller_product(
    product: ProductCreate,
    db: Session = Depends(get_db),
    current_seller: User = Depends(seller_only)
):
    """Create a new product (seller only)"""
    try:
        # Log the raw product object before model_dump
        logger.info(f"Received product create request - Name: {product.name}, Price: {product.price}")
        logger.info(f"Raw product - sizes type: {type(product.sizes)}, colors type: {type(product.colors)}, specifications type: {type(product.specifications)}")
        
        product_data = product.model_dump()
        
        # Log incoming data for debugging
        logger.info(f"Creating product - Name: {product_data.get('name')}, Price: {product_data.get('price')}, Discounted: {product_data.get('discounted_price')}")
        logger.info(f"Product data - sizes: {product_data.get('sizes')} (type: {type(product_data.get('sizes'))}), colors: {product_data.get('colors')} (type: {type(product_data.get('colors'))}), specifications: {product_data.get('specifications')} (type: {type(product_data.get('specifications'))})")
        
        # Normalize and serialize JSON fields - handle None, empty lists, and empty dicts properly
        # Sizes: convert empty list to None for DB storage
        if 'sizes' in product_data:
            if isinstance(product_data['sizes'], list):
                if len(product_data['sizes']) > 0:
                    product_data['sizes'] = serialize_json_field(product_data['sizes'])
                else:
                    product_data['sizes'] = None
            elif product_data['sizes'] is None:
                product_data['sizes'] = None
            else:
                logger.warning(f"Unexpected type for sizes: {type(product_data['sizes'])}")
                product_data['sizes'] = None
        
        # Colors: convert empty list to None for DB storage
        if 'colors' in product_data:
            if isinstance(product_data['colors'], list):
                if len(product_data['colors']) > 0:
                    product_data['colors'] = serialize_json_field(product_data['colors'])
                else:
                    product_data['colors'] = None
            elif product_data['colors'] is None:
                product_data['colors'] = None
            else:
                logger.warning(f"Unexpected type for colors: {type(product_data['colors'])}")
                product_data['colors'] = None
        
        # Variants (legacy_variants in DB): convert empty dict to None for DB storage
        # Map 'variants' from schema to 'legacy_variants' for ProductModel
        if 'variants' in product_data:
            if isinstance(product_data['variants'], dict):
                if len(product_data['variants']) > 0:
                    product_data['legacy_variants'] = serialize_json_field(product_data['variants'])
                else:
                    product_data['legacy_variants'] = None
            elif product_data['variants'] is None:
                product_data['legacy_variants'] = None
            else:
                logger.warning(f"Unexpected type for variants: {type(product_data['variants'])}")
                product_data['legacy_variants'] = None
            # Remove 'variants' key since ProductModel uses 'legacy_variants'
            del product_data['variants']
        
        # Specifications: convert empty dict to None for DB storage
        if 'specifications' in product_data:
            if isinstance(product_data['specifications'], dict):
                if len(product_data['specifications']) > 0:
                    product_data['specifications'] = serialize_json_field(product_data['specifications'])
                else:
                    product_data['specifications'] = None
            elif product_data['specifications'] is None:
                product_data['specifications'] = None
            else:
                logger.warning(f"Unexpected type for specifications: {type(product_data['specifications'])}")
                product_data['specifications'] = None
        
        logger.info(f"Serialized product data - sizes: {product_data.get('sizes')}, colors: {product_data.get('colors')}, specifications: {product_data.get('specifications')}")
        
        # Remove any fields that don't exist in ProductModel (like product_variants from schema)
        # Note: 'variants' has already been mapped to 'legacy_variants' above
        model_fields = {
            'name', 'description', 'image_url', 'price', 'discounted_price', 
            'gender', 'category', 'sizes', 'colors', 'legacy_variants', 
            'size_fit', 'material_care', 'specifications'
        }
        filtered_data = {k: v for k, v in product_data.items() if k in model_fields}
        
        logger.info(f"About to create ProductModel with data keys: {list(filtered_data.keys())}")
        logger.info(f"ProductModel fields - sizes: {filtered_data.get('sizes')}, colors: {filtered_data.get('colors')}, specifications: {filtered_data.get('specifications')}")
        
        new_product = ProductModel(
            **filtered_data,
            seller_id=current_seller.id,
            is_verified=False,  # Requires admin verification
            verification_status="Pending",  # Set to Pending for admin review
            submitted_at=datetime.utcnow()  # Record submission time
        )
        logger.info(f"ProductModel created, about to add to DB")
        db.add(new_product)
        logger.info(f"ProductModel added to session, about to commit")
        db.commit()
        logger.info(f"Committed to DB, about to refresh")
        db.refresh(new_product)
        logger.info(f"Refreshed, about to normalize")
        # Normalize product for response (deserialize JSON fields back to Python objects)
        # This modifies the SQLAlchemy object in-place to convert JSON strings to Python objects
        normalize_product_gender(new_product, db)
        logger.info(f"Normalized - sizes: {new_product.sizes}, colors: {new_product.colors}, specifications: {new_product.specifications}")
        logger.info(f"About to return - Product ID: {new_product.id}")
        
        # The normalize_product_gender function has converted:
        # - JSON strings -> Python lists/dicts (or None if empty)
        # - None values remain None (which is valid for ProductSchema)
        # ProductSchema expects: sizes: List[str] | None, colors: List[str] | None, specifications: Dict[str, str] | None
        return new_product
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error creating product: {e}")
        logger.error(f"Error type: {type(e).__name__}")
        logger.error(f"Error args: {e.args}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create product: {str(e)}")

@app.post("/seller/products/bulk", response_model=BulkProductCreateResponse, tags=["Seller"])
def create_seller_products_bulk(
    payload: BulkProductCreate,
    db: Session = Depends(get_db),
    current_seller: User = Depends(seller_only)
):
    """Create multiple products at once (seller only)"""
    if not payload.products or len(payload.products) == 0:
        raise HTTPException(status_code=400, detail="No products provided")

    if len(payload.products) > 100:
        raise HTTPException(status_code=400, detail="Maximum 100 products allowed per request")

    created_products = []
    errors = []
    
    try:
        for idx, item in enumerate(payload.products):
            try:
                if not item.name or not item.name.strip():
                    errors.append(f"Product {idx + 1}: Name is required")
                    continue
                if not isinstance(item.price, (int, float)) or item.price <= 0:
                    errors.append(f"Product {idx + 1}: Valid price is required")
                    continue

                # Normalize gender to lowercase for case-insensitive validation
                normalized_gender = None
                if item.gender:
                    gender_lower = str(item.gender).strip().lower()
                    if gender_lower in ['men', 'women', 'unisex']:
                        normalized_gender = gender_lower
                
                product = ProductModel(
                    name=item.name.strip(),
                    description=item.description.strip() if item.description else None,
                    image_url=item.image_url.strip() if item.image_url else None,
                    price=float(item.price),
                    discounted_price=float(item.discounted_price) if item.discounted_price is not None else None,
                    gender=normalized_gender,
                    category=item.category.strip() if item.category else None,
                    seller_id=current_seller.id,
                    is_verified=False  # Requires admin verification
                )
                db.add(product)
                created_products.append(product)
            except Exception as e:
                errors.append(f"Product {idx + 1}: {str(e)}")
                logger.exception(f"Error creating product {idx + 1}")

        if created_products:
            db.commit()
            for product in created_products:
                db.refresh(product)
                normalize_product_gender(product, db)
        else:
            db.rollback()
            raise HTTPException(status_code=400, detail="No products were created. Errors: " + "; ".join(errors))

        return {
            "created": len(created_products),
            "total": len(payload.products),
            "errors": errors,
            "products": created_products
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.exception("Bulk product creation failed")
        raise HTTPException(status_code=500, detail=f"Failed to create products: {str(e)}")

@app.patch("/seller/products/update/{product_id}", response_model=ProductSchema, tags=["Seller"])
def update_seller_product(
    product_id: int,
    product: ProductCreate,
    db: Session = Depends(get_db),
    current_seller: User = Depends(seller_only)
):
    """Update a product (seller only, only their own products)"""
    try:
        existing_product = db.query(ProductModel).filter(
            ProductModel.id == product_id,
            ProductModel.seller_id == current_seller.id
        ).first()
        
        if not existing_product:
            raise HTTPException(status_code=404, detail="Product not found or access denied")
        
        # Update fields
        product_data = product.model_dump()
        
        # Log incoming data for debugging
        logger.info(f"Updating product {product_id} - Name: {product_data.get('name')}, Price: {product_data.get('price')}")
        logger.info(f"Product data - sizes: {product_data.get('sizes')}, colors: {product_data.get('colors')}, specifications: {product_data.get('specifications')}")
        
        # Normalize and serialize JSON fields - same logic as create
        if 'sizes' in product_data:
            if isinstance(product_data['sizes'], list):
                if len(product_data['sizes']) > 0:
                    product_data['sizes'] = serialize_json_field(product_data['sizes'])
                else:
                    product_data['sizes'] = None
            elif product_data['sizes'] is None:
                product_data['sizes'] = None
            else:
                logger.warning(f"Unexpected type for sizes: {type(product_data['sizes'])}")
                product_data['sizes'] = None
        
        if 'colors' in product_data:
            if isinstance(product_data['colors'], list):
                if len(product_data['colors']) > 0:
                    product_data['colors'] = serialize_json_field(product_data['colors'])
                else:
                    product_data['colors'] = None
            elif product_data['colors'] is None:
                product_data['colors'] = None
            else:
                logger.warning(f"Unexpected type for colors: {type(product_data['colors'])}")
                product_data['colors'] = None
        
        # Variants (legacy_variants in DB): convert empty dict to None for DB storage
        # Map 'variants' from schema to 'legacy_variants' for ProductModel
        if 'variants' in product_data:
            if isinstance(product_data['variants'], dict):
                if len(product_data['variants']) > 0:
                    product_data['legacy_variants'] = serialize_json_field(product_data['variants'])
                else:
                    product_data['legacy_variants'] = None
            elif product_data['variants'] is None:
                product_data['legacy_variants'] = None
            else:
                logger.warning(f"Unexpected type for variants: {type(product_data['variants'])}")
                product_data['legacy_variants'] = None
            # Remove 'variants' key since ProductModel uses 'legacy_variants'
            del product_data['variants']
        
        if 'specifications' in product_data:
            if isinstance(product_data['specifications'], dict):
                if len(product_data['specifications']) > 0:
                    product_data['specifications'] = serialize_json_field(product_data['specifications'])
                else:
                    product_data['specifications'] = None
            elif product_data['specifications'] is None:
                product_data['specifications'] = None
            else:
                logger.warning(f"Unexpected type for specifications: {type(product_data['specifications'])}")
                product_data['specifications'] = None
        
        logger.info(f"Serialized product data - sizes: {product_data.get('sizes')}, colors: {product_data.get('colors')}, specifications: {product_data.get('specifications')}")
        
        for key, value in product_data.items():
            setattr(existing_product, key, value)
        
        # Reset verification status when product is updated
        existing_product.is_verified = False
        existing_product.verification_status = "Pending"
        
        db.commit()
        db.refresh(existing_product)
        normalize_product_gender(existing_product, db)
        logger.info(f"Product updated successfully - ID: {existing_product.id}")
        return existing_product
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error updating product: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update product: {str(e)}")

# Seller Variant APIs
@app.post("/seller/products/{product_id}/variants", response_model=VariantResponse, tags=["Seller"])
def create_product_variant(
    product_id: int,
    variant: VariantCreate,
    db: Session = Depends(get_db),
    current_seller: User = Depends(seller_only)
):
    """Create a variant for a product (seller only, only their own products)"""
    product = db.query(ProductModel).filter(
        ProductModel.id == product_id,
        ProductModel.seller_id == current_seller.id
    ).first()
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found or access denied")
    
    new_variant = ProductVariant(
        product_id=product_id,
        size=variant.size,
        color=variant.color,
        image_url=variant.image_url,
        price=variant.price,
        stock=variant.stock
    )
    db.add(new_variant)
    db.commit()
    db.refresh(new_variant)
    # Normalize image URL
    if new_variant.image_url:
        new_variant.image_url = normalize_image_url(new_variant.image_url)
    return new_variant

@app.get("/seller/products/{product_id}/variants", response_model=list[VariantResponse], tags=["Seller"])
def get_product_variants(
    product_id: int,
    db: Session = Depends(get_db),
    current_seller: User = Depends(seller_only)
):
    """Get all variants for a product (seller only, only their own products)"""
    product = db.query(ProductModel).filter(
        ProductModel.id == product_id,
        ProductModel.seller_id == current_seller.id
    ).first()
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found or access denied")
    
    variants = db.query(ProductVariant).filter(ProductVariant.product_id == product_id).all()
    # Normalize image URLs in variants
    for variant in variants:
        if variant.image_url:
            variant.image_url = normalize_image_url(variant.image_url)
    return variants

@app.patch("/seller/variants/{variant_id}", response_model=VariantResponse, tags=["Seller"])
def update_product_variant(
    variant_id: int,
    variant: VariantUpdate,
    db: Session = Depends(get_db),
    current_seller: User = Depends(seller_only)
):
    """Update a variant (seller only, only their own products)"""
    existing_variant = db.query(ProductVariant).filter(ProductVariant.id == variant_id).first()
    if not existing_variant:
        raise HTTPException(status_code=404, detail="Variant not found")
    
    # Verify product belongs to seller
    product = db.query(ProductModel).filter(
        ProductModel.id == existing_variant.product_id,
        ProductModel.seller_id == current_seller.id
    ).first()
    if not product:
        raise HTTPException(status_code=404, detail="Variant not found or access denied")
    
    # Update fields
    variant_data = variant.model_dump(exclude_unset=True)
    for key, value in variant_data.items():
        setattr(existing_variant, key, value)
    
    existing_variant.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(existing_variant)
    # Normalize image URL
    if existing_variant.image_url:
        existing_variant.image_url = normalize_image_url(existing_variant.image_url)
    return existing_variant

@app.delete("/seller/variants/{variant_id}", tags=["Seller"])
def delete_product_variant(
    variant_id: int,
    db: Session = Depends(get_db),
    current_seller: User = Depends(seller_only)
):
    """Delete a variant (seller only, only their own products)"""
    variant = db.query(ProductVariant).filter(ProductVariant.id == variant_id).first()
    if not variant:
        raise HTTPException(status_code=404, detail="Variant not found")
    
    # Verify product belongs to seller
    product = db.query(ProductModel).filter(
        ProductModel.id == variant.product_id,
        ProductModel.seller_id == current_seller.id
    ).first()
    if not product:
        raise HTTPException(status_code=404, detail="Variant not found or access denied")
    
    db.delete(variant)
    db.commit()
    return {"message": "Variant deleted successfully"}

@app.delete("/seller/products/delete/{product_id}", tags=["Seller"])
def delete_seller_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_seller: User = Depends(seller_only)
):
    """Delete a product (seller only, only their own products)"""
    product = db.query(ProductModel).filter(
        ProductModel.id == product_id,
        ProductModel.seller_id == current_seller.id
    ).first()
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found or access denied")
    
    # Remove related cart items
    db.query(CartItem).filter(CartItem.product_id == product_id).delete()
    
    db.delete(product)
    db.commit()
    return {"message": "Product deleted successfully"}

@app.get("/seller/stats", tags=["Seller"])
def get_seller_stats(
    db: Session = Depends(get_db),
    current_seller: User = Depends(seller_only)
):
    """Get seller dashboard statistics (seller only)"""
    # Total products
    total_products = db.query(ProductModel).filter(
        ProductModel.seller_id == current_seller.id
    ).count()
    
    # Verified products
    verified_products = db.query(ProductModel).filter(
        ProductModel.seller_id == current_seller.id,
        ProductModel.is_verified == True
    ).count()
    
    # Pending products
    pending_products = db.query(ProductModel).filter(
        ProductModel.seller_id == current_seller.id,
        ProductModel.is_verified == False
    ).count()
    
    # Get all orders that contain products from this seller
    # First, get all product IDs for this seller
    seller_product_ids = [p.id for p in db.query(ProductModel).filter(
        ProductModel.seller_id == current_seller.id
    ).all()]
    
    if seller_product_ids:
        # Get orders that have items with seller's products
        orders_with_seller_products = db.query(Order).join(OrderItem).filter(
            OrderItem.product_id.in_(seller_product_ids)
        ).distinct().all()
        
        total_orders = len(orders_with_seller_products)
        
        # Calculate total revenue from seller's products
        total_revenue = 0.0
        for order in orders_with_seller_products:
            # Calculate seller's portion of each order
            order_items = db.query(OrderItem).filter(
                OrderItem.order_id == order.id,
                OrderItem.product_id.in_(seller_product_ids)
            ).all()
            for item in order_items:
                total_revenue += float(item.price) * int(item.quantity)
        
        # Pending orders (orders with status "Pending")
        pending_orders = len([o for o in orders_with_seller_products if o.status == "Pending"])
    else:
        total_orders = 0
        total_revenue = 0.0
        pending_orders = 0
    
    return {
        "total_products": total_products,
        "verified_products": verified_products,
        "pending_products": pending_products,
        "total_orders": total_orders,
        "pending_orders": pending_orders,
        "total_revenue": float(total_revenue)
    }

@app.get("/seller/orders", response_model=SellerOrderItemListResponse, tags=["Seller Orders"])
def get_seller_orders(
    status: str | None = Query(None, description="Filter by status: Pending, Accepted, Rejected, etc."),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    date_from: datetime | None = Query(None),
    date_to: datetime | None = Query(None),
    db: Session = Depends(get_db),
    current_seller: User = Depends(seller_only)
):
    """Get paginated list of order items for seller's products (seller only)"""
    # Query order items by seller_id
    query = db.query(OrderItem).filter(OrderItem.seller_id == current_seller.id)
    
    # Filter by status if provided
    if status:
        query = query.filter(OrderItem.status == status)
    
    # Join with Order for date filtering
    query = query.join(Order, OrderItem.order_id == Order.id)
    
    # Filter by date range if provided
    if date_from:
        query = query.filter(Order.ordered_at >= date_from)
    if date_to:
        query = query.filter(Order.ordered_at <= date_to)
    
    # Get total count
    total = query.count()
    
    # Paginate - order by Order.ordered_at or Order.created_at
    offset = (page - 1) * page_size
    # Use distinct to avoid duplicates from join, order by Order fields
    try:
        # Try ordering by ordered_at first, fallback to created_at
        order_items = query.distinct().order_by(desc(Order.ordered_at)).offset(offset).limit(page_size).all()
    except:
        # Fallback if ordered_at column doesn't exist yet
        order_items = query.distinct().order_by(desc(Order.created_at)).offset(offset).limit(page_size).all()
    
    # Build response with order and customer info
    items = []
    for item in order_items:
        order = db.query(Order).filter(Order.id == item.order_id).first()
        customer = db.query(User).filter(User.id == order.user_id).first() if order else None
        product = db.query(ProductModel).filter(ProductModel.id == item.product_id).first()
        if product:
            normalize_product_gender(product)
        
        items.append(SellerOrderItemResponse(
            id=item.id,
            order_id=item.order_id,
            product_id=item.product_id,
            quantity=item.quantity,
            price=item.price,
            seller_id=item.seller_id,
            status=item.status or "Pending",
            rejection_reason=item.rejection_reason,
            product=product,
            order_ordered_at=order.ordered_at if order else order.created_at if order else None,
            order_ship_name=order.ship_name if order else None,
            order_ship_phone=order.ship_phone if order else None,
            order_ship_address_line1=order.ship_address_line1 if order else None,
            order_ship_address_line2=order.ship_address_line2 if order else None,
            order_ship_city=order.ship_city if order else None,
            order_ship_state=order.ship_state if order else None,
            order_ship_country=order.ship_country if order else None,
            order_ship_pincode=order.ship_pincode if order else None,
            customer_username=customer.username if customer else None,
            customer_email=customer.email if customer else None
        ))
    
    return SellerOrderItemListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size
    )

@app.get("/seller/orders/{order_item_id}", response_model=SellerOrderItemResponse, tags=["Seller Orders"])
def get_seller_order_item(
    order_item_id: int,
    db: Session = Depends(get_db),
    current_seller: User = Depends(seller_only)
):
    """Get order item details (seller only)"""
    item = db.query(OrderItem).filter(
        OrderItem.id == order_item_id,
        OrderItem.seller_id == current_seller.id
    ).first()
    
    if not item:
        raise HTTPException(status_code=404, detail="Order item not found or access denied")
    
    order = db.query(Order).filter(Order.id == item.order_id).first()
    customer = db.query(User).filter(User.id == order.user_id).first() if order else None
    product = db.query(ProductModel).filter(ProductModel.id == item.product_id).first()
    if product:
        normalize_product_gender(product)
    
    return SellerOrderItemResponse(
        id=item.id,
        order_id=item.order_id,
        product_id=item.product_id,
        quantity=item.quantity,
        price=item.price,
        seller_id=item.seller_id,
        status=item.status or "Pending",
        rejection_reason=item.rejection_reason,
        product=product,
        order_ordered_at=order.ordered_at if order else order.created_at if order else None,
        order_ship_name=order.ship_name if order else None,
        order_ship_phone=order.ship_phone if order else None,
        order_ship_address_line1=order.ship_address_line1 if order else None,
        order_ship_address_line2=order.ship_address_line2 if order else None,
        order_ship_city=order.ship_city if order else None,
        order_ship_state=order.ship_state if order else None,
        order_ship_country=order.ship_country if order else None,
        order_ship_pincode=order.ship_pincode if order else None,
        customer_username=customer.username if customer else None,
        customer_email=customer.email if customer else None
    )

def update_order_status_from_items(order_id: int, db: Session):
    """Update order status based on all order items' statuses - simplified logic"""
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        return
    
    # Get all order items for this order
    order_items = db.query(OrderItem).filter(OrderItem.order_id == order_id).all()
    if not order_items:
        return
    
    # Count statuses - item-level statuses are primary
    statuses = [item.status for item in order_items]
    all_delivered = all(s == "Delivered" for s in statuses)
    all_rejected = all(s == "Rejected" for s in statuses)
    has_rejected = any(s == "Rejected" for s in statuses)
    
    # Simplified order status logic:
    # - "Completed" if all items are delivered
    # - "Cancelled" if all items are rejected
    # - "Active" otherwise (pending, accepted, shipped, etc.)
    if all_delivered:
        order.status = "Completed"
    elif all_rejected:
        order.status = "Cancelled"
    else:
        # Any other state (pending, accepted, shipped, etc.) = Active
        order.status = "Active"
    
    db.commit()

@app.patch("/seller/orders/{order_item_id}/accept", response_model=SellerOrderItemResponse, tags=["Seller Orders"])
def accept_order_item(
    order_item_id: int,
    db: Session = Depends(get_db),
    current_seller: User = Depends(seller_only)
):
    """Accept an order item (seller only)"""
    item = db.query(OrderItem).filter(
        OrderItem.id == order_item_id,
        OrderItem.seller_id == current_seller.id
    ).first()
    
    if not item:
        raise HTTPException(status_code=403, detail="Order item not found or access denied")
    
    # Allow accepting from Pending or Rejected status (idempotent)
    if item.status not in ["Pending", "Rejected"]:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot accept order item with status '{item.status}'. Only Pending or Rejected items can be accepted."
        )
    
    item.status = "Accepted"
    item.rejection_reason = None
    db.commit()
    db.refresh(item)
    
    # Update order status based on all items
    update_order_status_from_items(item.order_id, db)
    
    # Return updated item with full details
    order = db.query(Order).filter(Order.id == item.order_id).first()
    customer = db.query(User).filter(User.id == order.user_id).first() if order else None
    product = db.query(ProductModel).filter(ProductModel.id == item.product_id).first()
    if product:
        normalize_product_gender(product)
    
    return SellerOrderItemResponse(
        id=item.id,
        order_id=item.order_id,
        product_id=item.product_id,
        quantity=item.quantity,
        price=item.price,
        seller_id=item.seller_id,
        status=item.status,
        rejection_reason=item.rejection_reason,
        product=product,
        order_ordered_at=order.ordered_at if order else order.created_at if order else None,
        order_ship_name=order.ship_name if order else None,
        order_ship_phone=order.ship_phone if order else None,
        order_ship_address_line1=order.ship_address_line1 if order else None,
        order_ship_address_line2=order.ship_address_line2 if order else None,
        order_ship_city=order.ship_city if order else None,
        order_ship_state=order.ship_state if order else None,
        order_ship_country=order.ship_country if order else None,
        order_ship_pincode=order.ship_pincode if order else None,
        customer_username=customer.username if customer else None,
        customer_email=customer.email if customer else None
    )

@app.patch("/seller/orders/{order_item_id}/reject", response_model=SellerOrderItemResponse, tags=["Seller Orders"])
def reject_order_item(
    order_item_id: int,
    request: RejectOrderItemRequest,
    db: Session = Depends(get_db),
    current_seller: User = Depends(seller_only)
):
    """Reject an order item (seller only)"""
    item = db.query(OrderItem).filter(
        OrderItem.id == order_item_id,
        OrderItem.seller_id == current_seller.id
    ).first()
    
    if not item:
        raise HTTPException(status_code=403, detail="Order item not found or access denied")
    
    # Only allow rejecting from Pending or Accepted status
    if item.status not in ["Pending", "Accepted"]:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot reject order item with status '{item.status}'. Only Pending or Accepted items can be rejected."
        )
    
    item.status = "Rejected"
    item.rejection_reason = request.reason
    db.commit()
    db.refresh(item)
    
    # Update order status based on all items
    update_order_status_from_items(item.order_id, db)
    
    # Return updated item with full details
    order = db.query(Order).filter(Order.id == item.order_id).first()
    customer = db.query(User).filter(User.id == order.user_id).first() if order else None
    product = db.query(ProductModel).filter(ProductModel.id == item.product_id).first()
    if product:
        normalize_product_gender(product)
    
    return SellerOrderItemResponse(
        id=item.id,
        order_id=item.order_id,
        product_id=item.product_id,
        quantity=item.quantity,
        price=item.price,
        seller_id=item.seller_id,
        status=item.status,
        rejection_reason=item.rejection_reason,
        product=product,
        order_ordered_at=order.ordered_at if order else order.created_at if order else None,
        order_ship_name=order.ship_name if order else None,
        order_ship_phone=order.ship_phone if order else None,
        order_ship_address_line1=order.ship_address_line1 if order else None,
        order_ship_address_line2=order.ship_address_line2 if order else None,
        order_ship_city=order.ship_city if order else None,
        order_ship_state=order.ship_state if order else None,
        order_ship_country=order.ship_country if order else None,
        order_ship_pincode=order.ship_pincode if order else None,
        customer_username=customer.username if customer else None,
        customer_email=customer.email if customer else None
    )

# ==================== SELLER RETURN ROUTES ====================

@app.get("/seller/returns", response_model=ReturnListResponse, tags=["Seller Returns"])
def list_seller_returns(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_seller: User = Depends(seller_only)
):
    """List all return requests for seller's products"""
    # Get all order items with return requests for this seller
    query = (
        db.query(OrderItem)
        .filter(
            OrderItem.seller_id == current_seller.id,
            OrderItem.return_status != "None",
            OrderItem.return_status.isnot(None)
        )
        .order_by(OrderItem.return_requested_at.desc())
    )
    
    total = query.count()
    items = query.offset((page - 1) * page_size).limit(page_size).all()
    
    result = []
    for item in items:
        # Load product
        item.product = db.query(ProductModel).filter(ProductModel.id == item.product_id).first()
        if item.product:
            normalize_product_gender(item.product)
        
        # Load order info
        order = db.query(Order).filter(Order.id == item.order_id).first()
        customer = db.query(User).filter(User.id == order.user_id).first() if order else None
        
        # Build response
        return_item = ReturnItemResponse(
            id=item.id,
            order_id=item.order_id,
            product_id=item.product_id,
            quantity=item.quantity,
            price=item.price,
            seller_id=item.seller_id,
            status=item.status,
            rejection_reason=item.rejection_reason,
            return_status=item.return_status or "None",
            return_reason=item.return_reason,
            return_notes=item.return_notes,
            return_requested_at=item.return_requested_at,
            return_processed_at=item.return_processed_at,
            is_return_eligible=item.is_return_eligible if item.is_return_eligible is not None else True,
            product=item.product,
            order_ordered_at=order.ordered_at if order else None,
            order_ship_name=order.ship_name if order else None,
            order_ship_phone=order.ship_phone if order else None,
            order_ship_address_line1=order.ship_address_line1 if order else None,
            order_ship_address_line2=order.ship_address_line2 if order else None,
            order_ship_city=order.ship_city if order else None,
            order_ship_state=order.ship_state if order else None,
            order_ship_country=order.ship_country if order else None,
            order_ship_pincode=order.ship_pincode if order else None,
            customer_username=customer.username if customer else None,
            customer_email=customer.email if customer else None
        )
        result.append(return_item)
    
    return ReturnListResponse(
        items=result,
        total=total,
        page=page,
        page_size=page_size
    )

@app.get("/seller/returns/{order_item_id}", response_model=ReturnItemResponse, tags=["Seller Returns"])
def get_seller_return(
    order_item_id: int,
    db: Session = Depends(get_db),
    current_seller: User = Depends(seller_only)
):
    """Get return details for a specific order item"""
    item = db.query(OrderItem).filter(
        OrderItem.id == order_item_id,
        OrderItem.seller_id == current_seller.id
    ).first()
    
    if not item:
        raise HTTPException(status_code=404, detail="Return item not found or access denied")
    
    # Load product
    item.product = db.query(ProductModel).filter(ProductModel.id == item.product_id).first()
    if item.product:
        normalize_product_gender(item.product)
    
    # Load order info
    order = db.query(Order).filter(Order.id == item.order_id).first()
    customer = db.query(User).filter(User.id == order.user_id).first() if order else None
    
    return ReturnItemResponse(
        id=item.id,
        order_id=item.order_id,
        product_id=item.product_id,
        quantity=item.quantity,
        price=item.price,
        seller_id=item.seller_id,
        status=item.status,
        rejection_reason=item.rejection_reason,
        return_status=item.return_status or "None",
        return_reason=item.return_reason,
        return_notes=item.return_notes,
        return_requested_at=item.return_requested_at,
        return_processed_at=item.return_processed_at,
        is_return_eligible=item.is_return_eligible if item.is_return_eligible is not None else True,
        product=item.product,
        order_ordered_at=order.ordered_at if order else None,
        order_ship_name=order.ship_name if order else None,
        order_ship_phone=order.ship_phone if order else None,
        order_ship_address_line1=order.ship_address_line1 if order else None,
        order_ship_address_line2=order.ship_address_line2 if order else None,
        order_ship_city=order.ship_city if order else None,
        order_ship_state=order.ship_state if order else None,
        order_ship_country=order.ship_country if order else None,
        order_ship_pincode=order.ship_pincode if order else None,
        customer_username=customer.username if customer else None,
        customer_email=customer.email if customer else None
    )

@app.patch("/seller/returns/{order_item_id}/accept", response_model=ReturnItemResponse, tags=["Seller Returns"])
def accept_return(
    order_item_id: int,
    db: Session = Depends(get_db),
    current_seller: User = Depends(seller_only)
):
    """Seller accepts a return request"""
    item = db.query(OrderItem).filter(
        OrderItem.id == order_item_id,
        OrderItem.seller_id == current_seller.id
    ).first()
    
    if not item:
        raise HTTPException(status_code=404, detail="Return item not found or access denied")
    
    if item.return_status != "ReturnRequested":
        raise HTTPException(
            status_code=400,
            detail=f"Cannot accept return with status '{item.return_status}'. Only ReturnRequested returns can be accepted."
        )
    
    item.return_status = "ReturnAccepted"
    item.return_processed_at = datetime.utcnow()
    db.commit()
    db.refresh(item)
    
    # Load product and order info for response
    item.product = db.query(ProductModel).filter(ProductModel.id == item.product_id).first()
    if item.product:
        normalize_product_gender(item.product)
    order = db.query(Order).filter(Order.id == item.order_id).first()
    customer = db.query(User).filter(User.id == order.user_id).first() if order else None
    
    return ReturnItemResponse(
        id=item.id,
        order_id=item.order_id,
        product_id=item.product_id,
        quantity=item.quantity,
        price=item.price,
        seller_id=item.seller_id,
        status=item.status,
        rejection_reason=item.rejection_reason,
        return_status=item.return_status,
        return_reason=item.return_reason,
        return_notes=item.return_notes,
        return_requested_at=item.return_requested_at,
        return_processed_at=item.return_processed_at,
        is_return_eligible=item.is_return_eligible if item.is_return_eligible is not None else True,
        product=item.product,
        order_ordered_at=order.ordered_at if order else None,
        order_ship_name=order.ship_name if order else None,
        order_ship_phone=order.ship_phone if order else None,
        order_ship_address_line1=order.ship_address_line1 if order else None,
        order_ship_address_line2=order.ship_address_line2 if order else None,
        order_ship_city=order.ship_city if order else None,
        order_ship_state=order.ship_state if order else None,
        order_ship_country=order.ship_country if order else None,
        order_ship_pincode=order.ship_pincode if order else None,
        customer_username=customer.username if customer else None,
        customer_email=customer.email if customer else None
    )

@app.patch("/seller/returns/{order_item_id}/reject", response_model=ReturnItemResponse, tags=["Seller Returns"])
def reject_return(
    order_item_id: int,
    request: ReturnRejectRequest,
    db: Session = Depends(get_db),
    current_seller: User = Depends(seller_only)
):
    """Seller rejects a return request"""
    item = db.query(OrderItem).filter(
        OrderItem.id == order_item_id,
        OrderItem.seller_id == current_seller.id
    ).first()
    
    if not item:
        raise HTTPException(status_code=404, detail="Return item not found or access denied")
    
    if item.return_status != "ReturnRequested":
        raise HTTPException(
            status_code=400,
            detail=f"Cannot reject return with status '{item.return_status}'. Only ReturnRequested returns can be rejected."
        )
    
    item.return_status = "ReturnRejected"
    item.return_notes = request.notes
    item.return_processed_at = datetime.utcnow()
    db.commit()
    db.refresh(item)
    
    # Load product and order info for response
    item.product = db.query(ProductModel).filter(ProductModel.id == item.product_id).first()
    if item.product:
        normalize_product_gender(item.product)
    order = db.query(Order).filter(Order.id == item.order_id).first()
    customer = db.query(User).filter(User.id == order.user_id).first() if order else None
    
    return ReturnItemResponse(
        id=item.id,
        order_id=item.order_id,
        product_id=item.product_id,
        quantity=item.quantity,
        price=item.price,
        seller_id=item.seller_id,
        status=item.status,
        rejection_reason=item.rejection_reason,
        return_status=item.return_status,
        return_reason=item.return_reason,
        return_notes=item.return_notes,
        return_requested_at=item.return_requested_at,
        return_processed_at=item.return_processed_at,
        is_return_eligible=item.is_return_eligible if item.is_return_eligible is not None else True,
        product=item.product,
        order_ordered_at=order.ordered_at if order else None,
        order_ship_name=order.ship_name if order else None,
        order_ship_phone=order.ship_phone if order else None,
        order_ship_address_line1=order.ship_address_line1 if order else None,
        order_ship_address_line2=order.ship_address_line2 if order else None,
        order_ship_city=order.ship_city if order else None,
        order_ship_state=order.ship_state if order else None,
        order_ship_country=order.ship_country if order else None,
        order_ship_pincode=order.ship_pincode if order else None,
        customer_username=customer.username if customer else None,
        customer_email=customer.email if customer else None
    )

@app.patch("/seller/returns/{order_item_id}/mark-received", response_model=ReturnItemResponse, tags=["Seller Returns"])
def mark_return_received(
    order_item_id: int,
    db: Session = Depends(get_db),
    current_seller: User = Depends(seller_only)
):
    """Seller marks returned item as physically received"""
    item = db.query(OrderItem).filter(
        OrderItem.id == order_item_id,
        OrderItem.seller_id == current_seller.id
    ).first()
    
    if not item:
        raise HTTPException(status_code=404, detail="Return item not found or access denied")
    
    if item.return_status not in ["ReturnAccepted", "ReturnInTransit"]:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot mark as received with status '{item.return_status}'. Only ReturnAccepted or ReturnInTransit returns can be marked as received."
        )
    
    item.return_status = "ReturnReceived"
    item.return_processed_at = datetime.utcnow()
    db.commit()
    db.refresh(item)
    
    # Load product and order info for response
    item.product = db.query(ProductModel).filter(ProductModel.id == item.product_id).first()
    if item.product:
        normalize_product_gender(item.product)
    order = db.query(Order).filter(Order.id == item.order_id).first()
    customer = db.query(User).filter(User.id == order.user_id).first() if order else None
    
    return ReturnItemResponse(
        id=item.id,
        order_id=item.order_id,
        product_id=item.product_id,
        quantity=item.quantity,
        price=item.price,
        seller_id=item.seller_id,
        status=item.status,
        rejection_reason=item.rejection_reason,
        return_status=item.return_status,
        return_reason=item.return_reason,
        return_notes=item.return_notes,
        return_requested_at=item.return_requested_at,
        return_processed_at=item.return_processed_at,
        is_return_eligible=item.is_return_eligible if item.is_return_eligible is not None else True,
        product=item.product,
        order_ordered_at=order.ordered_at if order else None,
        order_ship_name=order.ship_name if order else None,
        order_ship_phone=order.ship_phone if order else None,
        order_ship_address_line1=order.ship_address_line1 if order else None,
        order_ship_address_line2=order.ship_address_line2 if order else None,
        order_ship_city=order.ship_city if order else None,
        order_ship_state=order.ship_state if order else None,
        order_ship_country=order.ship_country if order else None,
        order_ship_pincode=order.ship_pincode if order else None,
        customer_username=customer.username if customer else None,
        customer_email=customer.email if customer else None
    )

# ==================== ADMIN ROUTES ====================

@app.get("/admin/sellers", response_model=list[SellerResponse], tags=["Admin"])
def list_sellers(
    db: Session = Depends(get_db),
    current_admin: User = Depends(admin_only)
):
    """List all sellers (admin only)"""
    sellers = db.query(User).filter(User.role == "seller").all()
    return sellers

@app.get("/admin/users", response_model=list[UserResponse], tags=["Admin"])
def list_all_users(
    db: Session = Depends(get_db),
    current_admin: User = Depends(admin_only)
):
    """List all users (admin only) - returns customers and sellers"""
    users = db.query(User).order_by(User.id.desc()).all()
    return users

@app.get("/admin/users/{user_id}", response_model=UserDetailResponse, tags=["Admin"])
def get_user_detail(
    user_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(admin_only)
):
    """Get full user profile with orders, addresses, and returns (admin only)"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get all addresses for this user
    addresses = db.query(Address).filter(Address.user_id == user_id).all()
    
    # Get all orders for this user with order items
    orders = db.query(Order).filter(Order.user_id == user_id).order_by(Order.created_at.desc()).all()
    # Load order items with product details for each order
    for order in orders:
        order_items = db.query(OrderItem).filter(OrderItem.order_id == order.id).all()
        for item in order_items:
            item.product = db.query(ProductModel).filter(ProductModel.id == item.product_id).first()
            if item.product:
                normalize_product_gender(item.product)
        order.order_items = order_items
    
    # Get returns (orders with status Cancelled or Returned)
    returns = db.query(Order).filter(
        Order.user_id == user_id,
        or_(Order.status == "Cancelled", Order.status == "Returned")
    ).order_by(Order.created_at.desc()).all()
    # Load order items with product details for returns
    for return_order in returns:
        order_items = db.query(OrderItem).filter(OrderItem.order_id == return_order.id).all()
        for item in order_items:
            item.product = db.query(ProductModel).filter(ProductModel.id == item.product_id).first()
            if item.product:
                normalize_product_gender(item.product)
        return_order.order_items = order_items
    
    # Build response
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "phone": user.phone,
        "role": user.role or "customer",
        "is_active": user.is_active,
        "is_approved": user.is_approved if user.role == "seller" else None,  # Only show for sellers
        "created_at": None,  # User model doesn't have created_at, but we can add it later if needed
        "addresses": addresses,
        "orders": orders,
        "returns": returns
    }

@app.get("/admin/orders", response_model=list[OrderResponse], tags=["Admin"])
def admin_list_orders(
    status: str | None = Query(None),
    seller_id: int | None = Query(None),
    date_from: datetime | None = Query(None),
    date_to: datetime | None = Query(None),
    db: Session = Depends(get_db),
    current_admin: User = Depends(admin_only)
):
    """List all orders with filters (admin only)"""
    query = db.query(Order)
    
    if status:
        query = query.filter(Order.status == status)
    if date_from:
        query = query.filter(Order.ordered_at >= date_from if Order.ordered_at else Order.created_at >= date_from)
    if date_to:
        query = query.filter(Order.ordered_at <= date_to if Order.ordered_at else Order.created_at <= date_to)
    
    orders = query.order_by(Order.ordered_at.desc() if Order.ordered_at else Order.created_at.desc()).all()
    
    # Load order items with product details
    for order in orders:
        order_items = db.query(OrderItem).filter(OrderItem.order_id == order.id).all()
        if seller_id:
            order_items = [item for item in order_items if item.seller_id == seller_id]
        for item in order_items:
            item.product = db.query(ProductModel).filter(ProductModel.id == item.product_id).first()
            if item.product:
                normalize_product_gender(item.product)
        order.order_items = order_items
    
    return orders

@app.get("/admin/order-items", response_model=list[OrderItemResponse], tags=["Admin"])
def admin_list_order_items(
    status: str | None = Query(None),
    seller_id: int | None = Query(None),
    db: Session = Depends(get_db),
    current_admin: User = Depends(admin_only)
):
    """List all order items with filters (admin only)"""
    query = db.query(OrderItem)
    
    if status:
        query = query.filter(OrderItem.status == status)
    if seller_id:
        query = query.filter(OrderItem.seller_id == seller_id)
    
    items = query.order_by(OrderItem.id.desc()).all()
    
    # Load product details
    for item in items:
        item.product = db.query(ProductModel).filter(ProductModel.id == item.product_id).first()
        if item.product:
            normalize_product_gender(item.product)
    
    return items

@app.patch("/admin/order-items/{order_item_id}/override-status", response_model=OrderItemResponse, tags=["Admin"])
def admin_override_order_item_status(
    order_item_id: int,
    request: OverrideOrderItemStatusRequest,
    db: Session = Depends(get_db),
    current_admin: User = Depends(admin_only)
):
    """Override order item status (admin only)"""
    allowed_statuses = ["Accepted", "Rejected", "Cancelled", "Shipped", "Delivered"]
    if request.status not in allowed_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"Status must be one of: {', '.join(allowed_statuses)}"
        )
    
    item = db.query(OrderItem).filter(OrderItem.id == order_item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Order item not found")
    
    item.status = request.status
    if request.reason:
        item.rejection_reason = request.reason
    elif request.status != "Rejected":
        item.rejection_reason = None
    
    db.commit()
    db.refresh(item)
    
    # Load product details
    item.product = db.query(ProductModel).filter(ProductModel.id == item.product_id).first()
    if item.product:
        normalize_product_gender(item.product)
    
    return item

@app.delete("/admin/users/{user_id}", tags=["Admin"])
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(admin_only)
):
    """Delete a user account and all related data (admin only)"""
    # Prevent admin from deleting themselves
    if user_id == current_admin.id:
        raise HTTPException(
            status_code=400,
            detail="You cannot delete your own account"
        )
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    username = user.username
    
    # Delete related data (cascade should handle most, but being explicit)
    # Delete cart items
    db.query(CartItem).filter(CartItem.user_id == user_id).delete()
    
    # Delete wishlist items
    db.query(WishlistItem).filter(WishlistItem.user_id == user_id).delete()
    
    # Delete addresses
    db.query(Address).filter(Address.user_id == user_id).delete()
    
    # Delete order items (via cascade from orders)
    # Get all order IDs first
    order_ids = [o.id for o in db.query(Order).filter(Order.user_id == user_id).all()]
    if order_ids:
        db.query(OrderItem).filter(OrderItem.order_id.in_(order_ids)).delete()
    
    # Delete orders
    db.query(Order).filter(Order.user_id == user_id).delete()
    
    # If seller, delete their products
    if user.role == "seller":
        # Delete cart items referencing seller's products
        seller_product_ids = [p.id for p in db.query(ProductModel).filter(ProductModel.seller_id == user_id).all()]
        if seller_product_ids:
            db.query(CartItem).filter(CartItem.product_id.in_(seller_product_ids)).delete()
            db.query(OrderItem).filter(OrderItem.product_id.in_(seller_product_ids)).delete()
        # Delete products
        db.query(ProductModel).filter(ProductModel.seller_id == user_id).delete()
    
    # Delete the user
    db.delete(user)
    db.commit()
    
    logger.info(f"User {username} (ID: {user_id}) deleted by admin {current_admin.username}")
    return {"message": f"User {username} has been deleted successfully"}

@app.get("/admin/orders", response_model=list[OrderResponse], tags=["Admin"])
def list_all_orders(
    db: Session = Depends(get_db),
    current_admin: User = Depends(admin_only)
):
    """List all orders (admin only)"""
    orders = db.query(Order).order_by(Order.created_at.desc()).all()
    # Load order items with product details
    for order in orders:
        order_items = db.query(OrderItem).filter(OrderItem.order_id == order.id).all()
        for item in order_items:
            item.product = db.query(ProductModel).filter(ProductModel.id == item.product_id).first()
            if item.product:
                normalize_product_gender(item.product)
        order.order_items = order_items
    return orders

@app.get("/admin/orders/{order_id}", response_model=OrderResponse, tags=["Admin"])
def get_order_details(
    order_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(admin_only)
):
    """Get order details (admin only)"""
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Load order items with product details and seller info
    order_items = db.query(OrderItem).filter(OrderItem.order_id == order.id).all()
    for item in order_items:
        item.product = db.query(ProductModel).filter(ProductModel.id == item.product_id).first()
        if item.product:
            normalize_product_gender(item.product)
        # Add seller info to product if seller_id exists
        if item.seller_id:
            seller = db.query(User).filter(User.id == item.seller_id).first()
            if seller and item.product:
                # Add seller info as attributes (will be serialized in response)
                item.product.seller_username = seller.username
                item.product.seller_email = seller.email
    order.order_items = order_items
    
    return order

@app.patch("/admin/orders/{order_id}/status", tags=["Admin"])
def update_order_status(
    order_id: int,
    status: str = Query(..., description="New order status"),
    db: Session = Depends(get_db),
    current_admin: User = Depends(admin_only)
):
    """Update order status (admin only)"""
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    order.status = status
    db.commit()
    return {"message": f"Order status updated to {status}"}

@app.get("/admin/stats", tags=["Admin"])
def get_admin_stats(
    db: Session = Depends(get_db),
    current_admin: User = Depends(admin_only)
):
    """Get admin dashboard statistics (admin only)"""
    total_users = db.query(User).count()
    total_customers = db.query(User).filter(User.role == "customer").count()
    total_sellers = db.query(User).filter(User.role == "seller").count()
    total_products = db.query(ProductModel).count()
    pending_products = db.query(ProductModel).filter(ProductModel.is_verified == False).count()
    total_orders = db.query(Order).count()
    
    # Calculate total revenue
    total_revenue = db.query(Order).with_entities(
        db.func.sum(Order.total_price)
    ).scalar() or 0.0
    
    # Pending orders
    pending_orders = db.query(Order).filter(Order.status == "Pending").count()
    
    return {
        "total_users": total_users,
        "total_customers": total_customers,
        "total_sellers": total_sellers,
        "total_products": total_products,
        "pending_products": pending_products,
        "total_orders": total_orders,
        "pending_orders": pending_orders,
        "total_revenue": float(total_revenue)
    }

# ==================== ADMIN RETURN ROUTES ====================

@app.get("/admin/returns", response_model=ReturnListResponse, tags=["Admin Returns"])
def admin_list_returns(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    seller_id: int | None = Query(None),
    customer_id: int | None = Query(None),
    status: str | None = Query(None),
    db: Session = Depends(get_db),
    current_admin: User = Depends(admin_only)
):
    """List all return requests with filters (admin only)"""
    query = (
        db.query(OrderItem)
        .filter(
            OrderItem.return_status != "None",
            OrderItem.return_status.isnot(None)
        )
    )
    
    if seller_id:
        query = query.filter(OrderItem.seller_id == seller_id)
    if status:
        query = query.filter(OrderItem.return_status == status)
    if customer_id:
        query = query.join(Order, OrderItem.order_id == Order.id).filter(Order.user_id == customer_id)
    
    query = query.order_by(OrderItem.return_requested_at.desc())
    
    total = query.count()
    items = query.offset((page - 1) * page_size).limit(page_size).all()
    
    result = []
    for item in items:
        # Load product
        item.product = db.query(ProductModel).filter(ProductModel.id == item.product_id).first()
        if item.product:
            normalize_product_gender(item.product)
        
        # Load order info
        order = db.query(Order).filter(Order.id == item.order_id).first()
        customer = db.query(User).filter(User.id == order.user_id).first() if order else None
        
        # Build response
        return_item = ReturnItemResponse(
            id=item.id,
            order_id=item.order_id,
            product_id=item.product_id,
            quantity=item.quantity,
            price=item.price,
            seller_id=item.seller_id,
            status=item.status,
            rejection_reason=item.rejection_reason,
            return_status=item.return_status or "None",
            return_reason=item.return_reason,
            return_notes=item.return_notes,
            return_requested_at=item.return_requested_at,
            return_processed_at=item.return_processed_at,
            is_return_eligible=item.is_return_eligible if item.is_return_eligible is not None else True,
            product=item.product,
            order_ordered_at=order.ordered_at if order else None,
            order_ship_name=order.ship_name if order else None,
            order_ship_phone=order.ship_phone if order else None,
            order_ship_address_line1=order.ship_address_line1 if order else None,
            order_ship_address_line2=order.ship_address_line2 if order else None,
            order_ship_city=order.ship_city if order else None,
            order_ship_state=order.ship_state if order else None,
            order_ship_country=order.ship_country if order else None,
            order_ship_pincode=order.ship_pincode if order else None,
            customer_username=customer.username if customer else None,
            customer_email=customer.email if customer else None
        )
        result.append(return_item)
    
    return ReturnListResponse(
        items=result,
        total=total,
        page=page,
        page_size=page_size
    )

@app.get("/admin/returns/{order_item_id}", response_model=ReturnItemResponse, tags=["Admin Returns"])
def admin_get_return(
    order_item_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(admin_only)
):
    """Get return details for a specific order item (admin only)"""
    item = db.query(OrderItem).filter(OrderItem.id == order_item_id).first()
    
    if not item:
        raise HTTPException(status_code=404, detail="Return item not found")
    
    # Load product
    item.product = db.query(ProductModel).filter(ProductModel.id == item.product_id).first()
    if item.product:
        normalize_product_gender(item.product)
    
    # Load order info
    order = db.query(Order).filter(Order.id == item.order_id).first()
    customer = db.query(User).filter(User.id == order.user_id).first() if order else None
    
    return ReturnItemResponse(
        id=item.id,
        order_id=item.order_id,
        product_id=item.product_id,
        quantity=item.quantity,
        price=item.price,
        seller_id=item.seller_id,
        status=item.status,
        rejection_reason=item.rejection_reason,
        return_status=item.return_status or "None",
        return_reason=item.return_reason,
        return_notes=item.return_notes,
        return_requested_at=item.return_requested_at,
        return_processed_at=item.return_processed_at,
        is_return_eligible=item.is_return_eligible if item.is_return_eligible is not None else True,
        product=item.product,
        order_ordered_at=order.ordered_at if order else None,
        order_ship_name=order.ship_name if order else None,
        order_ship_phone=order.ship_phone if order else None,
        order_ship_address_line1=order.ship_address_line1 if order else None,
        order_ship_address_line2=order.ship_address_line2 if order else None,
        order_ship_city=order.ship_city if order else None,
        order_ship_state=order.ship_state if order else None,
        order_ship_country=order.ship_country if order else None,
        order_ship_pincode=order.ship_pincode if order else None,
        customer_username=customer.username if customer else None,
        customer_email=customer.email if customer else None
    )

@app.patch("/admin/returns/{order_item_id}/override-status", response_model=ReturnItemResponse, tags=["Admin Returns"])
def admin_override_return_status(
    order_item_id: int,
    request: ReturnOverrideRequest,
    db: Session = Depends(get_db),
    current_admin: User = Depends(admin_only)
):
    """Admin overrides return status (admin only)"""
    # Validate status
    allowed_statuses = ["None", "ReturnRequested", "ReturnAccepted", "ReturnRejected", "ReturnInTransit", "ReturnReceived", "RefundProcessed"]
    if request.status not in allowed_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid return status. Allowed values: {', '.join(allowed_statuses)}"
        )
    
    item = db.query(OrderItem).filter(OrderItem.id == order_item_id).first()
    
    if not item:
        raise HTTPException(status_code=404, detail="Return item not found")
    
    item.return_status = request.status
    if request.notes:
        item.return_notes = request.notes
    if request.status in ["ReturnAccepted", "ReturnRejected", "ReturnReceived", "RefundProcessed"]:
        item.return_processed_at = datetime.utcnow()
    
    db.commit()
    db.refresh(item)
    
    # Load product and order info for response
    item.product = db.query(ProductModel).filter(ProductModel.id == item.product_id).first()
    if item.product:
        normalize_product_gender(item.product)
    order = db.query(Order).filter(Order.id == item.order_id).first()
    customer = db.query(User).filter(User.id == order.user_id).first() if order else None
    
    return ReturnItemResponse(
        id=item.id,
        order_id=item.order_id,
        product_id=item.product_id,
        quantity=item.quantity,
        price=item.price,
        seller_id=item.seller_id,
        status=item.status,
        rejection_reason=item.rejection_reason,
        return_status=item.return_status,
        return_reason=item.return_reason,
        return_notes=item.return_notes,
        return_requested_at=item.return_requested_at,
        return_processed_at=item.return_processed_at,
        is_return_eligible=item.is_return_eligible if item.is_return_eligible is not None else True,
        product=item.product,
        order_ordered_at=order.ordered_at if order else None,
        order_ship_name=order.ship_name if order else None,
        order_ship_phone=order.ship_phone if order else None,
        order_ship_address_line1=order.ship_address_line1 if order else None,
        order_ship_address_line2=order.ship_address_line2 if order else None,
        order_ship_city=order.ship_city if order else None,
        order_ship_state=order.ship_state if order else None,
        order_ship_country=order.ship_country if order else None,
        order_ship_pincode=order.ship_pincode if order else None,
        customer_username=customer.username if customer else None,
        customer_email=customer.email if customer else None
    )

# ==================== ADMIN ANALYTICS ENDPOINTS ====================

from sqlalchemy import func

@app.get("/admin/stats/kpis", tags=["Admin"])
def get_admin_kpis(
    db: Session = Depends(get_db),
    current_admin: User = Depends(admin_only)
):
    """Get high-level KPIs for admin dashboard"""
    # Platform Overview
    total_users = db.query(User).count()
    total_sellers = db.query(User).filter(User.role == "seller").count()
    verified_sellers = db.query(User).filter(
        User.role == "seller",
        User.is_approved == True,
        User.is_active == True
    ).count()
    pending_seller_approvals = db.query(User).filter(
        User.role == "seller",
        User.is_approved == False,
        User.is_active == True
    ).count()
    
    # Catalog Health
    total_products = db.query(ProductModel).count()
    verified_products = db.query(ProductModel).filter(ProductModel.is_verified == True).count()
    pending_product_verifications = db.query(ProductModel).filter(ProductModel.is_verified == False).count()
    
    # Orders & Business
    total_orders = db.query(Order).count()
    revenue_total = db.query(func.sum(Order.total_price)).scalar() or 0.0
    
    # Calculate average order value
    if total_orders > 0:
        avg_order_value = float(revenue_total) / total_orders
    else:
        avg_order_value = 0.0
    
    # Today's orders
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    daily_orders_today = db.query(Order).filter(Order.created_at >= today_start).count()
    
    # Returns and Cancellations (using cancelled orders as returns for now)
    returns_requested = db.query(Order).filter(
        or_(Order.status == "Cancelled", Order.status == "Returned")
    ).count()
    total_cancellations = db.query(Order).filter(Order.status == "Cancelled").count()
    
    return {
        "total_users": total_users,
        "total_sellers": total_sellers,
        "total_verified_sellers": verified_sellers,
        "pending_seller_approvals": pending_seller_approvals,
        "total_products": total_products,
        "verified_products": verified_products,
        "pending_product_verifications": pending_product_verifications,
        "total_orders": total_orders,
        "revenue_total": float(revenue_total),
        "avg_order_value": round(avg_order_value, 2),
        "daily_orders_today": daily_orders_today,
        "returns_requested": returns_requested,
        "total_cancellations": total_cancellations
    }

@app.get("/admin/stats/orders-trend", tags=["Admin"])
def get_orders_trend(
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    current_admin: User = Depends(admin_only)
):
    """Get orders trend over the past N days"""
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days)
    
    # Query orders grouped by date (SQLite compatible)
    # SQLite uses date() function, but SQLAlchemy needs func.date() or we can use Python grouping
    orders = db.query(Order).filter(
        Order.created_at >= start_date
    ).all()
    
    # Group by date in Python (more compatible across databases)
    orders_by_date = {}
    for order in orders:
        order_date = order.created_at.date() if order.created_at else start_date.date()
        if order_date not in orders_by_date:
            orders_by_date[order_date] = {"order_count": 0, "revenue": 0.0}
        orders_by_date[order_date]["order_count"] += 1
        orders_by_date[order_date]["revenue"] += float(order.total_price or 0.0)
    
    # Create a complete date range
    date_dict = {}
    current_date = start_date.date()
    end_date_only = end_date.date()
    
    while current_date <= end_date_only:
        date_dict[current_date] = {"date": current_date.isoformat(), "order_count": 0, "revenue": 0.0}
        current_date += timedelta(days=1)
    
    # Fill in actual data
    for date_key, data in orders_by_date.items():
        if date_key in date_dict:
            date_dict[date_key] = {
                "date": date_key.isoformat(),
                "order_count": data["order_count"],
                "revenue": float(data["revenue"])
            }
    
    return list(date_dict.values())

@app.get("/admin/stats/category-sales", tags=["Admin"])
def get_category_sales(
    db: Session = Depends(get_db),
    current_admin: User = Depends(admin_only)
):
    """Get sales by category (pie chart data)"""
    # Join orders -> order_items -> products to get category sales
    category_stats = db.query(
        ProductModel.category,
        func.sum(OrderItem.price * OrderItem.quantity).label('revenue'),
        func.sum(OrderItem.quantity).label('order_count')
    ).join(
        OrderItem, OrderItem.product_id == ProductModel.id
    ).join(
        Order, Order.id == OrderItem.order_id
    ).filter(
        ProductModel.category.isnot(None),
        ProductModel.category != ''
    ).group_by(
        ProductModel.category
    ).all()
    
    result = []
    for row in category_stats:
        result.append({
            "category_name": row.category or "Uncategorized",
            "revenue_contribution": float(row.revenue or 0.0),
            "order_count": int(row.order_count or 0)
        })
    
    # If no category data, return empty list
    return result if result else [{"category_name": "No Data", "revenue_contribution": 0.0, "order_count": 0}]

@app.get("/admin/stats/top-sellers", tags=["Admin"])
def get_top_sellers(
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
    current_admin: User = Depends(admin_only)
):
    """Get top sellers by revenue"""
    # Get sellers with their total sales
    seller_stats = db.query(
        User.id.label('seller_id'),
        User.username.label('seller_name'),
        func.sum(OrderItem.price * OrderItem.quantity).label('total_sales'),
        func.count(func.distinct(Order.id)).label('order_count'),
        User.is_approved.label('is_verified')
    ).join(
        ProductModel, ProductModel.seller_id == User.id
    ).join(
        OrderItem, OrderItem.product_id == ProductModel.id
    ).join(
        Order, Order.id == OrderItem.order_id
    ).filter(
        User.role == "seller"
    ).group_by(
        User.id, User.username, User.is_approved
    ).order_by(
        func.sum(OrderItem.price * OrderItem.quantity).desc()
    ).limit(limit).all()
    
    result = []
    for row in seller_stats:
        result.append({
            "seller_id": row.seller_id,
            "seller_name": row.seller_name,
            "total_sales": float(row.total_sales or 0.0),
            "order_count": int(row.order_count or 0),
            "is_verified": bool(row.is_verified)
        })
    
    return result

@app.get("/admin/stats/top-products", tags=["Admin"])
def get_top_products(
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
    current_admin: User = Depends(admin_only)
):
    """Get top products by sales"""
    # Get products with their sales stats
    product_stats = db.query(
        ProductModel.id.label('product_id'),
        ProductModel.name.label('product_name'),
        func.sum(OrderItem.price * OrderItem.quantity).label('total_sales'),
        func.sum(OrderItem.quantity).label('units_sold')
    ).join(
        OrderItem, OrderItem.product_id == ProductModel.id
    ).join(
        Order, Order.id == OrderItem.order_id
    ).group_by(
        ProductModel.id, ProductModel.name
    ).order_by(
        func.sum(OrderItem.price * OrderItem.quantity).desc()
    ).limit(limit).all()
    
    result = []
    for row in product_stats:
        result.append({
            "product_id": row.product_id,
            "product_name": row.product_name,
            "total_sales": float(row.total_sales or 0.0),
            "units_sold": int(row.units_sold or 0),
            "rating": None  # Placeholder - can be added if rating system exists
        })
    
    return result

@app.get("/admin/stats/returns-stats", tags=["Admin"])
def get_returns_stats(
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    current_admin: User = Depends(admin_only)
):
    """Get returns statistics"""
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days)
    
    # Get cancelled/returned orders in the period
    returned_orders = db.query(Order).filter(
        Order.created_at >= start_date,
        or_(Order.status == "Cancelled", Order.status == "Returned")
    ).all()
    
    total_returns = len(returned_orders)
    
    # Calculate return rate
    total_orders_in_period = db.query(Order).filter(
        Order.created_at >= start_date
    ).count()
    
    if total_orders_in_period > 0:
        return_rate = (total_returns / total_orders_in_period) * 100
    else:
        return_rate = 0.0
    
    # Return reason distribution (using status as reason for now)
    reason_distribution = {}
    for order in returned_orders:
        reason = order.status
        reason_distribution[reason] = reason_distribution.get(reason, 0) + 1
    
    return {
        "return_reason_distribution": reason_distribution,
        "total_returns": total_returns,
        "return_rate": round(return_rate, 2)
    }

@app.get("/admin/stats/platform-health", tags=["Admin"])
def get_platform_health(
    db: Session = Depends(get_db),
    current_admin: User = Depends(admin_only)
):
    """Get platform health metrics"""
    # Out of stock rate
    total_products = db.query(ProductModel).count()
    if total_products > 0:
        # Assuming stock_quantity field exists or using a placeholder
        # For now, we'll calculate based on products with no stock
        # This is a placeholder - adjust based on actual stock tracking
        out_of_stock_products = 0  # Placeholder
        out_of_stock_rate = 0.0  # Placeholder
    else:
        out_of_stock_rate = 0.0
    
    # Verified listing rate
    if total_products > 0:
        verified_products = db.query(ProductModel).filter(ProductModel.is_verified == True).count()
        verified_listing_rate = (verified_products / total_products) * 100
    else:
        verified_listing_rate = 0.0
    
    # Average image quality score (placeholder)
    avg_image_quality_score = 85.0  # Placeholder
    
    # Seller response time average (placeholder - would need message/response tracking)
    seller_response_time_avg = 24.0  # Placeholder in hours
    
    # Order fulfillment average days
    fulfilled_orders = db.query(Order).filter(
        Order.status.in_(["Shipped", "Delivered", "Paid"])
    ).all()
    
    if fulfilled_orders:
        total_days = 0
        count = 0
        for order in fulfilled_orders:
            if order.created_at:
                # Calculate days from creation to now (or to status change if tracked)
                days_diff = (datetime.utcnow() - order.created_at).total_seconds() / 86400
                total_days += days_diff
                count += 1
        order_fulfillment_avg_days = total_days / count if count > 0 else 0.0
    else:
        order_fulfillment_avg_days = 0.0
    
    return {
        "out_of_stock_rate": round(out_of_stock_rate, 2),
        "verified_listing_rate": round(verified_listing_rate, 2),
        "avg_image_quality_score": round(avg_image_quality_score, 2),
        "seller_response_time_avg": round(seller_response_time_avg, 2),
        "order_fulfillment_avg_days": round(order_fulfillment_avg_days, 2)
    }

@app.post("/admin/sellers/approve/{user_id}", tags=["Admin"])
def approve_seller(
    user_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(admin_only)
):
    """Approve a seller account (admin only)"""
    seller = db.query(User).filter(
        User.id == user_id,
        User.role == "seller"
    ).first()
    
    if not seller:
        raise HTTPException(status_code=404, detail="Seller not found")
    
    if not seller.is_active:
        raise HTTPException(status_code=400, detail="Seller must verify email first")
    
    seller.is_approved = True
    db.commit()
    return {"message": f"Seller {seller.username} approved successfully"}

@app.post("/admin/sellers/reject/{user_id}", tags=["Admin"])
def reject_seller(
    user_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(admin_only)
):
    """Reject a seller account (admin only)"""
    seller = db.query(User).filter(
        User.id == user_id,
        User.role == "seller"
    ).first()
    
    if not seller:
        raise HTTPException(status_code=404, detail="Seller not found")
    
    seller.is_approved = False
    db.commit()
    return {"message": f"Seller {seller.username} rejected"}

@app.post("/admin/sellers/block/{user_id}", tags=["Admin"])
def block_seller(
    user_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(admin_only)
):
    """Block a seller account (admin only) - sets is_active to False"""
    seller = db.query(User).filter(
        User.id == user_id,
        User.role == "seller"
    ).first()
    
    if not seller:
        raise HTTPException(status_code=404, detail="Seller not found")
    
    seller.is_active = False
    seller.is_approved = False
    db.commit()
    return {"message": f"Seller {seller.username} has been blocked"}

@app.delete("/admin/sellers/{user_id}", tags=["Admin"])
def delete_seller(
    user_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(admin_only)
):
    """Delete a seller account (admin only) - permanently removes seller"""
    seller = db.query(User).filter(
        User.id == user_id,
        User.role == "seller"
    ).first()
    
    if not seller:
        raise HTTPException(status_code=404, detail="Seller not found")
    
    # Delete seller's products first (cascade should handle this, but being explicit)
    db.query(ProductModel).filter(ProductModel.seller_id == user_id).delete()
    
    # Delete the seller
    db.delete(seller)
    db.commit()
    return {"message": f"Seller {seller.username} has been deleted"}

@app.get("/admin/products/pending", response_model=list[ProductWithSellerInfo], tags=["Admin"])
def get_pending_products(
    db: Session = Depends(get_db),
    current_admin: User = Depends(admin_only)
):
    """Get all pending products with seller information (admin only)"""
    products = db.query(ProductModel).filter(
        ProductModel.verification_status == "Pending"
    ).order_by(desc(ProductModel.submitted_at), desc(ProductModel.id)).all()
    
    result = []
    for product in products:
        normalize_product_gender(product)
        # Convert SQLAlchemy model to dict
        product_dict = {
            "id": product.id,
            "name": product.name,
            "description": product.description,
            "image_url": product.image_url,
            "price": product.price,
            "discounted_price": product.discounted_price,
            "gender": product.gender,
            "category": product.category,
            "seller_id": product.seller_id,
            "is_verified": product.is_verified,
            "verification_status": product.verification_status,
            "verification_notes": product.verification_notes,
            "submitted_at": product.submitted_at,
            "seller_username": None,
            "seller_email": None,
            "seller_phone": None
        }
        if product.seller_id:
            seller = db.query(User).filter(User.id == product.seller_id).first()
            if seller:
                product_dict["seller_username"] = seller.username
                product_dict["seller_email"] = seller.email
                product_dict["seller_phone"] = seller.phone
        result.append(ProductWithSellerInfo(**product_dict))
    
    return result

@app.get("/admin/products/{product_id}", response_model=ProductWithSellerInfo, tags=["Admin"])
def get_admin_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(admin_only)
):
    """Get any product by ID with seller information (admin only) - includes unverified products"""
    product = db.query(ProductModel).filter(ProductModel.id == product_id).first()
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    normalize_product_gender(product)
    
    # Convert SQLAlchemy model to dict
    product_dict = {
        "id": product.id,
        "name": product.name,
        "description": product.description,
        "image_url": product.image_url,
        "price": product.price,
        "discounted_price": product.discounted_price,
        "gender": product.gender,
        "category": product.category,
        "seller_id": product.seller_id,
        "is_verified": product.is_verified,
        "verification_status": product.verification_status,
        "verification_notes": product.verification_notes,
        "submitted_at": product.submitted_at,
        "seller_username": None,
        "seller_email": None,
        "seller_phone": None
    }
    
    if product.seller_id:
        seller = db.query(User).filter(User.id == product.seller_id).first()
        if seller:
            product_dict["seller_username"] = seller.username
            product_dict["seller_email"] = seller.email
            product_dict["seller_phone"] = seller.phone
    
    return ProductWithSellerInfo(**product_dict)

@app.patch("/admin/products/{product_id}/approve", response_model=ProductSchema, tags=["Admin"])
def approve_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(admin_only)
):
    """Approve a product (admin only)"""
    product = db.query(ProductModel).filter(ProductModel.id == product_id).first()
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    product.verification_status = "Approved"
    product.is_verified = True
    product.verification_notes = None  # Clear any rejection notes
    db.commit()
    db.refresh(product)
    normalize_product_gender(product)
    return product

@app.patch("/admin/products/{product_id}/reject", response_model=ProductSchema, tags=["Admin"])
def reject_product(
    product_id: int,
    request: RejectProductRequest,
    db: Session = Depends(get_db),
    current_admin: User = Depends(admin_only)
):
    """Reject a product with optional notes (admin only)"""
    product = db.query(ProductModel).filter(ProductModel.id == product_id).first()
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    product.verification_status = "Rejected"
    product.is_verified = False
    product.verification_notes = request.notes
    db.commit()
    db.refresh(product)
    normalize_product_gender(product)
    return product

# Legacy endpoint for backward compatibility
@app.post("/admin/products/verify/{product_id}", response_model=ProductSchema, tags=["Admin"])
def verify_product_legacy(
    product_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(admin_only)
):
    """Legacy endpoint: Approve a product (admin only) - use /approve endpoint instead"""
    product = db.query(ProductModel).filter(ProductModel.id == product_id).first()
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    product.verification_status = "Approved"
    product.is_verified = True
    product.verification_notes = None
    db.commit()
    db.refresh(product)
    normalize_product_gender(product)
    return product

# ==================== ADMIN PRODUCT MANAGEMENT ====================

@app.get("/admin/products", response_model=list[AdminProductResponse], tags=["Admin"])
def get_all_admin_products(
    status_filter: str | None = Query(None, description="Filter by verification_status: Pending, Approved, Rejected"),
    db: Session = Depends(get_db),
    current_admin: User = Depends(admin_only)
):
    """Get all products with seller info and variants (admin only)"""
    query = db.query(ProductModel)
    
    if status_filter:
        query = query.filter(ProductModel.verification_status == status_filter)
    
    products = query.order_by(desc(ProductModel.id)).all()
    
    result = []
    for product in products:
        normalize_product_gender(product)
        
        # Get seller info
        seller_info = None
        if product.seller_id:
            seller = db.query(User).filter(User.id == product.seller_id).first()
            if seller:
                seller_info = SellerInfo(id=seller.id, username=seller.username, email=seller.email)
        
        # Get variants
        variants = db.query(ProductVariant).filter(ProductVariant.product_id == product.id).all()
        # Normalize variant image URLs
        for variant in variants:
            if variant.image_url:
                variant.image_url = normalize_image_url(variant.image_url)
        
        # Normalize product image URL
        image_url = normalize_image_url(product.image_url)
        
        result.append(AdminProductResponse(
            id=product.id,
            name=product.name,
            description=product.description,
            image_url=image_url,
            price=product.price,
            discounted_price=product.discounted_price,
            gender=product.gender,
            category=product.category,
            verification_status=product.verification_status,
            seller=seller_info,
            variants=[VariantResponse.model_validate(v) for v in variants]
        ))
    
    return result

@app.get("/admin/products/{product_id}/full", response_model=AdminProductResponse, tags=["Admin"])
def get_admin_product_full(
    product_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(admin_only)
):
    """Get product by ID with seller info and variants (admin only)"""
    product = db.query(ProductModel).filter(ProductModel.id == product_id).first()
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    normalize_product_gender(product)
    
    # Get seller info
    seller_info = None
    if product.seller_id:
        seller = db.query(User).filter(User.id == product.seller_id).first()
        if seller:
            seller_info = SellerInfo(id=seller.id, username=seller.username, email=seller.email)
    
    # Get variants
    variants = db.query(ProductVariant).filter(ProductVariant.product_id == product.id).all()
    # Normalize variant image URLs
    for variant in variants:
        if variant.image_url:
            variant.image_url = normalize_image_url(variant.image_url)
    
    # Normalize product image URL
    image_url = normalize_image_url(product.image_url)
    
    return AdminProductResponse(
        id=product.id,
        name=product.name,
        description=product.description,
        image_url=image_url,
        price=product.price,
        discounted_price=product.discounted_price,
        gender=product.gender,
        category=product.category,
        verification_status=product.verification_status,
        seller=seller_info,
        variants=[VariantResponse.model_validate(v) for v in variants]
    )

@app.patch("/admin/products/{product_id}", response_model=AdminProductResponse, tags=["Admin"])
def update_admin_product(
    product_id: int,
    product_update: ProductUpdate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(admin_only)
):
    """Update product details (admin only)"""
    product = db.query(ProductModel).filter(ProductModel.id == product_id).first()
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Update fields
    update_data = product_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(product, key, value)
    
    # Normalize gender if updated
    if 'gender' in update_data:
        normalize_product_gender(product)
    
    db.commit()
    db.refresh(product)
    
    # Get seller info
    seller_info = None
    if product.seller_id:
        seller = db.query(User).filter(User.id == product.seller_id).first()
        if seller:
            seller_info = SellerInfo(id=seller.id, username=seller.username, email=seller.email)
    
    # Get variants
    variants = db.query(ProductVariant).filter(ProductVariant.product_id == product.id).all()
    for variant in variants:
        if variant.image_url:
            variant.image_url = normalize_image_url(variant.image_url)
    
    image_url = normalize_image_url(product.image_url)
    
    return AdminProductResponse(
        id=product.id,
        name=product.name,
        description=product.description,
        image_url=image_url,
        price=product.price,
        discounted_price=product.discounted_price,
        gender=product.gender,
        category=product.category,
        verification_status=product.verification_status,
        seller=seller_info,
        variants=[VariantResponse.model_validate(v) for v in variants]
    )

@app.delete("/admin/products/{product_id}", tags=["Admin"])
def delete_admin_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(admin_only)
):
    """Delete a product entirely (admin only) - SQLite safe deletion"""
    product = db.query(ProductModel).filter(ProductModel.id == product_id).first()
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    try:
        # Delete associated variants (cascade should handle this, but explicit for clarity)
        db.query(ProductVariant).filter(ProductVariant.product_id == product_id).delete()
        
        # Delete associated cart items
        db.query(CartItem).filter(CartItem.product_id == product_id).delete()
        
        # For order_items, set product_id to NULL (SQLite safe - preserves order history)
        # Note: SQLite doesn't support SET NULL on DELETE, so we do it manually
        order_items = db.query(OrderItem).filter(OrderItem.product_id == product_id).all()
        for order_item in order_items:
            order_item.product_id = None
        
        # Delete associated wishlist items
        db.query(WishlistItem).filter(WishlistItem.product_id == product_id).delete()
        
        # Delete associated reviews
        db.query(Review).filter(Review.product_id == product_id).delete()
        
        # Finally, delete the product
        db.delete(product)
        db.commit()
        
        return {"message": "Product deleted successfully"}
    except Exception as e:
        db.rollback()
        logger.exception(f"Error deleting product {product_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete product: {str(e)}")

@app.post("/admin/products/{product_id}/variant", response_model=VariantResponse, tags=["Admin"])
def create_admin_product_variant(
    product_id: int,
    variant: VariantCreate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(admin_only)
):
    """Create a variant for a product (admin only)"""
    product = db.query(ProductModel).filter(ProductModel.id == product_id).first()
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    new_variant = ProductVariant(
        product_id=product_id,
        size=variant.size,
        color=variant.color,
        image_url=variant.image_url,
        price=variant.price,
        stock=variant.stock
    )
    db.add(new_variant)
    db.commit()
    db.refresh(new_variant)
    
    # Normalize image URL
    if new_variant.image_url:
        new_variant.image_url = normalize_image_url(new_variant.image_url)
    
    return new_variant

@app.patch("/admin/products/{product_id}/variant/{variant_id}", response_model=VariantResponse, tags=["Admin"])
def update_admin_product_variant(
    product_id: int,
    variant_id: int,
    variant: VariantUpdate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(admin_only)
):
    """Update a variant (admin only)"""
    # Verify product exists
    product = db.query(ProductModel).filter(ProductModel.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Get variant and verify it belongs to the product
    existing_variant = db.query(ProductVariant).filter(
        ProductVariant.id == variant_id,
        ProductVariant.product_id == product_id
    ).first()
    
    if not existing_variant:
        raise HTTPException(status_code=404, detail="Variant not found")
    
    # Update fields
    variant_data = variant.model_dump(exclude_unset=True)
    for key, value in variant_data.items():
        setattr(existing_variant, key, value)
    
    existing_variant.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(existing_variant)
    
    # Normalize image URL
    if existing_variant.image_url:
        existing_variant.image_url = normalize_image_url(existing_variant.image_url)
    
    return existing_variant

@app.delete("/admin/products/{product_id}/variant/{variant_id}", tags=["Admin"])
def delete_admin_product_variant(
    product_id: int,
    variant_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(admin_only)
):
    """Delete a variant (admin only)"""
    # Verify product exists
    product = db.query(ProductModel).filter(ProductModel.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Get variant and verify it belongs to the product
    variant = db.query(ProductVariant).filter(
        ProductVariant.id == variant_id,
        ProductVariant.product_id == product_id
    ).first()
    
    if not variant:
        raise HTTPException(status_code=404, detail="Variant not found")
    
    try:
        # For order_items with this variant, set variant_id to NULL (SQLite safe)
        order_items = db.query(OrderItem).filter(OrderItem.variant_id == variant_id).all()
        for order_item in order_items:
            order_item.variant_id = None
        
        # Delete cart items with this variant
        db.query(CartItem).filter(CartItem.variant_id == variant_id).delete()
        
        # Delete the variant
        db.delete(variant)
        db.commit()
        
        return {"message": "Variant deleted successfully"}
    except Exception as e:
        db.rollback()
        logger.exception(f"Error deleting variant {variant_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete variant: {str(e)}")

@app.post("/admin/create-super-admin", tags=["Admin"])
def create_super_admin(
    username: str = Form(...),
    email: str = Form(...),
    password: str = Form(...),
    db: Session = Depends(get_db)
):
    """
    Create the first super admin account.
    This endpoint is only accessible if no super admin exists yet.
    After first super admin is created, this endpoint should be disabled.
    """
    # Check if any super admin already exists
    existing_admin = db.query(User).filter(
        (User.role == "admin") | (User.is_admin == True)
    ).first()
    
    if existing_admin:
        raise HTTPException(
            status_code=403,
            detail="Super admin already exists. Use regular admin endpoints."
        )
    
    # Check if username/email already exists
    if db.query(User).filter(User.username == username).first():
        raise HTTPException(status_code=400, detail="Username already exists")
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=400, detail="Email already exists")
    
    # Generate OTP for email verification
    otp = generate_otp()
    expiry = datetime.utcnow() + timedelta(minutes=10)
    hashed_pw = hash_password(password)
    
    # Create super admin user
    super_admin = User(
        username=username,
        email=email,
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
        logger.info("OTP sent to super admin email: %s", email)
    except Exception as e:
        logger.exception("Failed to send OTP email: %s", str(e))
    
    return {
        "message": "Super admin account created successfully. Please verify your email with the OTP sent to your inbox.",
        "username": username,
        "email": email
    }

@app.post("/resend-otp", tags=["Auth"])
def resend_otp(data: ResendOTPRequest, db: Session = Depends(get_db)):
    """Resend OTP to user's email"""
    user = db.query(User).filter(User.email == data.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # If user is already active, no need to resend
    if user.is_active:
        raise HTTPException(status_code=400, detail="Email is already verified and account is active")

    # Generate new OTP
    otp = generate_otp()
    expiry = datetime.utcnow() + timedelta(minutes=10)
    
    user.otp = otp
    user.otp_expiry = expiry
    db.commit()

    # Send OTP email
    try:
        send_otp_email(user.email, otp)
        logger.info("OTP resent to email: %s", user.email)
        return {"message": "OTP has been resent to your email. Please check your inbox."}
    except ValueError as e:
        logger.exception("Email configuration error: %s", str(e))
        raise HTTPException(status_code=500, detail="Email service not configured. Please contact support.")
    except ConnectionError as e:
        logger.exception("SMTP connection error: %s", str(e))
        raise HTTPException(status_code=500, detail="Unable to connect to email server. Please try again later.")
    except Exception as e:
        logger.exception("Failed to send OTP email: %s", str(e))
        raise HTTPException(status_code=500, detail=f"Failed to send OTP email: {str(e)}. Please try again later.")

# ==================== PASSWORD RESET ENDPOINTS ====================

@app.post("/auth/forgot-password", tags=["Auth"])
def forgot_password(
    data: ForgotPasswordRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Request password reset. Sends reset link to email if user exists.
    Returns generic success message to prevent email enumeration.
    """
    email = data.email.strip().lower()
    
    # Check rate limiting
    is_allowed, next_allowed = check_rate_limit(email, db)
    if not is_allowed:
        # Still return generic success, but log the rate limit
        logger.warning(f"Rate limit exceeded for password reset: {email}")
        # Return generic message even on rate limit to prevent enumeration
        return {
            "message": "Password reset instructions sent (if the email exists). Please check your email."
        }
    
    # Check if user exists
    user = db.query(User).filter(User.email == email).first()
    
    # Always return generic success message (security: prevent email enumeration)
    generic_message = "Password reset instructions sent (if the email exists). Please check your email."
    
    if not user:
        logger.info(f"Password reset requested for non-existent email: {email}")
        return {"message": generic_message}
    
    try:
        # Generate reset token
        reset_token = create_reset_token(user, db)
        
        # Determine reset URL based on user role
        # Get the origin from request headers or use default
        origin = request.headers.get("origin", "http://localhost:5173") if request else "http://localhost:5173"
        
        # Determine the correct reset path based on role
        if user.role == "admin" or user.is_admin:
            reset_path = "/admin/reset-password"
        elif user.role == "seller":
            reset_path = "/seller/reset-password"
        else:
            reset_path = "/reset-password"
        
        reset_url = f"{origin}{reset_path}?email={email}&token={reset_token}"
        
        # Send password reset email
        send_password_reset_email(user.email, reset_token, reset_url)
        logger.info(f"Password reset email sent to: {email}")
        
        return {"message": generic_message}
        
    except ValueError as e:
        logger.exception("Email configuration error: %s", str(e))
        # Still return generic message
        return {"message": generic_message}
    except Exception as e:
        logger.exception("Failed to send password reset email: %s", str(e))
        # Still return generic message for security
        return {"message": generic_message}


@app.post("/auth/reset-password", tags=["Auth"])
def reset_password(data: ResetPasswordRequest, db: Session = Depends(get_db)):
    """
    Reset password using token from email.
    Validates token, checks expiration, and updates password.
    """
    email = data.email.strip().lower()
    # Get otp_or_token (validator ensures at least one of token or otp_or_token is provided)
    otp_or_token = (data.otp_or_token or data.token or "").strip()
    if not otp_or_token:
        raise HTTPException(status_code=400, detail="Either 'otp_or_token' or 'token' must be provided")
    new_password = data.new_password
    
    # Validate password strength
    try:
        validate_password_strength(new_password, username=None, email=email)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    # Validate token (check if it's a token or OTP)
    # If it's 6 digits, treat as OTP; otherwise treat as token
    is_otp = otp_or_token.isdigit() and len(otp_or_token) == 6
    
    if is_otp:
        # OTP-based reset
        user = db.query(User).filter(User.email == email).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        if not user.otp or user.otp != otp_or_token:
            raise HTTPException(
                status_code=400,
                detail="Invalid OTP. Please request a new password reset."
            )
        
        if not user.otp_expiry or user.otp_expiry < datetime.utcnow():
            raise HTTPException(
                status_code=400,
                detail="OTP expired. Please request a new password reset."
            )
    else:
        # Token-based reset
        user = validate_reset_token(email, otp_or_token, db)
        if not user:
            raise HTTPException(
                status_code=400,
                detail="Invalid or expired reset token. Please request a new password reset."
            )
    
    # Check if new password equals old password
    if verify_password(new_password, user.hashed_password):
        raise HTTPException(
            status_code=400,
            detail="New password cannot be from your previous passwords"
        )
    
    try:
        # Hash new password
        hashed_password = hash_password(new_password)
        
        # Update password
        user.hashed_password = hashed_password
        
        # Clear OTP/token fields
        if is_otp:
            user.otp = None
            user.otp_expiry = None
        else:
            invalidate_reset_token(user, db)
        
        db.commit()
        
        # Send success email
        try:
            send_password_reset_success_email(user.email)
        except Exception as e:
            # Log but don't fail the reset if email fails
            logger.warning(f"Failed to send password reset success email: {e}")
        
        logger.info(f"Password reset successful for user: {email}")
        return {"message": "Password has been reset successfully. You can now login with your new password."}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error resetting password: {e}")
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Failed to reset password. Please try again."
        )

# ==================== USER PASSWORD RESET ENDPOINTS (OTP-based) ====================

@app.post("/users/forgot-password", tags=["Users"])
def users_forgot_password(data: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """
    Request password reset using OTP.
    Generates OTP and sends it to user's email.
    """
    email = data.email.strip().lower()
    
    # Check if user exists
    user = db.query(User).filter(User.email == email).first()
    
    # Always return generic success message (security: prevent email enumeration)
    generic_message = "Password reset OTP sent (if the email exists). Please check your email."
    
    if not user:
        logger.info(f"Password reset OTP requested for non-existent email: {email}")
        return {"message": generic_message}
    
    try:
        # Generate OTP for password reset
        otp = generate_otp()
        expiry = datetime.utcnow() + timedelta(minutes=10)
        
        # Save OTP in user record
        user.otp = otp
        user.otp_expiry = expiry
        db.commit()
        
        # Send OTP email
        try:
            send_otp_email(user.email, otp)
            logger.info(f"Password reset OTP sent to: {email}")
        except ValueError as e:
            logger.exception("Email configuration error: %s", str(e))
            # Still return generic message
        except Exception as e:
            logger.exception("Failed to send password reset OTP email: %s", str(e))
            # Still return generic message for security
        
        return {"message": generic_message}
        
    except Exception as e:
        logger.exception("Failed to process password reset request: %s", str(e))
        db.rollback()
        # Still return generic message for security
        return {"message": generic_message}


@app.post("/users/reset-password", tags=["Users"])
def users_reset_password(data: ResetPasswordRequest, db: Session = Depends(get_db)):
    """
    Reset password using OTP.
    Validates OTP, checks if new password equals old password, and updates password.
    """
    email = data.email.strip().lower()
    # Get otp_or_token (validator ensures at least one of token or otp_or_token is provided)
    otp_or_token = (data.otp_or_token or data.token or "").strip()
    if not otp_or_token:
        raise HTTPException(status_code=400, detail="Either 'otp_or_token' or 'token' must be provided")
    new_password = data.new_password
    
    # Find user by email
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Validate OTP (should be 6 digits for OTP-based reset)
    if not otp_or_token.isdigit() or len(otp_or_token) != 6:
        raise HTTPException(
            status_code=400,
            detail="Invalid OTP format. OTP must be 6 digits."
        )
    
    if not user.otp:
        raise HTTPException(
            status_code=400,
            detail="No OTP found. Please request a new password reset."
        )
    
    if user.otp != otp_or_token:
        raise HTTPException(
            status_code=400,
            detail="Invalid OTP. Please check your email and try again."
        )
    
    if not user.otp_expiry or user.otp_expiry < datetime.utcnow():
        raise HTTPException(
            status_code=400,
            detail="OTP expired. Please request a new password reset."
        )
    
    # Validate password strength
    try:
        validate_password_strength(new_password, username=user.username, email=user.email)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    # Check if new password equals old password
    if verify_password(new_password, user.hashed_password):
        raise HTTPException(
            status_code=400,
            detail="New password cannot be from your previous passwords"
        )
    
    try:
        # Hash new password
        hashed_password = hash_password(new_password)
        
        # Update password
        user.hashed_password = hashed_password
        
        # Clear OTP fields
        user.otp = None
        user.otp_expiry = None
        
        db.commit()
        
        # Send success email
        try:
            send_password_reset_success_email(user.email)
        except Exception as e:
            # Log but don't fail the reset if email fails
            logger.warning(f"Failed to send password reset success email: {e}")
        
        logger.info(f"Password reset successful for user: {email}")
        return {"message": "Password reset successful"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error resetting password: {e}")
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Failed to reset password. Please try again."
        )

# ==================== ADDRESS MANAGEMENT ENDPOINTS ====================

@app.get("/profile/addresses", response_model=list[AddressResponse], tags=["Users"])
def get_user_addresses(
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    """Get all addresses for the logged-in user"""
    user = db.query(User).filter(User.username == current_user).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    addresses = db.query(Address).filter(Address.user_id == user.id).order_by(
        Address.is_default.desc(), Address.created_at.desc()
    ).all()
    return addresses


@app.post("/profile/addresses", response_model=AddressResponse, tags=["Users"])
def create_address(
    address: AddressCreate,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    """Create a new address for the logged-in user"""
    user = db.query(User).filter(User.username == current_user).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if this is the first address
    existing_addresses = db.query(Address).filter(Address.user_id == user.id).count()
    is_first_address = existing_addresses == 0
    
    # Create new address
    new_address = Address(
        user_id=user.id,
        **address.model_dump(),
        is_default=is_first_address  # First address is automatically default
    )
    db.add(new_address)
    
    # If this is the first address, update user.has_address
    if is_first_address:
        user.has_address = True
    
    db.commit()
    db.refresh(new_address)
    return new_address


@app.put("/profile/addresses/{address_id}", response_model=AddressResponse, tags=["Users"])
def update_address(
    address_id: int,
    address_update: AddressUpdate,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    """Update an existing address"""
    user = db.query(User).filter(User.username == current_user).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    address = db.query(Address).filter(
        Address.id == address_id,
        Address.user_id == user.id
    ).first()
    
    if not address:
        raise HTTPException(status_code=404, detail="Address not found")
    
    # Update only provided fields
    update_data = address_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(address, field, value)
    
    address.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(address)
    return address


@app.delete("/profile/addresses/{address_id}", tags=["Users"])
def delete_address(
    address_id: int,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    """Delete an address. If it was default, set next available as default."""
    user = db.query(User).filter(User.username == current_user).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    address = db.query(Address).filter(
        Address.id == address_id,
        Address.user_id == user.id
    ).first()
    
    if not address:
        raise HTTPException(status_code=404, detail="Address not found")
    
    was_default = address.is_default
    
    # Delete the address
    db.delete(address)
    
    # If it was default, set next available as default
    if was_default:
        next_address = db.query(Address).filter(
            Address.user_id == user.id
        ).first()
        if next_address:
            next_address.is_default = True
            db.commit()
        else:
            # No addresses left, update user.has_address
            user.has_address = False
            db.commit()
    else:
        db.commit()
    
    return {"message": "Address deleted successfully"}


@app.post("/profile/addresses/{address_id}/set-default", response_model=AddressResponse, tags=["Users"])
def set_default_address(
    address_id: int,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    """Set an address as default"""
    user = db.query(User).filter(User.username == current_user).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    address = db.query(Address).filter(
        Address.id == address_id,
        Address.user_id == user.id
    ).first()
    
    if not address:
        raise HTTPException(status_code=404, detail="Address not found")
    
    # Unset all other default addresses
    db.query(Address).filter(
        Address.user_id == user.id,
        Address.is_default == True
    ).update({"is_default": False})
    
    # Set this address as default
    address.is_default = True
    db.commit()
    db.refresh(address)
    return address


@app.get("/profile/addresses/default", response_model=AddressResponse, tags=["Users"])
def get_default_address(
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    """Get the default address for checkout"""
    user = db.query(User).filter(User.username == current_user).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    address = db.query(Address).filter(
        Address.user_id == user.id,
        Address.is_default == True
    ).first()
    
    if not address:
        raise HTTPException(status_code=404, detail="No default address found")
    
    return address


# ==================== BACKWARD COMPATIBILITY: OLD /user/address ROUTES ====================

@app.get("/user/address", response_model=list[AddressResponse], tags=["User"])
def get_user_addresses_legacy(
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    """Get all addresses for the logged-in user (legacy endpoint)"""
    return get_user_addresses(db, current_user)

@app.post("/user/address", response_model=AddressResponse, tags=["User"])
def create_address_legacy(
    address: AddressCreate,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    """Create a new address for the logged-in user (legacy endpoint)"""
    return create_address(address, db, current_user)

@app.put("/user/address/{address_id}", response_model=AddressResponse, tags=["User"])
def update_address_legacy(
    address_id: int,
    address_update: AddressUpdate,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    """Update an existing address (legacy endpoint)"""
    return update_address(address_id, address_update, db, current_user)

@app.delete("/user/address/{address_id}", tags=["User"])
def delete_address_legacy(
    address_id: int,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    """Delete an address (legacy endpoint)"""
    return delete_address(address_id, db, current_user)

@app.post("/user/address/{address_id}/set-default", response_model=AddressResponse, tags=["User"])
def set_default_address_legacy(
    address_id: int,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    """Set an address as default (legacy endpoint)"""
    return set_default_address(address_id, db, current_user)

@app.get("/user/address/default", response_model=AddressResponse, tags=["User"])
def get_default_address_legacy(
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    """Get the default address for checkout (legacy endpoint)"""
    return get_default_address(db, current_user)

# Keep /user/profile for backward compatibility, but also add /profile/me above
@app.get("/user/profile", tags=["User"])
def get_user_profile_legacy(
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    """Get user profile including has_address status"""
    user = db.query(User).filter(User.username == current_user).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "phone": user.phone,
        "has_address": user.has_address,
        "role": user.role
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)