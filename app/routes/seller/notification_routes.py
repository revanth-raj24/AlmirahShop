from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, or_
from typing import List, Optional
from database import get_db
from app.models.notification import Notification
from app.schemas.notification import NotificationCreate, NotificationResponse, NotificationUpdate
from auth_utils import require_approved_seller
from models import User

router = APIRouter(prefix="/seller/notifications", tags=["Seller"])

@router.post("/save", response_model=NotificationResponse, status_code=status.HTTP_201_CREATED)
def save_notification(
    notification: NotificationCreate,
    db: Session = Depends(get_db),
    current_seller: User = Depends(require_approved_seller)
):
    """Save a notification for the current seller"""
    new_notification = Notification(
        type=notification.type,
        message=notification.message,
        seller_id=current_seller.id,
        product_id=notification.product_id,
        order_id=notification.order_id,
        sku=notification.sku,
        size=notification.size,
        color=notification.color,
        priority=notification.priority or "medium"
    )
    db.add(new_notification)
    db.commit()
    db.refresh(new_notification)
    return new_notification

@router.get("", response_model=List[NotificationResponse])
def list_seller_notifications(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    filter: Optional[str] = Query(None, description="Filter by type: OOS, low_stock, approval, order, payment, dispute, return"),
    db: Session = Depends(get_db),
    current_seller: User = Depends(require_approved_seller)
):
    """List seller's notifications sorted by newest first"""
    query = db.query(Notification).filter(Notification.seller_id == current_seller.id)
    
    # Map filter values to notification types
    type_mapping = {
        "OOS": "stock",
        "low_stock": "stock",
        "approval": "approval",
        "order": "order",
        "payment": "payment",
        "dispute": "dispute",
        "return": "return"
    }
    
    if filter:
        if filter in type_mapping:
            notification_type = type_mapping[filter]
            if filter == "OOS":
                # For OOS, filter by stock type and check message content
                query = query.filter(
                    Notification.type == notification_type,
                    Notification.message.contains("Out of Stock")
                )
            elif filter == "low_stock":
                # For low_stock, filter by stock type and check message content
                query = query.filter(
                    Notification.type == notification_type,
                    Notification.message.contains("Low Stock")
                )
            else:
                query = query.filter(Notification.type == notification_type)
    
    notifications = query.order_by(desc(Notification.created_at)).offset(skip).limit(limit).all()
    return notifications

@router.patch("/{notification_id}/read", response_model=NotificationResponse)
def mark_notification_read(
    notification_id: int,
    update: NotificationUpdate,
    db: Session = Depends(get_db),
    current_seller: User = Depends(require_approved_seller)
):
    """Mark notification as read/unread"""
    notification = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.seller_id == current_seller.id
    ).first()
    
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    if update.is_read is not None:
        notification.is_read = update.is_read
    
    db.commit()
    db.refresh(notification)
    return notification

@router.delete("/{notification_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    current_seller: User = Depends(require_approved_seller)
):
    """Delete a notification (soft delete - actually deletes from DB)"""
    notification = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.seller_id == current_seller.id
    ).first()
    
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    db.delete(notification)
    db.commit()
    return None

@router.get("/unread/count", response_model=dict)
def get_unread_count(
    db: Session = Depends(get_db),
    current_seller: User = Depends(require_approved_seller)
):
    """Get count of unread notifications for the current seller"""
    count = db.query(Notification).filter(
        Notification.seller_id == current_seller.id,
        Notification.is_read == False
    ).count()
    return {"unread_count": count}

