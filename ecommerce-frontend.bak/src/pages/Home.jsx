import { useEffect, useState } from "react";
import API from "../api/axios";
import ProductCard from "../components/ProductCard";

export default function Home() {
  const [products, setProducts] = useState([]);
  const [query, setQuery] = useState("");

  const fetchProducts = async () => {
    const res = await API.get("/products");
    setProducts(res.data);
  };

  const searchProducts = async () => {
    const res = await API.get(`/products/search?name=${query}`);
    setProducts(res.data);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  return (
    <div className="p-6">
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder="Search products..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="border px-4 py-2 rounded w-full"
        />
        <button onClick={searchProducts} className="bg-blue-600 text-white px-4 py-2 rounded">
          Search
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </div>
  );
}
