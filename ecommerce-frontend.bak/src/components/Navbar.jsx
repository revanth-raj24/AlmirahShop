// src/components/Navbar.jsx
import React, { useContext } from "react";
import { Link } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

export default function Navbar() {
  const { user, logout } = useContext(AuthContext);

  return (
    <nav className="bg-white shadow p-4 mb-6">
      <div className="max-w-6xl mx-auto flex justify-between items-center">
        <Link to="/" className="text-xl font-bold">ALMIRAH Shop</Link>
        <div className="flex items-center gap-4">
          <Link to="/" className="hover:underline">Products</Link>
          <Link to="/cart" className="hover:underline">Cart</Link>
          <Link to="/orders" className="hover:underline">Orders</Link>
          {user ? (
            <>
              <span className="text-sm">Hi, {user.username}</span>
              <button onClick={logout} className="bg-red-500 text-white px-3 py-1 rounded">Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" className="bg-blue-600 text-white px-3 py-1 rounded">Login</Link>
              <Link to="/signup" className="border px-3 py-1 rounded">Signup</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
