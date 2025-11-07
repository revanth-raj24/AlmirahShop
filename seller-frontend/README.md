# Seller Portal

This is the isolated seller frontend application for The Almirah Shop e-commerce platform.

## Overview

The seller portal runs on a **separate port (5175)** and is completely isolated from the main customer frontend application. Sellers must access the portal through the dedicated seller URL.

## Features

- **Isolated Seller Portal**: Runs on port 5175, separate from main app
- **Seller-Only Authentication**: Only seller users can access this portal
- **Dedicated Routes**: 
  - `/seller/login` - Seller login page
  - `/seller/register` - Seller registration page
  - `/seller/dashboard` - Seller dashboard
  - `/seller/verify-otp` - Seller OTP verification
- **Seller Dashboard**: Manage products, view orders, and track statistics
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

Run the seller portal on port 5175:

```bash
npm run dev
```

The seller portal will be available at `http://localhost:5175`

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

- **Seller Login**: `http://localhost:5175/seller/login`
- **Seller Register**: `http://localhost:5175/seller/register`
- **Seller Dashboard**: `http://localhost:5175/seller/dashboard` (requires authentication)

## Important Notes

- Sellers **cannot** access the seller portal through the main application
- The main application will **not** show seller links or routes
- Seller authentication is completely separate from customer/admin authentication
- All seller routes are protected and require seller role verification

## Backend Connection

The seller portal connects to the same backend API at `http://127.0.0.1:8000` (configured in `src/lib/api.jsx`).

