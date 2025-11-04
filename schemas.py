from pydantic import BaseModel
from typing import List, Literal
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
