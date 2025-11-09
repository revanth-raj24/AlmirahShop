from pydantic import BaseModel, model_validator
from typing import List, Literal, Optional, Dict, Any
from datetime import datetime
import json

class ProductBase(BaseModel):
    name: str
    description: str | None = None
    image_url: str | None = None
    price: float
    discounted_price: float | None = None
    gender: Literal['men','women','unisex'] | None = None
    category: str | None = None
    sizes: List[str] | None = None  # ["S", "M", "L", "XL", "XXL"]
    colors: List[str] | None = None  # ["Red", "Blue", "Black"]
    variants: Dict[str, str] | None = None  # {"Red": "/images/red.jpg", "Blue": "/images/blue.jpg"}
    size_fit: str | None = None
    material_care: str | None = None
    specifications: Dict[str, str] | None = None  # {"Fabric": "Cotton", "Fit": "Regular"}

class ProductCreate(ProductBase):
    pass

class Product(BaseModel):
    id: int
    name: str
    description: str | None = None
    image_url: str | None = None
    price: float
    discounted_price: float | None = None
    gender: Literal['men','women','unisex'] | None = None
    category: str | None = None
    seller_id: int | None = None
    is_verified: bool | None = None
    verification_status: str | None = None
    verification_notes: str | None = None
    submitted_at: datetime | None = None
    sizes: List[str] | None = None
    colors: List[str] | None = None
    variants: Dict[str, str] | None = None  # Legacy JSON field
    size_fit: str | None = None
    material_care: str | None = None
    specifications: Dict[str, str] | None = None
    average_rating: float | None = None  # Computed field
    total_reviews: int | None = None  # Computed field
    product_variants: List["VariantResponse"] = []  # New variant system

    class Config:
        from_attributes = True

class ProductListResponse(BaseModel):
    items: List[Product]
    total: int
    page: int
    page_size: int

class ProductBulkUpdate(BaseModel):
    product_ids: List[int]
    gender: Literal['men','women','unisex'] | None = None
    category: str | None = None

# User-related schemas
class UserCreate(BaseModel):
    username: str
    email: str
    phone: str | None = None
    password: str

class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    phone: str | None = None
    role: str | None = None
    is_approved: bool | None = None
    is_active: bool | None = None
    created_at: datetime | None = None

    class Config:
        from_attributes = True

class UserDetailResponse(BaseModel):
    """Full user profile with nested data"""
    id: int
    username: str
    email: str
    phone: str | None = None
    role: str
    is_active: bool
    is_approved: bool | None = None
    created_at: datetime | None = None
    addresses: List["AddressResponse"] = []
    orders: List["OrderResponse"] = []
    returns: List["OrderResponse"] = []  # Orders with status Cancelled/Returned
    
    class Config:
        from_attributes = True

class SellerCreate(BaseModel):
    username: str
    email: str
    phone: str | None = None
    password: str

class SellerResponse(BaseModel):
    id: int
    username: str
    email: str
    phone: str | None = None
    role: str
    is_approved: bool
    is_active: bool

    class Config:
        from_attributes = True

class CartItemCreate(BaseModel):
    product_id: int
    variant_id: int | None = None  # Required if product has variants
    quantity: int
    size: str | None = None  # Legacy: kept for backward compatibility
    color: str | None = None  # Legacy: kept for backward compatibility

class CartItemResponse(BaseModel):
    id: int
    product_id: int
    variant_id: int | None = None
    quantity: int
    size: str | None = None  # Legacy
    color: str | None = None  # Legacy
    variant: Optional["VariantResponse"] = None

    class Config:
        from_attributes = True

class CartItemQuantityUpdate(BaseModel):
    product_id: int
    quantity: int


