from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta
from database import Base, engine, SessionLocal
from models import Product as ProductModel, User, Order, OrderItem, CartItem
from schemas import ProductCreate, Product as ProductSchema, ProductListResponse, ProductBulkUpdate, UserCreate, UserResponse, CartItemCreate, CartItemResponse, CartItemQuantityUpdate, OrderResponse, OrderItemResponse
from auth_utils import hash_password, verify_password, create_access_token, get_current_user
from fastapi import Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.exc import IntegrityError
from sqlalchemy import text
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("fastecom")

TAGS_METADATA = [
    {"name": "Products", "description": "Manage products catalog."},
    {"name": "Users", "description": "User registration and profile."},
    {"name": "Auth", "description": "Authentication endpoints."},
    {"name": "Cart", "description": "Shopping cart operations."},
    {"name": "Orders", "description": "Order creation and retrieval."},
]

app = FastAPI(
    title="FastEcom API",
    description="Simple e-commerce API with auth, cart, and orders",
    version="1.0.0",
    openapi_tags=TAGS_METADATA,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# Create all tables in DB
Base.metadata.create_all(bind=engine)

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

# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

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
        if gender:
            query = query.filter(ProductModel.gender == gender)
        return query.order_by(ProductModel.id.desc()).all()
    except Exception:
        logger.exception("Failed to fetch products")
        raise HTTPException(status_code=500, detail="Failed to fetch products")

@app.get("/products/paginated", response_model=ProductListResponse, tags=["Products"])
def get_products_paginated(
    page: int = Query(1, ge=1),
    page_size: int = Query(12, ge=1, le=60),
    gender: str | None = Query(None, description="Filter by gender: men/women/unisex"),
    db: Session = Depends(get_db)
):
    try:
        base = db.query(ProductModel)
        if gender:
            base = base.filter(ProductModel.gender == gender)
        total = base.count()
        offset = (page - 1) * page_size
        items = base.order_by(ProductModel.id.desc()).limit(page_size).offset(offset).all()
        return {"items": items, "total": total, "page": page, "page_size": page_size}
    except Exception:
        logger.exception("Failed to fetch paginated products")
        raise HTTPException(status_code=500, detail="Failed to fetch products")

@app.get("/products/{product_id}", response_model=ProductSchema, tags=["Products"])
def get_product(product_id: int, db: Session = Depends(get_db)):
    product = db.query(ProductModel).filter(ProductModel.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
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

# Register User
@app.post("/users/signup", response_model=UserResponse, tags=["Users"])
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

        hashed_pw = hash_password(user.password)
        new_user = User(username=user.username, email=user.email, phone=normalized_phone, hashed_password=hashed_pw)
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
        logger.info("Signup success: user_id=%s username=%s", new_user.id, new_user.username)
        return new_user
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unexpected error during signup")
        raise HTTPException(status_code=500, detail="Signup failed due to server error")

# Login User
@app.post("/users/login",tags=["Auth"])
def login_user(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    identifier = form_data.username  # may be username, email, or phone
    user = (
        db.query(User)
        .filter(
            (User.username == identifier) | (User.email == identifier) | (User.phone == identifier)
        )
        .first()
    )
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

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
    if gender:
        query = query.filter(ProductModel.gender == gender)

    results = query.order_by(ProductModel.id.desc()).all()
    return results

@app.post("/products/bulk-update", response_model=dict, tags=["Products"])
def bulk_update_products(payload: ProductBulkUpdate, db: Session = Depends(get_db)):
    if not payload.product_ids:
        raise HTTPException(status_code=400, detail="product_ids cannot be empty")
    updates: dict = {}
    if payload.gender is not None:
        updates['gender'] = payload.gender
    if payload.category is not None:
        updates['category'] = payload.category
    if not updates:
        raise HTTPException(status_code=400, detail="Nothing to update. Provide gender and/or category")

    try:
        q = db.query(ProductModel).filter(ProductModel.id.in_(payload.product_ids))
        count = q.update(updates, synchronize_session=False)
        db.commit()
        return {"updated": count}
    except Exception:
        db.rollback()
        logger.exception("Bulk update failed")
        raise HTTPException(status_code=500, detail="Failed to update products")

