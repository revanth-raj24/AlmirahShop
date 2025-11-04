from database import SessionLocal
from models import Product

db = SessionLocal()
db.query(Product).delete()
db.commit()
db.close()
print("All products deleted successfully.")