class OrderItemResponse(BaseModel):
    id: int
    product_id: int
    variant_id: int | None = None
    quantity: int
    price: float
    seller_id: Optional[int] = None
    status: Optional[str] = "Pending"
    rejection_reason: Optional[str] = None
    # Variant snapshot fields
    variant_size: Optional[str] = None
    variant_color: Optional[str] = None
    variant_image_url: Optional[str] = None
    # Return fields
    return_status: Optional[str] = "None"
    return_reason: Optional[str] = None
    return_notes: Optional[str] = None
    return_requested_at: Optional[datetime] = None
    return_processed_at: Optional[datetime] = None
    is_return_eligible: Optional[bool] = True
    product: Optional[Product] = None  # Include product details
    variant: Optional["VariantResponse"] = None

    class Config:
        from_attributes = True

class OrderResponse(BaseModel):
    id: int
    user_id: int
    total_price: float
    status: str
    created_at: datetime
    ordered_at: Optional[datetime] = None
    order_items: List[OrderItemResponse] = []
    delivery_address: Optional[dict] = None  # Address snapshot
    # Shipping snapshot fields
    ship_name: Optional[str] = None
    ship_phone: Optional[str] = None
    ship_address_line1: Optional[str] = None
    ship_address_line2: Optional[str] = None
    ship_city: Optional[str] = None
    ship_state: Optional[str] = None
    ship_country: Optional[str] = None
    ship_pincode: Optional[str] = None

    class Config:
        from_attributes = True

class WishlistItemResponse(BaseModel):
    id: int
    product_id: int
    created_at: datetime

    class Config:
        from_attributes = True

class VerifyOTPRequest(BaseModel):
    email: str
    otp: str

class ResendOTPRequest(BaseModel):
    email: str

class BulkProductCreateItem(BaseModel):
    name: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    price: float
    discounted_price: Optional[float] = None
    gender: Optional[str] = None
    category: Optional[str] = None

class BulkProductCreate(BaseModel):
    products: List[BulkProductCreateItem]

class BulkProductCreateResponse(BaseModel):
    created: int
    total: int
    errors: List[str]
    products: List[Product]

    class Config:
        from_attributes = True

# Password Reset Schemas
class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    email: str
    otp_or_token: Optional[str] = None  # Can be OTP (6 digits) or reset token
    token: Optional[str] = None  # Backward compatibility: old frontends send 'token'
    new_password: str
    
    @model_validator(mode='after')
    def validate_token_or_otp(self):
        # If token is provided but otp_or_token is not, use token
        if self.token and not self.otp_or_token:
            self.otp_or_token = self.token
        # Ensure otp_or_token is set
        if not self.otp_or_token:
            raise ValueError("Either 'otp_or_token' or 'token' must be provided")
        return self

# Address Schemas
class AddressBase(BaseModel):
    full_name: str
    phone_number: str
    address_line_1: str
    address_line_2: Optional[str] = None
    landmark: Optional[str] = None
    city: str
    state: str
    pincode: str
    tag: Literal["home", "office", "other"] = "home"

class AddressCreate(AddressBase):
    pass

class AddressUpdate(BaseModel):
    full_name: Optional[str] = None
    phone_number: Optional[str] = None
    address_line_1: Optional[str] = None
    address_line_2: Optional[str] = None
    landmark: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    tag: Optional[Literal["home", "office", "other"]] = None

class AddressResponse(AddressBase):
    id: int
    user_id: int
    is_default: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Profile Schemas
class ProfileResponse(BaseModel):
    id: int
    username: str
    email: str
    phone: str | None = None
    gender: str | None = None
    dob: datetime | None = None

    class Config:
        from_attributes = True

class ProfileUpdate(BaseModel):
    username: Optional[str] = None
    phone: Optional[str] = None
    gender: Optional[Literal["male", "female", "other"]] = None
    dob: Optional[datetime] = None

class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str

