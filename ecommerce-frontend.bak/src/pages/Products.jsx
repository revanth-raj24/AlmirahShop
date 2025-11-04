// src/pages/Products.jsx
import React, { useEffect, useState, useContext } from "react";
import API from "../api/axios";
import ProductCard from "../components/ProductCard";
import { AuthContext } from "../context/AuthContext";

export default function Products() {
  const [products, setProducts] = useState([]);
  const [q, setQ] = useState("");
  const { user } = useContext(AuthContext);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    const res = await API.get("/products");
    setProducts(res.data || []);
  };

  const search = async () => {
    if (!q) return fetchProducts();
    const res = await API.get(`/products/search?name=${encodeURIComponent(q)}`);
    setProducts(res.data || []);
  };

  const addToCart = async (productId) => {
    if (!user) return alert("Login to add to cart");
    try {
      await API.post("/cart/add", { product_id: productId, quantity: 1 });
      alert("Added to cart");
    } catch (err) {
      console.error(err);
      alert("Could not add to cart");
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder="Search products..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="border px-3 py-2 rounded flex-1"
        />
        <button onClick={search} className="bg-blue-600 text-white px-4 py-2 rounded">Search</button>
        <button onClick={fetchProducts} className="border px-3 py-2 rounded">Reset</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} onAdd={addToCart} />
        ))}
      </div>
    </div>
  );
}
