"""
Script to populate inventory for all existing seller products.
Sets stock quantity to 5 for all products.
"""
import sys
from sqlalchemy.orm import Session
from database import SessionLocal, engine
from models import User, Product as ProductModel, InventoryItem
from datetime import datetime, timezone

def populate_inventory():
    """Create inventory items for all existing seller products with quantity=5"""
    db: Session = SessionLocal()
    
    try:
        # Get all sellers
        sellers = db.query(User).filter(User.role == "seller").all()
        
        if not sellers:
            print("No sellers found in the database.")
            return
        
        total_created = 0
        total_skipped = 0
        
        for seller in sellers:
            print(f"\nProcessing seller: {seller.username} (ID: {seller.id})")
            
            # Get all products for this seller
            products = db.query(ProductModel).filter(
                ProductModel.seller_id == seller.id
            ).all()
            
            if not products:
                print(f"  No products found for seller {seller.username}")
                continue
            
            for product in products:
                # Check if inventory item already exists
                existing = db.query(InventoryItem).filter(
                    InventoryItem.product_id == product.id,
                    InventoryItem.seller_id == seller.id
                ).first()
                
                if existing:
                    print(f"  Skipping product '{product.name}' (ID: {product.id}) - inventory already exists")
                    total_skipped += 1
                    continue
                
                # Create inventory item
                inventory_item = InventoryItem(
                    product_id=product.id,
                    seller_id=seller.id,
                    sku=None,  # Can be set later
                    quantity=5,
                    reserved_quantity=0,
                    location=None,  # Can be set later
                    is_active=True,
                    created_at=datetime.now(timezone.utc),
                    updated_at=datetime.now(timezone.utc)
                )
                
                db.add(inventory_item)
                print(f"  Created inventory for product '{product.name}' (ID: {product.id}) with quantity=5")
                total_created += 1
        
        # Commit all changes
        db.commit()
        print(f"\n{'='*60}")
        print(f"Inventory population completed!")
        print(f"  Created: {total_created} inventory items")
        print(f"  Skipped: {total_skipped} (already existed)")
        print(f"{'='*60}")
        
    except Exception as e:
        db.rollback()
        print(f"\nError occurred: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    print("Starting inventory population...")
    print("This will create inventory items for all seller products with quantity=5")
    print("="*60)
    populate_inventory()

