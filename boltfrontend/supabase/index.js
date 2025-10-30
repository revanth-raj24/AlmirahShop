// minimal shim to replace supabase usage with FastAPI calls
import API from "../lib/api";

export async function signIn({ emailOrUsername, password }) {
  // Bolt might expect {email, password} or {username,password}. adjust accordingly.
  const params = new URLSearchParams();
  params.append("username", emailOrUsername);
  params.append("password", password);
  const res = await API.post("/users/login", params);
  localStorage.setItem("token", res.data.access_token);
  // return object shape Bolt UI expects
  return { user: { username: /* if known */ "", token: res.data.access_token } };
}

export async function signUp({ username, email, password }) {
  await API.post("/users/signup", { username, email, password });
  // auto-login
  return signIn({ emailOrUsername: username, password });
}

// For other calls (e.g., fetch products) export equivalents
export async function fetchProducts() {
  const res = await API.get("/products");
  return { data: res.data };
}

// Add more shims as you need them: cartAdd, cartGet, createOrder, etc.
