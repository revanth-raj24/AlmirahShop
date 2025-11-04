// src/pages/Login.jsx
import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    try {
      await login(username, password);
      navigate("/");
    } catch (err) {
      console.error(err);
      alert("Login failed");
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 mt-8 border rounded">
      <h2 className="text-2xl mb-4">Login</h2>
      <form onSubmit={submit} className="space-y-3">
        <input className="w-full border px-3 py-2 rounded" placeholder="Username" value={username} onChange={(e)=>setUsername(e.target.value)} />
        <input type="password" className="w-full border px-3 py-2 rounded" placeholder="Password" value={password} onChange={(e)=>setPassword(e.target.value)} />
        <button className="w-full bg-blue-600 text-white py-2 rounded">Login</button>
      </form>
    </div>
  );
}
