# The Almirah Shop

underconstruction eCommerce web application with a minimalistic "old-money" aesthetic, built with modern web technologies.

## Tech Stack

- **Frontend**: Vite + React
- **Styling**: TailwindCSS v4
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Routing**: React Router
- **Icons**: Lucide React

## Features

### Pages
1. **Home Page**
   - Featured products grid
   - New arrivals section
   - Video product demo tiles (Instagram Reels style)
   - Category filtering (Men/Women)
   - Search functionality

2. **Registration/Signup**
   - Full name, email, username
   - Date of birth, phone number, gender
   - Password confirmation
   - Form validation

3. **Login**
   - Login with email or username
   - Password authentication
   - Forgot password link

4. **Shopping Cart**
   - Add/remove items
   - Adjust quantities
   - Apply coupon codes
   - View subtotal, tax, and total
   - Checkout functionality

5. **Orders**
   - Order history
   - Order status tracking
   - Tracking numbers
   - Product details per order

6. **Wishlist**
   - Save favorite products
   - Add to cart from wishlist
   - Remove items

### UI Components
- **Navbar**: Sticky navigation with search, cart, wishlist, and profile
- **Footer**: Social media links and site information
- **ProductCard**: Reusable product display with hover effects
- **VideoProductCard**: Auto-playing video product demos
- **Button**: Primary and secondary button variants
- **Input**: Styled form inputs with validation

## Design System

### Colors
- Cream (#F5F5F0) - Background
- Charcoal (#2C2C2C) - Primary text
- Stone (#8B7E74) - Secondary text
- Sand (#E8E4D9) - Accents
- Taupe (#C9B8A8) - Details

### Typography
- **Serif**: Crimson Text - Headings and brand
- **Sans**: Inter - Body text and UI

### Style Guidelines
- Minimalistic old-money aesthetic
- Neutral color palette
- Elegant spacing and typography
- Smooth transitions and hover effects
- Large, high-quality imagery
- Responsive design (mobile + desktop)

## Database Schema

### Tables
- `users` - Extended user profiles
- `products` - Product catalog
- `cart_items` - Shopping cart contents
- `orders` - Order records
- `order_items` - Individual order items
- `wishlist_items` - Saved products
- `coupons` - Discount codes

All tables include Row Level Security (RLS) policies for data protection.

## Project Structure

```
src/
├── components/
│   ├── Button.jsx
│   ├── Input.jsx
│   ├── Navbar.jsx
│   ├── Footer.jsx
│   ├── ProductCard.jsx
│   └── VideoProductCard.jsx
├── pages/
│   ├── Home.jsx
│   ├── Login.jsx
│   ├── Register.jsx
│   ├── Cart.jsx
│   ├── Orders.jsx
│   └── Wishlist.jsx
├── contexts/
│   └── AuthContext.jsx
├── lib/
│   └── supabase.js
├── App.jsx
├── main.jsx
└── index.css
```

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables in `.env`:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

3. Run the development server:
```bash
npm run dev
```

4. Build for production:
```bash
npm run build
```

## Features Implemented

- ✅ User authentication (signup/login)
- ✅ Product browsing and search
- ✅ Shopping cart management
- ✅ Wishlist functionality
- ✅ Order placement and history
- ✅ Coupon code system
- ✅ Responsive design
- ✅ Video product demos
- ✅ Category filtering
- ✅ Real-time cart/wishlist counts

## Sample Coupon Codes

- `WELCOME20` - 20% off
- `LUXURY50` - $50 off
- `FIRSTORDER` - 15% off

## Notes

- Mock product data is stored in Supabase
- Images are sourced from Pexels
- All monetary values use proper decimal precision
- RLS policies ensure data security
- Responsive breakpoints for mobile, tablet, and desktop
