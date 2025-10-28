from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta
from database import Base, engine, SessionLocal
from models import Product, User, Order, OrderItem, CartItem
from schemas import ProductCreate, ProductResponse, UserCreate, UserResponse, CartItemCreate, CartItemResponse, CartItemQuantityUpdate, OrderResponse, OrderItemResponse
from auth_utils import hash_password, verify_password, create_access_token, get_current_user
from fastapi import Query
from fastapi.middleware.cors import CORSMiddleware

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
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# Create all tables in DB
Base.metadata.create_all(bind=engine)

# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Create Product
@app.post("/products", response_model=ProductResponse, tags=["Products"])
def create_product(product: ProductCreate, db: Session = Depends(get_db)):
    new_product = Product(**product.model_dump())  # Changed from .dict()
    db.add(new_product)
    db.commit()
    db.refresh(new_product)
    return new_product

# Get All Products
@app.get("/products", response_model=list[ProductResponse], tags=["Products"])
def get_products(db: Session = Depends(get_db)):
    return db.query(Product).all()

# Get Single Product
@app.get("/products/{product_id}", response_model=ProductResponse, tags=["Products"])
def get_product(product_id: int, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product

# Delete Product
@app.delete("/products/{product_id}", tags=["Products"])
def delete_product(product_id: int, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
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
    existing_user = db.query(User).filter(User.email == user.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed_pw = hash_password(user.password)
    new_user = User(username=user.username, email=user.email, hashed_password=hashed_pw)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

# Login User
@app.post("/users/login",tags=["Auth"])
def login_user(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == form_data.username).first()
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
    product = db.query(Product).filter(Product.id == item.product_id).first()
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
        product = db.query(Product).filter(Product.id == ci.product_id).first()
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

@app.get("/products/search", response_model=list[ProductResponse])
def search_products(
    name: str | None = Query(None, description="Search by name"),
    min_price: float | None = Query(None, description="Minimum price"),
    max_price: float | None = Query(None, description="Maximum price"),
    db: Session = Depends(get_db)
):
    query = db.query(Product)

    if name:
        query = query.filter(Product.name.ilike(f"%{name}%"))
    if min_price is not None:
        query = query.filter(Product.price >= min_price)
    if max_price is not None:
        query = query.filter(Product.price <= max_price)

    results = query.all()
    return results

