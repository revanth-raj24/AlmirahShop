from pydantic import BaseModel, model_validator
from typing import List, Literal, Optional
from datetime import datetime

class ProductBase(BaseModel):
    name: str
    description: str | None = None
    image_url: str | None = None
    price: float
    discounted_price: float | None = None
    gender: Literal['men','women','unisex'] | None = None
    category: str | None = None

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
    quantity: int

class CartItemResponse(BaseModel):
    id: int
    product_id: int
    quantity: int

    class Config:
        from_attributes = True

class CartItemQuantityUpdate(BaseModel):
    product_id: int
    quantity: int


class OrderItemResponse(BaseModel):
    id: int
    product_id: int
    quantity: int
    price: float
    product: Optional[Product] = None  # Include product details

    class Config:
        from_attributes = True

class OrderResponse(BaseModel):
    id: int
    user_id: int
    total_price: float
    status: str
    created_at: datetime
    order_items: List[OrderItemResponse] = []
    delivery_address: Optional[dict] = None  # Address snapshot

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