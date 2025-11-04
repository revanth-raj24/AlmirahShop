// src/components/ProductCard.jsx
import React from "react";

export default function ProductCard({ product, onAdd }) {
  return (
    <div className="border p-4 rounded-lg shadow-sm">
      <h3 className="text-lg font-semibold">{product.name}</h3>
      {product.description && <p className="text-sm text-gray-600 mt-1">{product.description}</p>}
      <div className="flex items-center justify-between mt-3">
        <div className="text-blue-600 font-bold">₹{product.price}</div>
        <button
          onClick={() => onAdd && onAdd(product.id)}
          className="bg-green-600 text-white px-3 py-1 rounded"
        >
          Add to Cart
        </button>
      </div>
    </div>
  );
}
