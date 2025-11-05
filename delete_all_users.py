from database import SessionLocal
from models import User, Order, OrderItem, CartItem, WishlistItem

db = SessionLocal()

try:
    # First, count what we're about to delete
    user_count = db.query(User).count()
    order_count = db.query(Order).count()
    order_item_count = db.query(OrderItem).count()
    cart_item_count = db.query(CartItem).count()
    wishlist_item_count = db.query(WishlistItem).count()
    
    print(f"Found {user_count} users, {order_count} orders, {order_item_count} order items, {cart_item_count} cart items, {wishlist_item_count} wishlist items")
    
    # Delete OrderItems first (though they'll cascade when Orders are deleted)
    # But it's safer to be explicit
    db.query(OrderItem).delete()
    print(f"Deleted {order_item_count} order items")
    
    # Delete Orders
    db.query(Order).delete()
    print(f"Deleted {order_count} orders")
    
    # Delete CartItems (though they'll cascade when Users are deleted)
    db.query(CartItem).delete()
    print(f"Deleted {cart_item_count} cart items")
    
    # Delete WishlistItems (though they'll cascade when Users are deleted)
    db.query(WishlistItem).delete()
    print(f"Deleted {wishlist_item_count} wishlist items")
    
    # Finally, delete all Users
    db.query(User).delete()
    print(f"Deleted {user_count} users")
    
    # Commit all changes
    db.commit()
    print("\nAll users and their data have been deleted successfully!")
    
except Exception as e:
    db.rollback()
    print(f"Error occurred: {e}")
    raise
finally:
    db.close()

