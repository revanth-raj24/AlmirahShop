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
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 12;
  const [searchParams] = useSearchParams();
  const category = searchParams.get('category');
  const searchQuery = searchParams.get('search');

  const gender = category && ['men','women','unisex'].includes(category.toLowerCase())
    ? category.toLowerCase()
    : undefined;

  useEffect(() => {
    setPage(1); // reset to first page when filters change
  }, [category, searchQuery]);

  useEffect(() => {
    fetchProducts();
  }, [gender, searchQuery, page]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      if (searchQuery) {
        const { data } = await API.get('/products/search', { params: { name: searchQuery, gender } });
        setProducts(data || []);
        setTotal((data || []).length);
      } else {
        const { data } = await API.get('/products/paginated', { params: { page, page_size: pageSize, gender } });
        setProducts(data?.items || []);
        setTotal(data?.total || 0);
      }
    } catch (_) {
      setProducts([]);
      setTotal(0);
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

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const canPrev = page > 1;
  const canNext = page < totalPages;

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

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="font-serif text-4xl text-neutral-900 mb-12 text-center">
          {category ? `${category.charAt(0).toUpperCase() + category.slice(1)}'s Collection` : 'Featured Collection'}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {products.map((product, index) => {
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

        {!searchQuery && (
          <div className="flex items-center justify-center gap-4 mt-12">
            <button
              className="px-4 py-2 border border-neutral-300 text-neutral-700 disabled:opacity-50"
              onClick={() => canPrev && setPage((p) => p - 1)}
              disabled={!canPrev}
            >
              Previous
            </button>
            <span className="text-neutral-700">Page {page} of {totalPages}</span>
            <button
              className="px-4 py-2 border border-neutral-300 text-neutral-700 disabled:opacity-50"
              onClick={() => canNext && setPage((p) => p + 1)}
              disabled={!canNext}
            >
              Next
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
