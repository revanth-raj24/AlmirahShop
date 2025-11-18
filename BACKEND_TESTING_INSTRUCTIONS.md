# Backend Stock & Inventory Management - Testing Instructions

## Prerequisites

1. **Start the FastAPI backend server:**
   ```bash
   cd C:\Users\Revanth Raj\Development\fastecom
   # Activate virtual environment if needed
   venv\Scripts\activate
   # Start the server
   uvicorn main:app --reload --host 127.0.0.1 --port 8000
   ```

2. **Access Swagger UI:**
   - Open browser: `http://127.0.0.1:8000/docs`
   - This provides interactive API testing interface

3. **Get Authentication Token:**
   - You'll need tokens for Seller, Customer, and Admin roles
   - Use `/users/login` endpoint to get tokens
   - Copy the `access_token` from response

---

## Test Plan Overview

### Phase 1: Database Migration Test
### Phase 2: Seller Inventory Endpoints
### Phase 3: Customer Stock Endpoints  
### Phase 4: Admin Inventory Endpoints
### Phase 5: Stock Management in Orders/Returns

---

## Phase 1: Database Migration Test

**Verify stock fields were added:**

1. **Check Product Table Structure:**
   ```sql
   -- If you have SQLite browser, check products table has:
   -- stock (INTEGER)
   -- low_stock_threshold (INTEGER) 
   -- status (VARCHAR)
   ```

2. **Or use API to verify:**
   - GET `/products` - Check if products have `stock`, `low_stock_threshold`, `status` fields
   - Should see default values: `stock: 0`, `low_stock_threshold: 5`, `status: "IN_STOCK"`

---

## Phase 2: Seller Inventory Endpoints

### 2.1 Login as Seller

**Endpoint:** `POST /users/login`

**Request:**
```json
{
  "username": "your_seller_username",
  "password": "your_seller_password"
}
```

**Response:** Copy the `access_token`

**Headers for all seller endpoints:**
```
Authorization: Bearer <access_token>
```

---

### 2.2 Get Seller Inventory

**Endpoint:** `GET /seller/inventory`

**Query Parameters:**
- `page` (optional, default: 1)
- `page_size` (optional, default: 20)

**Expected Response:**
```json
{
  "items": [
    {
      "id": 1,
      "name": "Product Name",
      "image_url": "...",
      "price": 99.99,
      "stock": 10,
      "low_stock_threshold": 5,
      "status": "IN_STOCK",
      "category": "...",
      "gender": "men",
      "variants": [...],
      "total_stock": 15
    }
  ],
  "total": 1,
  "page": 1,
  "page_size": 20
}
```

**Test Cases:**
- ✅ Should return all products for the seller
- ✅ Should include stock information
- ✅ Should calculate total_stock (product stock + variant stocks)
- ✅ Should show status (IN_STOCK, LOW_STOCK, OUT_OF_STOCK)

---

### 2.3 Update Product Stock

**Endpoint:** `POST /seller/inventory/update/{product_id}`

**Request Body:**
```json
{
  "stock": 25,
  "low_stock_threshold": 10
}
```

**Expected Response:**
- Product stock updated
- Status automatically updated based on new stock
- If stock <= 0 → status = "OUT_OF_STOCK"
- If stock <= threshold → status = "LOW_STOCK"
- Otherwise → status = "IN_STOCK"

**Test Cases:**
1. **Update to high stock (25):**
   - Set stock: 25, threshold: 10
   - Expected: status = "IN_STOCK"

2. **Update to low stock (3):**
   - Set stock: 3, threshold: 10
   - Expected: status = "LOW_STOCK"

3. **Update to zero stock (0):**
   - Set stock: 0
   - Expected: status = "OUT_OF_STOCK"

4. **Verify status updates automatically:**
   - Check product status changes based on stock

---

### 2.4 Update Variant Stock

**Endpoint:** `POST /seller/inventory/update-size`

**Request Body:**
```json
{
  "variant_id": 1,
  "stock": 15
}
```

**Test Cases:**
- ✅ Should update variant stock
- ✅ Should update parent product status automatically
- ✅ Should return updated variant with normalized image URL

---

### 2.5 Get Low Stock Products

**Endpoint:** `GET /seller/inventory/low-stock`

**Expected Response:**
- Only products where total_stock <= low_stock_threshold
- Excludes products with zero stock (those are out-of-stock)

**Test Cases:**
1. **Create test scenario:**
   - Product A: stock=10, threshold=5 → Should NOT appear
   - Product B: stock=3, threshold=5 → Should appear
   - Product C: stock=0 → Should NOT appear (out of stock, not low stock)

