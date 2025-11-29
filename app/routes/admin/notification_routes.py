from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional
from database import get_db
from app.models.notification import Notification
from app.schemas.notification import NotificationCreate, NotificationResponse, NotificationUpdate
from auth_utils import require_admin
from models import User

router = APIRouter(prefix="/admin/notifications", tags=["Admin"])

@router.post("", response_model=NotificationResponse, status_code=status.HTTP_201_CREATED)
def create_notification(
    notification: NotificationCreate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_admin)
):
    """Create a new notification (admin only)"""
    new_notification = Notification(
        type=notification.type,
        message=notification.message,
        seller_id=notification.seller_id,
        product_id=notification.product_id,
        order_id=notification.order_id
    )
    db.add(new_notification)
    db.commit()
    db.refresh(new_notification)
    return new_notification

@router.get("", response_model=List[NotificationResponse])
def list_notifications(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    type_filter: Optional[str] = Query(None, description="Filter by notification type"),
    is_read: Optional[bool] = Query(None, description="Filter by read status"),
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_admin)
):
    """List all notifications sorted by newest first (admin only)"""
    query = db.query(Notification)
    
    if type_filter:
        query = query.filter(Notification.type == type_filter)
    
    if is_read is not None:
        query = query.filter(Notification.is_read == is_read)
    
    notifications = query.order_by(desc(Notification.created_at)).offset(skip).limit(limit).all()
    return notifications

@router.patch("/{notification_id}/read", response_model=NotificationResponse)
def mark_notification_read(
    notification_id: int,
    update: NotificationUpdate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_admin)
):
    """Mark notification as read/unread (admin only)"""
    notification = db.query(Notification).filter(Notification.id == notification_id).first()
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
    current_admin: User = Depends(require_admin)
):
    """Delete a notification (admin only)"""
    notification = db.query(Notification).filter(Notification.id == notification_id).first()
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    db.delete(notification)
    db.commit()
    return None

@router.get("/unread/count", response_model=dict)
def get_unread_count(
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_admin)
):
    """Get count of unread notifications (admin only)"""
    count = db.query(Notification).filter(Notification.is_read == False).count()
    return {"unread_count": count}

