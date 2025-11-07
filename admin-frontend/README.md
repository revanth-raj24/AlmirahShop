# Admin Portal

This is the isolated admin frontend application for The Almirah Shop e-commerce platform.

## Overview

The admin portal runs on a **separate port (5174)** and is completely isolated from the main customer/seller frontend application. Admins must access the portal through the dedicated admin URL.

## Features

- **Isolated Admin Portal**: Runs on port 5174, separate from main app
- **Admin-Only Authentication**: Only admin users can access this portal
- **Dedicated Routes**: 
  - `/admin/login` - Admin login page
  - `/admin/dashboard` - Admin dashboard
  - `/admin/verify-otp` - Admin OTP verification
- **Admin Dashboard**: Manage sellers, products, orders, and users
- **Same Backend**: Connects to the same backend API and database as the main app

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

```bash
npm install
```

### Development

Run the admin portal on port 5174:

```bash
npm run dev
```

The admin portal will be available at `http://localhost:5174`

### Build

Build for production:

```bash
npm run build
```

### Preview

Preview the production build:

```bash
npm run preview
```

## Access

- **Admin Login**: `http://localhost:5174/admin/login`
- **Admin Dashboard**: `http://localhost:5174/admin/dashboard` (requires authentication)

## Important Notes

- Admins **cannot** access the admin portal through the main application
- The main application will **not** show admin links or routes
- Admin authentication is completely separate from customer/seller authentication
- All admin routes are protected and require admin role verification

## Backend Connection

The admin portal connects to the same backend API at `http://127.0.0.1:8000` (configured in `src/lib/api.jsx`).

