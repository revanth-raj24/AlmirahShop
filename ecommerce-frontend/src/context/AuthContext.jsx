// src/context/AuthContext.jsx
import React, { createContext, useState, useEffect } from "react";
import API from "../api/axios";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const username = localStorage.getItem("username");
    const token = localStorage.getItem("token");
    if (token && username) setUser({ username });
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    const formData = new FormData();
    formData.append("username", username);
    formData.append("password", password);
    const res = await API.post("/users/login", formData);
    localStorage.setItem("token", res.data.access_token);
    localStorage.setItem("username", username);
    setUser({ username });
  };

  const signup = async (username, email, password) => {
    await API.post("/users/signup", { username, email, password });
    // auto-login after signup
    await login(username, password);
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
