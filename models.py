from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, DateTime, Text, JSON
from sqlalchemy.orm import relationship
from datetime import datetime, timedelta
from database import Base

class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    image_url = Column(String, nullable=True)
    price = Column(Float, nullable=False)
    discounted_price = Column(Float, nullable=True)
    gender = Column(String, nullable=True, index=True)
    category = Column(String, nullable=True, index=True)
    seller_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    is_verified = Column(Boolean, default=False, index=True)
    
    # Product verification fields
    verification_status = Column(String, default="Pending", index=True)  # "Pending", "Approved", "Rejected"
    verification_notes = Column(Text, nullable=True)
    submitted_at = Column(DateTime, default=datetime.utcnow, nullable=True)
    
    # New product detail fields
    sizes = Column(Text, nullable=True)  # JSON array stored as TEXT: ["S", "M", "L", "XL"]
    colors = Column(Text, nullable=True)  # JSON array stored as TEXT: ["Red", "Blue", "Black"]
    legacy_variants = Column("variants", Text, nullable=True)  # JSON object: {"Red": "/images/red.jpg", "Blue": "/images/blue.jpg"} - maps to 'variants' column in DB
    size_fit = Column(Text, nullable=True)  # Size & Fit description
    material_care = Column(Text, nullable=True)  # Material & Care description
    specifications = Column(Text, nullable=True)  # JSON object: {"Fabric": "Cotton", "Fit": "Regular"}
    
    # Stock management fields
    stock = Column(Integer, default=0, index=True)  # Stock quantity for products without variants
    low_stock_threshold = Column(Integer, default=5)  # Threshold for low stock alerts
    status = Column(String, default="IN_STOCK", index=True)  # "IN_STOCK", "LOW_STOCK", "OUT_OF_STOCK"
    
    seller = relationship("User", back_populates="products", foreign_keys=[seller_id])
    reviews = relationship("Review", back_populates="product", cascade="all, delete-orphan")
    variants = relationship("ProductVariant", back_populates="product", cascade="all, delete-orphan")

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    phone = Column(String, unique=True, index=True, nullable=True)
    hashed_password = Column(String)

    # OTP Verification
    is_active = Column(Boolean, default=False)  # Only True after OTP verification
    otp = Column(String, nullable=True)
    otp_expiry = Column(DateTime, nullable=True)

    # Password Reset
    reset_token = Column(String, nullable=True, index=True)
    reset_token_expires = Column(DateTime, nullable=True)

    # Roles
    is_admin = Column(Boolean, default=False)
    is_seller = Column(Boolean, default=False)  # Boolean flag for seller role
    is_verified = Column(Boolean, default=False)  # Verification status
    role = Column(String, default="customer", index=True)  # "customer", "seller", "admin"
    is_approved = Column(Boolean, default=False)  # For sellers: must be approved by admin
    
    # Address Management
    has_address = Column(Boolean, default=False)  # True if user has at least one address

    # Profile Details
    gender = Column(String, nullable=True)  # "male", "female", "other"
    dob = Column(DateTime, nullable=True)  # Date of birth

    # Relationships
    cart_items = relationship("CartItem", back_populates="user", cascade="all, delete-orphan")
    wishlist_items = relationship("WishlistItem", back_populates="user", cascade="all, delete-orphan")
    orders = relationship("Order", back_populates="user")
    products = relationship("Product", back_populates="seller", foreign_keys="Product.seller_id")
    addresses = relationship("Address", back_populates="user", cascade="all, delete-orphan")


class CartItem(Base):
    __tablename__ = "cart_items"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    product_id = Column(Integer, ForeignKey("products.id"))
    variant_id = Column(Integer, ForeignKey("product_variants.id"), nullable=True, index=True)
    quantity = Column(Integer, default=1)
    size = Column(String, nullable=True)  # Selected size (e.g., "M", "L") - kept for backward compatibility
    color = Column(String, nullable=True)  # Selected color (e.g., "Red", "Blue") - kept for backward compatibility

    # Many-to-one relationships
    user = relationship("User", back_populates="cart_items")
    product = relationship("Product")
    variant = relationship("ProductVariant")

