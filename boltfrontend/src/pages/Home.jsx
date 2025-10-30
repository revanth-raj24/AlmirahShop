import { useState, useEffect } from 'react';
import API from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import ProductCard from '../components/ProductCard';
import VideoProductCard from '../components/VideoProductCard';
import { useSearchParams, useNavigate } from 'react-router-dom';

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const category = searchParams.get('category');
  const searchQuery = searchParams.get('search');

  useEffect(() => {
    fetchProducts();
  }, [category, searchQuery]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      if (searchQuery) {
        const { data } = await API.get('/products/search', { params: { name: searchQuery } });
        setProducts(data || []);
      } else {
        const { data } = await API.get('/products');
        setProducts(data || []);
      }
    } catch (_) {
      setProducts([]);
    }
    setLoading(false);
  };

  const handleAddToCart = async (product) => {
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      await API.post('/cart/add', { product_id: product.id, quantity: 1 });
      alert('Added to cart!');
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Failed to add to cart';
      alert(msg);
    }
  };

  const featuredProducts = products.slice(0, 8);
  const newArrivals = products.slice(0, 4);
  const videoProduct = null; // not available from backend

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-neutral-600 text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <section className="relative h-[70vh] flex items-center justify-center bg-gradient-to-b from-neutral-100/30 to-neutral-50">
        <div className="text-center px-4">
          <h1 className="font-serif text-5xl md:text-7xl text-neutral-900 mb-6">
            Timeless Elegance
          </h1>
          <p className="text-neutral-600 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
            Discover a curated collection of luxury clothing that transcends trends and celebrates
            enduring style.
          </p>
        </div>
      </section>

      {searchQuery && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h2 className="font-serif text-3xl text-neutral-900">
            Search results for "{searchQuery}"
          </h2>
        </div>
      )}

      {!searchQuery && newArrivals.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <h2 className="font-serif text-4xl text-neutral-900 mb-12 text-center">New Arrivals</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {newArrivals.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={handleAddToCart}
              />
            ))}
          </div>
        </section>
      )}

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="font-serif text-4xl text-neutral-900 mb-12 text-center">
          {category ? `${category.charAt(0).toUpperCase() + category.slice(1)}'s Collection` : 'Featured Collection'}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {(category ? products : featuredProducts).map((product, index) => {
            if (!searchQuery && index === 2 && videoProduct && !category) {
              return (
                <div key="video-tile">
                  <VideoProductCard product={videoProduct} />
                </div>
              );
            }
            return (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={handleAddToCart}
              />
            );
          })}
        </div>
      </section>
    </div>
  );
}
