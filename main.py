from fastapi import FastAPI, Depends, HTTPException, status, Request, Form
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.responses import JSONResponse, HTMLResponse
from fastapi.openapi.docs import get_swagger_ui_html
from sqlalchemy.orm import Session
from datetime import timedelta, datetime
from database import Base, engine, SessionLocal
from models import Product as ProductModel, User, Order, OrderItem, CartItem, WishlistItem
from schemas import ProductCreate, Product as ProductSchema, ProductListResponse, BulkProductCreate, BulkProductCreateResponse, UserCreate, UserResponse, CartItemCreate, CartItemResponse, CartItemQuantityUpdate, OrderResponse, WishlistItemResponse, VerifyOTPRequest, ResendOTPRequest, SellerCreate, SellerResponse
from auth_utils import hash_password, verify_password, create_access_token, get_current_user, get_current_user_obj, admin_only, seller_only, customer_only
from fastapi import Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.exc import IntegrityError
from sqlalchemy import text
import logging
from email_utils import generate_otp, send_otp_email

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("fastecom")

TAGS_METADATA = [
    {"name": "Products", "description": "Manage products catalog."},
    {"name": "Users", "description": "User registration and profile."},
    {"name": "Auth", "description": "Authentication endpoints."},
    {"name": "Cart", "description": "Shopping cart operations."},
    {"name": "Orders", "description": "Order creation and retrieval."},
    {"name": "Wishlist", "description": "Wishlist operations."},
    {"name": "Seller", "description": "Seller dashboard operations."},
    {"name": "Admin", "description": "Admin panel operations."},
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
    new_product = ProductModel(**product.model_dump())
    db.add(new_product)
    db.commit()
    db.refresh(new_product)
    return new_product

# Get All Products
@app.get("/products", response_model=list[ProductSchema], tags=["Products"])
def get_products(
    db: Session = Depends(get_db),
    gender: str | None = Query(None, description="Filter by gender: men/women/unisex")
):
    try:
        query = db.query(ProductModel)
        # Only show verified products to customers
        query = query.filter(ProductModel.is_verified == True)
        # Only filter by gender if explicitly provided and valid
        if gender and isinstance(gender, str) and gender.strip() and gender.lower() in ['men', 'women', 'unisex']:
            # Case-insensitive filter
            query = query.filter(
                (ProductModel.gender == gender.lower()) | 
                (ProductModel.gender == gender.upper()) |
                (ProductModel.gender == gender.capitalize())
            )
        # When no gender filter, show ALL verified products
        items = query.order_by(ProductModel.id.desc()).all()
        # Normalize gender values to lowercase for Pydantic validation
        items = [normalize_product_gender(item) for item in items]
        return items
    except Exception:
        logger.exception("Failed to fetch products")
        raise HTTPException(status_code=500, detail="Failed to fetch products")

def normalize_product_gender(product):
    """Normalize product gender to lowercase for Pydantic validation"""
    if hasattr(product, 'gender') and product.gender:
        product.gender = product.gender.lower() if product.gender.lower() in ['men', 'women', 'unisex'] else None
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
        # Only show verified products to customers
        base = base.filter(ProductModel.is_verified == True)
        # Only filter by gender if explicitly provided and not empty
        if gender and isinstance(gender, str) and gender.strip() and gender.lower() in ['men', 'women', 'unisex']:
            # Case-insensitive filter: check both uppercase and lowercase
            base = base.filter(
                (ProductModel.gender == gender.lower()) | 
                (ProductModel.gender == gender.upper()) |
                (ProductModel.gender == gender.capitalize())
            )
        # When no gender filter, show ALL verified products regardless of gender value
        total = base.count()
        logger.info(f"Fetching products: page={page}, page_size={page_size}, gender={gender}, total={total}")
        offset = (page - 1) * page_size
        items = base.order_by(ProductModel.id.desc()).limit(page_size).offset(offset).all()
        # Normalize gender values to lowercase for Pydantic validation
        items = [normalize_product_gender(item) for item in items]
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
    # Only show verified products to customers
    query = query.filter(ProductModel.is_verified == True)

    if name:
        query = query.filter(ProductModel.name.ilike(f"%{name}%"))
    if min_price is not None:
        query = query.filter(ProductModel.price >= min_price)
    if max_price is not None:
        query = query.filter(ProductModel.price <= max_price)
    # Only filter by gender if explicitly provided and valid
    if gender and isinstance(gender, str) and gender.strip() and gender.lower() in ['men', 'women', 'unisex']:
        # Case-insensitive filter
        query = query.filter(
            (ProductModel.gender == gender.lower()) | 
            (ProductModel.gender == gender.upper()) |
            (ProductModel.gender == gender.capitalize())
        )

    results = query.order_by(ProductModel.id.desc()).all()
    # Normalize gender values to lowercase for Pydantic validation
    results = [normalize_product_gender(item) for item in results]
    return results

@app.get("/products/{product_id}", response_model=ProductSchema, tags=["Products"])
def get_product(product_id: int, db: Session = Depends(get_db)):
    product = db.query(ProductModel).filter(
        ProductModel.id == product_id,
        ProductModel.is_verified == True
    ).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    # Normalize gender value to lowercase for Pydantic validation
    normalize_product_gender(product)
    return product

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
        new_user = User(
            username=user.username, 
            email=user.email, 
            phone=normalized_phone, 
            hashed_password=hashed_pw,
            is_active=False,  # Default to False, will be True after OTP verification
            otp=otp,
            otp_expiry=expiry,
            role="customer",  # Default role for regular signup
            is_approved=False
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

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user_role,
        "username": user.username
    }

@app.get("/profile", tags=["Users"])
def read_profile(current_user: str = Depends(get_current_user)):
    return {"message": f"Welcome, {current_user}!"}

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

    # Check if product already in cart
    cart_item = (
        db.query(CartItem)
        .filter(CartItem.user_id == user.id, CartItem.product_id == item.product_id)
        .first()
    )

    if cart_item:
        cart_item.quantity += item.quantity
    else:
        cart_item = CartItem(user_id=user.id, product_id=item.product_id, quantity=item.quantity)
        db.add(cart_item)

    db.commit()
    db.refresh(cart_item)
    return cart_item


@app.get("/cart", response_model=list[CartItemResponse], tags=["Cart"])
def get_cart(
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    user = db.query(User).filter(User.username == current_user).first()
    return db.query(CartItem).filter(CartItem.user_id == user.id).all()


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
def create_order(db: Session = Depends(get_db), current_user: str = Depends(get_current_user)):
    # find user record
    user = db.query(User).filter(User.username == current_user).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # fetch cart items for user
    cart_items = db.query(CartItem).filter(CartItem.user_id == user.id).all()
    if not cart_items:
        raise HTTPException(status_code=400, detail="Cart is empty")

    # create order
    order = Order(user_id=user.id, total_price=0.0, status="Pending")
    db.add(order)
    db.flush()  # assign PK to order.id before adding items

    total = 0.0
    for ci in cart_items:
        # fetch product to get current price (and validate existence)
        product = db.query(ProductModel).filter(ProductModel.id == ci.product_id).first()
        if not product:
            # optional: skip or abort; here we abort to keep consistency
            raise HTTPException(status_code=404, detail=f"Product id {ci.product_id} not found")

        item_price = float(product.price) * int(ci.quantity)
        total += item_price

        order_item = OrderItem(
            order_id=order.id,
            product_id=product.id,
            quantity=ci.quantity,
            price=product.price  # price per item (store per-item price)
        )
        db.add(order_item)

    # update total, commit transaction, clear cart
    order.total_price = total
    # delete cart items
    db.query(CartItem).filter(CartItem.user_id == user.id).delete()
    db.commit()
    db.refresh(order)
    return order


# ---------------- List User Orders ----------------
@app.get("/orders", response_model=list[OrderResponse], tags=["Orders"])
def list_orders(db: Session = Depends(get_db), current_user: str = Depends(get_current_user)):
    user = db.query(User).filter(User.username == current_user).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    orders = db.query(Order).filter(Order.user_id == user.id).all()
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

    return order

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
    db.commit()

    logger.info("Email verified and account activated for user: %s", user.email)
    return {"message": "Email verified successfully! Your account is now active."}

# ==================== SELLER ROUTES ====================

@app.get("/seller/products", response_model=list[ProductSchema], tags=["Seller"])
def get_seller_products(
    db: Session = Depends(get_db),
    current_seller: User = Depends(seller_only)
):
    """Get all products for the current seller"""
    products = db.query(ProductModel).filter(
        ProductModel.seller_id == current_seller.id
    ).order_by(ProductModel.id.desc()).all()
    return [normalize_product_gender(p) for p in products]

@app.post("/seller/products/create", response_model=ProductSchema, tags=["Seller"])
def create_seller_product(
    product: ProductCreate,
    db: Session = Depends(get_db),
    current_seller: User = Depends(seller_only)
):
    """Create a new product (seller only)"""
    new_product = ProductModel(
        **product.model_dump(),
        seller_id=current_seller.id,
        is_verified=False  # Requires admin verification
    )
    db.add(new_product)
    db.commit()
    db.refresh(new_product)
    normalize_product_gender(new_product)
    return new_product

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

                product = ProductModel(
                    name=item.name.strip(),
                    description=item.description.strip() if item.description else None,
                    image_url=item.image_url.strip() if item.image_url else None,
                    price=float(item.price),
                    discounted_price=float(item.discounted_price) if item.discounted_price is not None else None,
                    gender=item.gender if item.gender in ['men', 'women', 'unisex'] else None,
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
                normalize_product_gender(product)
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
    existing_product = db.query(ProductModel).filter(
        ProductModel.id == product_id,
        ProductModel.seller_id == current_seller.id
    ).first()
    
    if not existing_product:
        raise HTTPException(status_code=404, detail="Product not found or access denied")
    
    # Update fields
    for key, value in product.model_dump().items():
        setattr(existing_product, key, value)
    
    # Reset verification status when product is updated
    existing_product.is_verified = False
    
    db.commit()
    db.refresh(existing_product)
    normalize_product_gender(existing_product)
    return existing_product

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

@app.get("/seller/orders", response_model=list[OrderResponse], tags=["Seller"])
def get_seller_orders(
    db: Session = Depends(get_db),
    current_seller: User = Depends(seller_only)
):
    """Get all orders containing seller's products (seller only)"""
    # Get all product IDs for this seller
    seller_product_ids = [p.id for p in db.query(ProductModel).filter(
        ProductModel.seller_id == current_seller.id
    ).all()]
    
    if not seller_product_ids:
        return []
    
    # Get orders that have items with seller's products
    orders = db.query(Order).join(OrderItem).filter(
        OrderItem.product_id.in_(seller_product_ids)
    ).distinct().order_by(Order.created_at.desc()).all()
    
    return orders

@app.get("/seller/orders/{order_id}", response_model=OrderResponse, tags=["Seller"])
def get_seller_order_details(
    order_id: int,
    db: Session = Depends(get_db),
    current_seller: User = Depends(seller_only)
):
    """Get order details for seller's products (seller only)"""
    # Get all product IDs for this seller
    seller_product_ids = [p.id for p in db.query(ProductModel).filter(
        ProductModel.seller_id == current_seller.id
    ).all()]
    
    if not seller_product_ids:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Check if order contains seller's products
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    order_items = db.query(OrderItem).filter(
        OrderItem.order_id == order_id,
        OrderItem.product_id.in_(seller_product_ids)
    ).all()
    
    if not order_items:
        raise HTTPException(status_code=404, detail="Order not found or no seller products in this order")
    
    return order

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
    """List all users (admin only)"""
    users = db.query(User).all()
    return users

@app.get("/admin/orders", response_model=list[OrderResponse], tags=["Admin"])
def list_all_orders(
    db: Session = Depends(get_db),
    current_admin: User = Depends(admin_only)
):
    """List all orders (admin only)"""
    orders = db.query(Order).order_by(Order.created_at.desc()).all()
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

@app.get("/admin/products/pending", response_model=list[ProductSchema], tags=["Admin"])
def get_pending_products(
    db: Session = Depends(get_db),
    current_admin: User = Depends(admin_only)
):
    """Get all unverified products (admin only)"""
    products = db.query(ProductModel).filter(
        ProductModel.is_verified == False
    ).order_by(ProductModel.id.desc()).all()
    return [normalize_product_gender(p) for p in products]

@app.post("/admin/products/verify/{product_id}", response_model=ProductSchema, tags=["Admin"])
def verify_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(admin_only)
):
    """Verify a product (admin only)"""
    product = db.query(ProductModel).filter(ProductModel.id == product_id).first()
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    product.is_verified = True
    db.commit()
    db.refresh(product)
    normalize_product_gender(product)
    return product

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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)