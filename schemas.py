from pydantic import BaseModel
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

    class Config:
        from_attributes = True

class OrderResponse(BaseModel):
    id: int
    user_id: int
    total_price: float
    status: str
    created_at: datetime
    order_items: List[OrderItemResponse] = []

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