2. **Verify pagination works**

---

## Phase 3: Customer Stock Endpoints

### 3.1 Login as Customer

**Endpoint:** `POST /users/login`

**Request:**
```json
{
  "username": "customer_username",
  "password": "customer_password"
}
```

---

### 3.2 Get Product Stock Info

**Endpoint:** `GET /products/{product_id}/stock`

**No authentication required** (public endpoint)

**Expected Response:**
```json
{
  "product_id": 1,
  "stock": 10,
  "status": "IN_STOCK",
  "low_stock_threshold": 5,
  "variants": [
    {
      "variant_id": 1,
      "size": "M",
      "color": "Red",
      "stock": 5,
      "status": "IN_STOCK"
    }
  ]
}
```

**Test Cases:**
- ✅ Should return stock for product without variants
- ✅ Should return stock for each variant
- ✅ Should show status for each variant
- ✅ Should work without authentication

---

## Phase 4: Admin Inventory Endpoints

### 4.1 Login as Admin

**Endpoint:** `POST /users/login`

**Request:**
```json
{
  "username": "admin_username",
  "password": "admin_password"
}
```

---

### 4.2 Get Out-of-Stock Products

**Endpoint:** `GET /admin/inventory/out-of-stock`

**Query Parameters:**
- `page` (optional)
- `page_size` (optional)
- `seller_id` (optional filter)
- `category` (optional filter)
- `gender` (optional filter)

**Expected Response:**
- Only products with total_stock <= 0
- Includes seller information

**Test Cases:**
1. **Create test products:**
   - Product A: stock=0, no variants → Should appear
   - Product B: stock=5, variants with total=0 → Should appear
   - Product C: stock=10 → Should NOT appear

2. **Test filters:**
   - Filter by seller_id
   - Filter by category
   - Filter by gender

---

### 4.3 Get Low Stock Products

**Endpoint:** `GET /admin/inventory/low-stock`

**Expected Response:**
- Products where 0 < total_stock <= threshold
- Excludes out-of-stock items

**Test Cases:**
- Product with stock=3, threshold=5 → Should appear
- Product with stock=0 → Should NOT appear
- Product with stock=10, threshold=5 → Should NOT appear

---

### 4.4 Get Full Inventory

**Endpoint:** `GET /admin/inventory`

**Query Parameters:**
- `page`, `page_size`
- `seller_id`, `category`, `gender` (filters)
- `status_filter` (IN_STOCK, LOW_STOCK, OUT_OF_STOCK)

**Test Cases:**
1. **Test status filter:**
   - `status_filter=OUT_OF_STOCK` → Only out of stock
   - `status_filter=LOW_STOCK` → Only low stock
   - `status_filter=IN_STOCK` → Only in stock

2. **Test combination of filters:**
   - seller_id + category + status_filter

---

### 4.5 Admin Stock Override

**Endpoint:** `PATCH /admin/inventory/update/{product_id}`

**Request Body:**
```json
{
  "stock": 50,
  "low_stock_threshold": 10
}
```

**Test Cases:**
- ✅ Admin can update any product's stock (not just their own)
- ✅ Status updates automatically
- ✅ Works for products from any seller

---

## Phase 5: Stock Management in Orders/Returns

### 5.1 Test Order Creation - Stock Decrease

**Prerequisites:**
- Product with stock=10 (or variant with stock=10)
- Customer logged in
- Product in cart

**Steps:**
1. **Check initial stock:**
   - GET `/products/{product_id}/stock`
   - Note the current stock value

2. **Create order:**
   - POST `/orders/create`
   - Quantity: 3

3. **Verify stock decreased:**
   - GET `/products/{product_id}/stock`
   - Stock should be: original_stock - 3
   - If stock <= threshold → status should be "LOW_STOCK"
   - If stock <= 0 → status should be "OUT_OF_STOCK"

**Test Cases:**
1. **Normal order:**
   - Stock: 10, Order: 3 → Result: stock=7, status="IN_STOCK"

2. **Order causes low stock:**
   - Stock: 10, Threshold: 5, Order: 6 → Result: stock=4, status="LOW_STOCK"

3. **Order causes out of stock:**
   - Stock: 5, Order: 5 → Result: stock=0, status="OUT_OF_STOCK"

4. **Insufficient stock error:**
   - Stock: 2, Order: 5 → Should return 400 error: "Insufficient stock"

5. **Variant stock:**
   - Test with products that have variants
   - Verify variant stock decreases, not product stock

---

### 5.2 Test Return Processing - Stock Increase

