from fastapi import FastAPI, Depends, HTTPException, status, Request, Form
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.responses import JSONResponse, HTMLResponse
from fastapi.openapi.docs import get_swagger_ui_html
from sqlalchemy.orm import Session
from datetime import timedelta, datetime
from database import Base, engine, SessionLocal
from models import Product as ProductModel, User, Order, OrderItem, CartItem, WishlistItem
from schemas import ProductCreate, Product as ProductSchema, ProductListResponse, BulkProductCreate, BulkProductCreateResponse, UserCreate, UserResponse, CartItemCreate, CartItemResponse, CartItemQuantityUpdate, OrderResponse, WishlistItemResponse, VerifyOTPRequest, ResendOTPRequest
from auth_utils import hash_password, verify_password, create_access_token, get_current_user
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
        # Only filter by gender if explicitly provided and valid
        if gender and isinstance(gender, str) and gender.strip() and gender.lower() in ['men', 'women', 'unisex']:
            # Case-insensitive filter
            query = query.filter(
                (ProductModel.gender == gender.lower()) | 
                (ProductModel.gender == gender.upper()) |
                (ProductModel.gender == gender.capitalize())
            )
        # When no gender filter, show ALL products
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
        # Only filter by gender if explicitly provided and not empty
        if gender and isinstance(gender, str) and gender.strip() and gender.lower() in ['men', 'women', 'unisex']:
            # Case-insensitive filter: check both uppercase and lowercase
            base = base.filter(
                (ProductModel.gender == gender.lower()) | 
                (ProductModel.gender == gender.upper()) |
                (ProductModel.gender == gender.capitalize())
            )
        # When no gender filter, show ALL products regardless of gender value
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
    product = db.query(ProductModel).filter(ProductModel.id == product_id).first()
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
            otp_expiry=expiry
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

    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/profile", tags=["Users"])
def read_profile(current_user: str = Depends(get_current_user)):
    return {"message": f"Welcome, {current_user}!"}

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