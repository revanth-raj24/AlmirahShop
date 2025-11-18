# Quick Test Guide - Stock & Inventory Management

## Quick Start

1. **Start Server:**
   ```bash
   uvicorn main:app --reload
   ```

2. **Open Swagger UI:**
   ```
   http://127.0.0.1:8000/docs
   ```

---

## Essential Test Scenarios

### Scenario 1: Basic Stock Update Flow

1. **Login as Seller:**
   ```
   POST /users/login
   Body: {"username": "seller1", "password": "pass"}
   → Copy access_token
   ```

2. **Get Inventory:**
   ```
   GET /seller/inventory
   Headers: Authorization: Bearer <token>
   → Check products have stock field
   ```

3. **Update Stock:**
   ```
   POST /seller/inventory/update/1
   Body: {"stock": 10, "low_stock_threshold": 5}
   → Verify status = "IN_STOCK"
   ```

4. **Update to Low Stock:**
   ```
   POST /seller/inventory/update/1
   Body: {"stock": 3}
   → Verify status = "LOW_STOCK"
   ```

5. **Update to Zero:**
   ```
   POST /seller/inventory/update/1
   Body: {"stock": 0}
   → Verify status = "OUT_OF_STOCK"
   ```

---

### Scenario 2: Order Creation - Stock Decrease

1. **Setup:**
   - Product with stock=10
   - Customer logged in
   - Product in cart (quantity=3)

2. **Check Stock Before:**
   ```
   GET /products/1/stock
   → stock: 10
   ```

3. **Create Order:**
   ```
   POST /orders/create
   Headers: Authorization: Bearer <customer_token>
   ```

4. **Check Stock After:**
   ```
   GET /products/1/stock
   → stock: 7 (10 - 3)
   ```

---

### Scenario 3: Insufficient Stock Error

1. **Setup:**
   - Product with stock=2
   - Cart with quantity=5

2. **Try to Create Order:**
   ```
   POST /orders/create
   → Should return 400 error
   → Message: "Insufficient stock... Available: 2, Requested: 5"
   ```

---

### Scenario 4: Return Processing - Stock Increase

1. **Setup:**
   - Order item delivered (stock was decreased)
   - Current stock: 5

2. **Request Return:**
   ```
   POST /returns/request/{order_item_id}
   Body: {"reason": "Defective"}
   ```

3. **Seller Accepts:**
   ```
   PATCH /seller/returns/{order_item_id}/accept
   ```

4. **Seller Marks Received:**
   ```
   PATCH /seller/returns/{order_item_id}/mark-received
   ```

5. **Check Stock:**
   ```
   GET /products/1/stock
   → Stock increased by returned quantity
   ```

---

### Scenario 5: Admin Inventory Overview

1. **Login as Admin:**
   ```
   POST /users/login
   → Get admin token
   ```

2. **Get Out of Stock:**
   ```
   GET /admin/inventory/out-of-stock
   → Only products with stock=0
   ```

3. **Get Low Stock:**
   ```
   GET /admin/inventory/low-stock
   → Products below threshold
   ```

4. **Get Full Inventory:**
   ```
   GET /admin/inventory?status_filter=OUT_OF_STOCK
   → Filtered by status
   ```

5. **Admin Override Stock:**
   ```
   PATCH /admin/inventory/update/1
   Body: {"stock": 100}
   → Admin can update any product
   ```

---

## Expected Status Values

| Stock Level | Status |
|------------|--------|
| stock = 0 | `OUT_OF_STOCK` |
| 0 < stock <= threshold | `LOW_STOCK` |
| stock > threshold | `IN_STOCK` |

**Default threshold:** 5

---

## Common Test Data

### Create Test Product (Seller):
```json
POST /seller/products/create
{
  "name": "Test Product",
  "price": 99.99,
  "stock": 10,  // This will be set via inventory endpoint
  "category": "Clothing",
  "gender": "men"
}
```

### Update Stock:
```json
POST /seller/inventory/update/{product_id}
{
  "stock": 25,
  "low_stock_threshold": 10
}
```

---

## Verification Checklist

After each test, verify:

- [ ] Stock value updated correctly
- [ ] Status updated automatically
- [ ] Total stock calculation correct (product + variants)
- [ ] No errors in server logs
- [ ] Response includes all required fields

---

## Troubleshooting

**Problem:** Status not updating
- **Fix:** Check `update_product_status()` is called after stock changes

**Problem:** 403 Forbidden
- **Fix:** Verify token is valid and user has correct role

**Problem:** Stock calculation wrong
- **Fix:** Check variant stock is included in total_stock calculation

**Problem:** Migration not applied
- **Fix:** Restart server (migration runs on startup)

---

## Ready for Frontend?

Once you've verified:
- ✅ All endpoints work
- ✅ Stock decreases on order
- ✅ Stock increases on return
- ✅ Status updates automatically
- ✅ Filters work correctly

→ Proceed to frontend implementation!