**Prerequisites:**
- Order item that was delivered
- Product with current stock (e.g., stock=5)

**Steps:**
1. **Request return:**
   - POST `/returns/request/{order_item_id}`
   - Body: `{"reason": "Defective", "notes": "..."}`

2. **Seller accepts return:**
   - PATCH `/seller/returns/{order_item_id}/accept`

3. **Seller marks as received:**
   - PATCH `/seller/returns/{order_item_id}/mark-received`

4. **Verify stock increased:**
   - GET `/products/{product_id}/stock`
   - Stock should increase by the returned quantity
   - Status should update if stock crosses thresholds

**Test Cases:**
1. **Return increases stock:**
   - Initial: stock=5, Return quantity: 2 → Result: stock=7

2. **Return changes status:**
   - Initial: stock=0 (OUT_OF_STOCK), Return: 3 → Result: stock=3, status="LOW_STOCK" (if threshold=5)

3. **Variant return:**
   - Verify variant stock increases correctly

---

### 5.3 Test Order Cancellation - Stock Restoration

**Prerequisites:**
- Order item with status "Pending" or "Accepted"
- Product with stock (e.g., stock=5)

**Steps:**
1. **Check initial stock:**
   - GET `/products/{product_id}/stock`

2. **Cancel order item (Admin):**
   - PATCH `/admin/order-items/{order_item_id}/override-status`
   - Body: `{"status": "Cancelled"}`

3. **Verify stock restored:**
   - GET `/products/{product_id}/stock`
   - Stock should increase by cancelled quantity

**Test Cases:**
- Order quantity: 3, Initial stock: 5
- After cancellation: stock should be 8
- Status should update accordingly

---

## Testing Checklist

### Seller Endpoints
- [ ] GET `/seller/inventory` - Returns inventory list
- [ ] POST `/seller/inventory/update/{product_id}` - Updates product stock
- [ ] POST `/seller/inventory/update-size` - Updates variant stock
- [ ] GET `/seller/inventory/low-stock` - Returns low stock products
- [ ] Stock updates trigger status changes automatically

### Customer Endpoints
- [ ] GET `/products/{product_id}/stock` - Returns stock info
- [ ] Works without authentication
- [ ] Shows variant stock information

### Admin Endpoints
- [ ] GET `/admin/inventory/out-of-stock` - Returns out of stock products
- [ ] GET `/admin/inventory/low-stock` - Returns low stock products
- [ ] GET `/admin/inventory` - Returns full inventory with filters
- [ ] PATCH `/admin/inventory/update/{product_id}` - Admin stock override
- [ ] Filters work correctly (seller_id, category, gender, status)

### Stock Management
- [ ] Order creation decreases stock
- [ ] Order creation validates stock availability
- [ ] Insufficient stock prevents order creation
- [ ] Return processing increases stock
- [ ] Order cancellation restores stock
- [ ] Status updates automatically based on stock

---

## Common Issues & Solutions

### Issue: Migration didn't run
**Solution:** Restart the FastAPI server. Migration runs on startup.

### Issue: Status not updating
**Solution:** Check `update_product_status()` function is called after stock changes.

### Issue: Variant stock not decreasing
**Solution:** Verify `variant_id` is correctly passed in cart items and order items.

### Issue: 403 Forbidden errors
**Solution:** Check authentication token is valid and user has correct role (seller/admin).

### Issue: Stock calculation wrong
**Solution:** Verify `total_stock = product.stock + sum(variant.stock)` calculation.

---

## Using Swagger UI for Testing

1. **Open:** `http://127.0.0.1:8000/docs`

2. **Authenticate:**
   - Click "Authorize" button (top right)
   - Enter: `Bearer <your_token>`
   - Click "Authorize"

3. **Test endpoints:**
   - Click on endpoint
   - Click "Try it out"
   - Fill in parameters
   - Click "Execute"
   - Review response

---

## Using cURL for Testing

### Example: Get Seller Inventory
```bash
curl -X GET "http://127.0.0.1:8000/seller/inventory?page=1&page_size=20" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Example: Update Product Stock
```bash
curl -X POST "http://127.0.0.1:8000/seller/inventory/update/1" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{"stock": 25, "low_stock_threshold": 10}'
```

### Example: Get Product Stock (Customer)
```bash
curl -X GET "http://127.0.0.1:8000/products/1/stock"
```

---

## Next Steps After Testing

Once backend testing is complete:
1. Document any issues found
2. Verify all endpoints return expected data
3. Confirm stock calculations are correct
4. Verify status updates work automatically
5. Test edge cases (zero stock, negative stock prevention, etc.)

Then proceed to frontend implementation!

