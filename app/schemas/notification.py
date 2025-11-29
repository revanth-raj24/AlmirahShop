from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class NotificationCreate(BaseModel):
    type: str  # stock, order, approval, seller_verification, payment, dispute, return
    message: Optional[str] = None
    seller_id: Optional[int] = None
    product_id: Optional[int] = None
    order_id: Optional[int] = None
    sku: Optional[str] = None
    size: Optional[str] = None
    color: Optional[str] = None
    priority: Optional[str] = "medium"  # low, medium, high

class NotificationResponse(BaseModel):
    id: int
    type: str
    message: Optional[str] = None
    seller_id: Optional[int] = None
    product_id: Optional[int] = None
    order_id: Optional[int] = None
    sku: Optional[str] = None
    size: Optional[str] = None
    color: Optional[str] = None
    is_read: bool
    priority: str
    created_at: datetime

    class Config:
        from_attributes = True

class NotificationUpdate(BaseModel):
    is_read: Optional[bool] = None

