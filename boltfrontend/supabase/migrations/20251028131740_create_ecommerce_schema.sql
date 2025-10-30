/*
  # eCommerce Schema Setup

  ## Overview
  Creates a comprehensive database schema for a luxury clothing eCommerce platform with full user management, product catalog, shopping cart, orders, and wishlist functionality.

  ## 1. New Tables

  ### `users`
  Extended user profile information
  - `id` (uuid, primary key) - References auth.users
  - `full_name` (text) - User's full name
  - `email` (text, unique) - User's email address
  - `date_of_birth` (date) - User's date of birth
  - `phone_number` (text) - Contact phone number
  - `gender` (text) - User's gender
  - `username` (text, unique) - Unique username for login
  - `created_at` (timestamptz) - Account creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### `products`
  Clothing product catalog
  - `id` (uuid, primary key) - Product identifier
  - `name` (text) - Product name
  - `description` (text) - Short product description
  - `long_description` (text) - Detailed product information
  - `price` (decimal) - Regular price
  - `discounted_price` (decimal, nullable) - Sale price if applicable
  - `category` (text) - Product category (men/women)
  - `subcategory` (text) - Specific clothing type
  - `image_url` (text) - Product image URL
  - `video_url` (text, nullable) - Optional product demo video
  - `stock_quantity` (integer) - Available inventory
  - `is_featured` (boolean) - Featured on homepage
  - `is_new_arrival` (boolean) - New arrival status
  - `created_at` (timestamptz) - Product creation date

  ### `cart_items`
  Shopping cart contents
  - `id` (uuid, primary key) - Cart item identifier
  - `user_id` (uuid, foreign key) - References users table
  - `product_id` (uuid, foreign key) - References products table
  - `quantity` (integer) - Number of items
  - `created_at` (timestamptz) - Added to cart timestamp
  - `updated_at` (timestamptz) - Last modification timestamp

  ### `orders`
  Order records
  - `id` (uuid, primary key) - Order identifier
  - `user_id` (uuid, foreign key) - References users table
  - `status` (text) - Order status (pending/processing/shipped/delivered/cancelled)
  - `subtotal` (decimal) - Order subtotal before discounts
  - `discount_amount` (decimal) - Total discount applied
  - `tax_amount` (decimal) - Tax charges
  - `total_amount` (decimal) - Final order total
  - `coupon_code` (text, nullable) - Applied coupon code
  - `tracking_number` (text, nullable) - Shipment tracking number
  - `created_at` (timestamptz) - Order creation date
  - `updated_at` (timestamptz) - Last status update

  ### `order_items`
  Individual items in orders
  - `id` (uuid, primary key) - Order item identifier
  - `order_id` (uuid, foreign key) - References orders table
  - `product_id` (uuid, foreign key) - References products table
  - `quantity` (integer) - Number of items ordered
  - `price_at_purchase` (decimal) - Price when ordered
  - `created_at` (timestamptz) - Item creation timestamp

  ### `wishlist_items`
  User wishlist/favorites
  - `id` (uuid, primary key) - Wishlist item identifier
  - `user_id` (uuid, foreign key) - References users table
  - `product_id` (uuid, foreign key) - References products table
  - `created_at` (timestamptz) - Added to wishlist timestamp

  ### `coupons`
  Discount coupon codes
  - `id` (uuid, primary key) - Coupon identifier
  - `code` (text, unique) - Coupon code
  - `discount_type` (text) - Type (percentage/fixed)
  - `discount_value` (decimal) - Discount amount or percentage
  - `is_active` (boolean) - Active status
  - `expires_at` (timestamptz, nullable) - Expiration date
  - `created_at` (timestamptz) - Creation date

  ## 2. Security

  ### Row Level Security (RLS)
  All tables have RLS enabled with restrictive policies:

  **users table:**
  - Users can view and update only their own profile
  - Users can insert their own profile during registration

  **products table:**
  - All authenticated users can view products
  - Only service role can modify products

  **cart_items table:**
  - Users can view, insert, update, and delete only their own cart items

  **orders table:**
  - Users can view only their own orders
  - Users can insert their own orders
  - Only service role can update order status

  **order_items table:**
  - Users can view items from their own orders only

  **wishlist_items table:**
  - Users can view, insert, and delete only their own wishlist items

  **coupons table:**
  - All authenticated users can view active coupons
  - Only service role can modify coupons

  ## 3. Indexes
  - Products: category, is_featured, is_new_arrival
  - Cart items: user_id, product_id
  - Orders: user_id, status
  - Order items: order_id
  - Wishlist: user_id, product_id

  ## 4. Important Notes
  - All monetary values use DECIMAL(10,2) for precision
  - Timestamps use timestamptz for timezone awareness
  - Foreign key constraints ensure referential integrity
  - Default values prevent null-related issues
  - Unique constraints on usernames and emails
*/

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text UNIQUE NOT NULL,
  date_of_birth date,
  phone_number text,
  gender text,
  username text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Create products table
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL,
  long_description text,
  price decimal(10,2) NOT NULL,
  discounted_price decimal(10,2),
  category text NOT NULL,
  subcategory text,
  image_url text NOT NULL,
  video_url text,
  stock_quantity integer DEFAULT 0,
  is_featured boolean DEFAULT false,
  is_new_arrival boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view products"
  ON products FOR SELECT
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_featured ON products(is_featured);
CREATE INDEX IF NOT EXISTS idx_products_new_arrival ON products(is_new_arrival);

-- Create cart_items table
CREATE TABLE IF NOT EXISTS cart_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, product_id)
);

ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own cart"
  ON cart_items FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert into own cart"
  ON cart_items FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cart"
  ON cart_items FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete from own cart"
  ON cart_items FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_cart_items_user ON cart_items(user_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_product ON cart_items(product_id);

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  subtotal decimal(10,2) NOT NULL DEFAULT 0,
  discount_amount decimal(10,2) DEFAULT 0,
  tax_amount decimal(10,2) DEFAULT 0,
  total_amount decimal(10,2) NOT NULL DEFAULT 0,
  coupon_code text,
  tracking_number text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own orders"
  ON orders FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own orders"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

-- Create order_items table
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 1,
  price_at_purchase decimal(10,2) NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own order items"
  ON order_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

-- Create wishlist_items table
CREATE TABLE IF NOT EXISTS wishlist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, product_id)
);

ALTER TABLE wishlist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own wishlist"
  ON wishlist_items FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can add to own wishlist"
  ON wishlist_items FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove from own wishlist"
  ON wishlist_items FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_wishlist_user ON wishlist_items(user_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_product ON wishlist_items(product_id);

-- Create coupons table
CREATE TABLE IF NOT EXISTS coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  discount_type text NOT NULL,
  discount_value decimal(10,2) NOT NULL,
  is_active boolean DEFAULT true,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active coupons"
  ON coupons FOR SELECT
  TO authenticated
  USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));