# Seller Order Item Schemas
class SellerOrderItemResponse(BaseModel):
    """Order item with order and customer info for seller view"""
    id: int
    order_id: int
    product_id: int
    quantity: int
    price: float
    seller_id: Optional[int] = None
    status: str
    rejection_reason: Optional[str] = None
    product: Optional[Product] = None
    # Order snapshot info
    order_ordered_at: Optional[datetime] = None
    order_ship_name: Optional[str] = None
    order_ship_phone: Optional[str] = None
    order_ship_address_line1: Optional[str] = None
    order_ship_address_line2: Optional[str] = None
    order_ship_city: Optional[str] = None
    order_ship_state: Optional[str] = None
    order_ship_country: Optional[str] = None
    order_ship_pincode: Optional[str] = None
    # Customer info
    customer_username: Optional[str] = None
    customer_email: Optional[str] = None

    class Config:
        from_attributes = True

class SellerOrderItemListResponse(BaseModel):
    """Paginated list of seller order items"""
    items: List[SellerOrderItemResponse]
    total: int
    page: int
    page_size: int

class RejectOrderItemRequest(BaseModel):
    reason: Optional[str] = None

class OverrideOrderItemStatusRequest(BaseModel):
    status: str
    reason: Optional[str] = None

# Admin Product Verification Schemas
class ProductWithSellerInfo(Product):
    """Product with seller information for admin review"""
    seller_username: Optional[str] = None
    seller_email: Optional[str] = None
    seller_phone: Optional[str] = None

    class Config:
        from_attributes = True

class RejectProductRequest(BaseModel):
    notes: Optional[str] = None

# Return Request Schemas
class ReturnRequestCreate(BaseModel):
    reason: str
    notes: Optional[str] = None

class ReturnRejectRequest(BaseModel):
    notes: Optional[str] = None

class ReturnOverrideRequest(BaseModel):
    status: str
    notes: Optional[str] = None

class ReturnItemResponse(BaseModel):
    """Extended order item response with return details"""
    id: int
    order_id: int
    product_id: int
    quantity: int
    price: float
    seller_id: Optional[int] = None
    status: str
    rejection_reason: Optional[str] = None
    return_status: str
    return_reason: Optional[str] = None
    return_notes: Optional[str] = None
    return_requested_at: Optional[datetime] = None
    return_processed_at: Optional[datetime] = None
    is_return_eligible: bool
    product: Optional[Product] = None
    # Order info
    order_ordered_at: Optional[datetime] = None
    order_ship_name: Optional[str] = None
    order_ship_phone: Optional[str] = None
    order_ship_address_line1: Optional[str] = None
    order_ship_address_line2: Optional[str] = None
    order_ship_city: Optional[str] = None
    order_ship_state: Optional[str] = None
    order_ship_country: Optional[str] = None
    order_ship_pincode: Optional[str] = None
    # Customer info
    customer_username: Optional[str] = None
    customer_email: Optional[str] = None

    class Config:
        from_attributes = True

class ReturnListResponse(BaseModel):
    """Paginated list of return items"""
    items: List[ReturnItemResponse]
    total: int
    page: int
    page_size: int

# Review Schemas
class ReviewCreate(BaseModel):
    rating: int  # 1-5
    review_text: str | None = None

class ReviewResponse(BaseModel):
    id: int
    product_id: int
    user_id: int
    rating: int
    review_text: str | None = None
    created_at: datetime
    user_username: str | None = None

    class Config:
        from_attributes = True

class ProductDetailResponse(Product):
    """Extended product response with reviews"""
    reviews: List[ReviewResponse] = []

# Product Variant Schemas
class VariantCreate(BaseModel):
    size: str | None = None
    color: str | None = None
    image_url: str | None = None
    price: float | None = None
    stock: int = 0

class VariantUpdate(BaseModel):
    size: str | None = None
    color: str | None = None
    image_url: str | None = None
    price: float | None = None
    stock: int | None = None

class VariantResponse(BaseModel):
    id: int
    product_id: int
    size: str | None = None
    color: str | None = None
    image_url: str | None = None
    price: float | None = None
    stock: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True