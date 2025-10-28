from pydantic import BaseModel
from typing import List
from datetime import datetime

class ProductBase(BaseModel):
    name: str
    price: float
    in_stock: bool

class ProductCreate(ProductBase):
    pass

class ProductResponse(ProductBase):
    id: int

    class Config:
         from_attributes = True

# User-related schemas
class UserCreate(BaseModel):
    username: str
    email: str
    password: str

class UserResponse(BaseModel):
    id: int
    username: str
    email: str

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
