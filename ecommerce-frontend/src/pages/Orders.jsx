// src/pages/Orders.jsx
import React, { useEffect, useState } from "react";
import API from "../api/axios";

export default function Orders() {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    const res = await API.get("/orders");
    setOrders(res.data || []);
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h2 className="text-2xl mb-4">Your Orders</h2>
      {orders.length === 0 ? (
        <p>No orders yet.</p>
      ) : (
        <div className="space-y-4">
          {orders.map((o) => (
            <div key={o.id} className="border p-4 rounded">
              <div className="flex justify-between">
                <div>Order #{o.id}</div>
                <div className="font-semibold">{o.status}</div>
              </div>
              <div className="text-sm text-gray-600">Total: ₹{o.total_price}</div>
              <div className="mt-2">
                <ul className="list-disc ml-5">
                  {o.order_items?.map((it) => (
                    <li key={it.id}>Product ID: {it.product_id} — Qty: {it.quantity} — ₹{it.price}</li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
