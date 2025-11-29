from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    type = Column(String, nullable=False, index=True)  # stock, order, approval, seller_verification, payment, dispute, return
    message = Column(Text, nullable=True)  # Allow nullable for flexibility
    seller_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=True, index=True)
    sku = Column(String, nullable=True)  # Product SKU
    size = Column(String, nullable=True)  # Product size
    color = Column(String, nullable=True)  # Product color
    is_read = Column(Boolean, default=False, index=True)
    priority = Column(String, default="medium", index=True)  # low, medium, high
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    # Relationships
    seller = relationship("User", foreign_keys=[seller_id])
    product = relationship("Product", foreign_keys=[product_id])
    order = relationship("Order", foreign_keys=[order_id])