# ----- Order model -----
class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    total_price = Column(Float, default=0.0)
    status = Column(String, default="Pending")  # e.g. Pending, Paid, Shipped, Cancelled
    created_at = Column(DateTime, default=datetime.utcnow)
    delivery_address = Column(JSON, nullable=True)  # Snapshot of address at order time
    
    # Shipping snapshot fields (denormalized at order time)
    ship_name = Column(String, nullable=True)
    ship_phone = Column(String, nullable=True)
    ship_address_line1 = Column(String, nullable=True)
    ship_address_line2 = Column(String, nullable=True)
    ship_city = Column(String, nullable=True)
    ship_state = Column(String, nullable=True)
    ship_country = Column(String, nullable=True)
    ship_pincode = Column(String, nullable=True)
    ordered_at = Column(DateTime, default=datetime.utcnow)
    
    # Payment fields
    payment_method = Column(String, nullable=True)  # "COD", "UPI", "CARD", "NETBANKING", "WALLET"
    payment_status = Column(String, default="PENDING")  # "PENDING", "PAID", "FAILED", "PENDING_COD"
    payment_id = Column(String, nullable=True)  # Razorpay payment ID
    payment_order_id = Column(String, nullable=True)  # Razorpay order ID
    payment_signature = Column(String, nullable=True)  # Razorpay signature

    user = relationship("User", back_populates="orders")
    order_items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")


# ----- Address model -----
class Address(Base):
    __tablename__ = "addresses"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    full_name = Column(String, nullable=False)
    phone_number = Column(String, nullable=False)
    address_line_1 = Column(String, nullable=False)
    address_line_2 = Column(String, nullable=True)
    landmark = Column(String, nullable=True)
    city = Column(String, nullable=False)
    state = Column(String, nullable=False)
    pincode = Column(String, nullable=False)
    tag = Column(String, default="home")  # "home", "office", "other"
    is_default = Column(Boolean, default=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="addresses")


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"))
    product_id = Column(Integer, ForeignKey("products.id"))
    variant_id = Column(Integer, ForeignKey("product_variants.id"), nullable=True, index=True)
    quantity = Column(Integer, default=1)
    price = Column(Float, nullable=False)  # price at time of purchase
    # Variant snapshot fields (for display after variant might be deleted)
    variant_size = Column(String, nullable=True)
    variant_color = Column(String, nullable=True)
    variant_image_url = Column(String, nullable=True)
    
    # Seller routing fields
    seller_id = Column(Integer, index=True, nullable=True)  # copy from product.seller_id at order creation
    status = Column(String, default="Pending", index=True)  # "Pending", "Accepted", "Rejected", "Packed", "Shipped", "Delivered", "Cancelled"
    rejection_reason = Column(String, nullable=True)

    # Return fields
    return_status = Column(String, default="None", index=True)  # "None", "ReturnRequested", "ReturnAccepted", "ReturnRejected", "ReturnInTransit", "ReturnReceived", "RefundProcessed"
    return_reason = Column(Text, nullable=True)
    return_notes = Column(Text, nullable=True)
    return_requested_at = Column(DateTime, nullable=True)
    return_processed_at = Column(DateTime, nullable=True)
    is_return_eligible = Column(Boolean, default=True)

    order = relationship("Order", back_populates="order_items")
    product = relationship("Product")
    variant = relationship("ProductVariant")

class WishlistItem(Base):
    __tablename__ = "wishlist_items"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    product_id = Column(Integer, ForeignKey("products.id"))
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="wishlist_items")
    product = relationship("Product")

class Review(Base):
    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    rating = Column(Integer, nullable=False)  # 1-5
    review_text = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    product = relationship("Product", back_populates="reviews")
    user = relationship("User")

class ProductVariant(Base):
    __tablename__ = "product_variants"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    size = Column(String, nullable=True)
    color = Column(String, nullable=True)
    image_url = Column(String, nullable=True)
    price = Column(Float, nullable=True)  # Optional: if null, use product price
    stock = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    product = relationship("Product", back_populates="variants")



