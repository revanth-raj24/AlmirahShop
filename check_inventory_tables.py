"""
Script to check and fix inventory tables schema
"""
from sqlalchemy import text, inspect
from database import engine

def check_and_fix_tables():
    """Check inventory tables and fix if needed"""
    inspector = inspect(engine)
    
    with engine.begin() as conn:
        # Check if inventory_variants table exists
        result = conn.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name='inventory_variants'"))
        table_exists = result.fetchone() is not None
        
        if table_exists:
            # Get current columns
            result = conn.execute(text("PRAGMA table_info(inventory_variants)"))
            columns = {row[1]: row for row in result}
            print("Current inventory_variants columns:", list(columns.keys()))
            
            # Check if inventory_item_id exists
            if 'inventory_item_id' not in columns:
                print("ERROR: inventory_item_id column missing!")
                print("Dropping and recreating inventory_variants table...")
                
                # Drop the table
                conn.execute(text("DROP TABLE IF EXISTS inventory_variants"))
                
                # Recreate with correct schema
                conn.execute(text("""
                    CREATE TABLE inventory_variants (
                        id INTEGER PRIMARY KEY,
                        inventory_item_id INTEGER NOT NULL,
                        variant_key TEXT NOT NULL,
                        quantity INTEGER NOT NULL DEFAULT 0,
                        created_at DATETIME,
                        updated_at DATETIME,
                        FOREIGN KEY(inventory_item_id) REFERENCES inventory_items(id)
                    )
                """))
                
                # Create indexes
                conn.execute(text("CREATE INDEX IF NOT EXISTS ix_inventory_variants_inventory_item_id ON inventory_variants(inventory_item_id)"))
                print("✓ inventory_variants table recreated successfully")
            else:
                print("✓ inventory_item_id column exists")
        else:
            print("inventory_variants table does not exist, creating...")
            conn.execute(text("""
                CREATE TABLE inventory_variants (
                    id INTEGER PRIMARY KEY,
                    inventory_item_id INTEGER NOT NULL,
                    variant_key TEXT NOT NULL,
                    quantity INTEGER NOT NULL DEFAULT 0,
                    created_at DATETIME,
                    updated_at DATETIME,
                    FOREIGN KEY(inventory_item_id) REFERENCES inventory_items(id)
                )
            """))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_inventory_variants_inventory_item_id ON inventory_variants(inventory_item_id)"))
            print("✓ inventory_variants table created")
        
        # Check inventory_items table
        result = conn.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name='inventory_items'"))
        if not result.fetchone():
            print("Creating inventory_items table...")
            conn.execute(text("""
                CREATE TABLE inventory_items (
                    id INTEGER PRIMARY KEY,
                    product_id INTEGER NOT NULL,
                    seller_id INTEGER NOT NULL,
                    sku TEXT,
                    quantity INTEGER NOT NULL DEFAULT 0,
                    reserved_quantity INTEGER NOT NULL DEFAULT 0,
                    location TEXT,
                    is_active BOOLEAN DEFAULT 1,
                    created_at DATETIME,
                    updated_at DATETIME,
                    FOREIGN KEY(product_id) REFERENCES products(id),
                    FOREIGN KEY(seller_id) REFERENCES users(id)
                )
            """))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_inventory_items_product_id ON inventory_items(product_id)"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_inventory_items_seller_id ON inventory_items(seller_id)"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_inventory_items_sku ON inventory_items(sku)"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_inventory_items_is_active ON inventory_items(is_active)"))
            print("✓ inventory_items table created")
        
        # Check inventory_logs table
        result = conn.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name='inventory_logs'"))
        if not result.fetchone():
            print("Creating inventory_logs table...")
            conn.execute(text("""
                CREATE TABLE inventory_logs (
                    id INTEGER PRIMARY KEY,
                    inventory_item_id INTEGER NOT NULL,
                    change INTEGER NOT NULL,
                    reason TEXT NOT NULL,
                    actor_id INTEGER NOT NULL,
                    created_at DATETIME,
                    FOREIGN KEY(inventory_item_id) REFERENCES inventory_items(id),
                    FOREIGN KEY(actor_id) REFERENCES users(id)
                )
            """))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_inventory_logs_inventory_item_id ON inventory_logs(inventory_item_id)"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_inventory_logs_actor_id ON inventory_logs(actor_id)"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_inventory_logs_created_at ON inventory_logs(created_at)"))
            print("✓ inventory_logs table created")
        
        print("\n✓ All inventory tables verified/created successfully!")

if __name__ == "__main__":
    print("Checking inventory tables...")
    check_and_fix_tables()

