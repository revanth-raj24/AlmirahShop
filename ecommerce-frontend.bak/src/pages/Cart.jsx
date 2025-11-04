// src/pages/Cart.jsx
import React, { useEffect, useState } from "react";
import API from "../api/axios";

export default function Cart() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    fetchCart();
  }, []);

  const fetchCart = async () => {
    const res = await API.get("/cart");
    setItems(res.data || []);
  };

  const remove = async (productId) => {
    await API.delete(`/cart/remove/${productId}`);
    fetchCart();
  };

  const checkout = async () => {
    try {
      const res = await API.post("/orders/create");
      alert("Order placed!");
      fetchCart();
    } catch (err) {
      console.error(err);
      alert("Checkout failed");
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4">
      <h2 className="text-2xl mb-4">Your Cart</h2>
      {items.length === 0 ? (
        <p>Your cart is empty.</p>
      ) : (
        <>
          <ul className="space-y-2">
            {items.map((it) => (
              <li key={it.id} className="flex justify-between border p-3 rounded">
                <div>
                  <div className="font-semibold">Product ID: {it.product_id}</div>
                  <div className="text-sm">Quantity: {it.quantity}</div>
                </div>
                <div className="flex flex-col gap-2">
                  <button onClick={() => remove(it.product_id)} className="text-sm text-red-600">Remove</button>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-4">
            <button onClick={checkout} className="bg-blue-600 text-white px-4 py-2 rounded">Checkout</button>
          </div>
        </>
      )}
    </div>
  );
}
