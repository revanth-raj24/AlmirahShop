import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import API from '../../lib/api';
import ProductCard from '../ProductCard';

/**
 * TrendingSection Component
 * Displays trending products in a 4-column grid
 * Fetches products with discounts or high ratings
 */
export default function TrendingSection() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [trendingProducts, setTrendingProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [wishlistStatus, setWishlistStatus] = useState(new Set());

  useEffect(() => {
    fetchTrendingProducts();
  }, []);

  useEffect(() => {
    if (user && trendingProducts.length > 0) {
      fetchWishlistStatus();
    } else {
      setWishlistStatus(new Set());
    }
  }, [user, trendingProducts]);

  const fetchTrendingProducts = async () => {
    setLoading(true);
    try {
      // Fetch products with discounts (trending deals)
      // For now, we'll fetch recent products with discounts
      // Later this can be enhanced with a dedicated trending endpoint
      const response = await API.get('/products/paginated', {
        params: { page: 1, page_size: 8 }
      });
      const data = response?.data || {};
      let products = data?.items || [];

      // Filter products with discounts or prioritize them
      const productsWithDiscounts = products.filter(
        p => p.discounted_price && p.discounted_price < p.price
      );
      const otherProducts = products.filter(
        p => !p.discounted_price || p.discounted_price >= p.price
      );
      
      // Combine: discounted first, then others
      setTrendingProducts([...productsWithDiscounts, ...otherProducts].slice(0, 8));
    } catch (err) {
      console.error('Failed to fetch trending products:', err);
      setTrendingProducts([]);
    }
    setLoading(false);
  };

  const fetchWishlistStatus = async () => {
    if (!user) return;
    try {
      const statusPromises = trendingProducts.map(async (product) => {
        try {
          const { data } = await API.get(`/wishlist/check/${product.id}`);
          return { productId: product.id, inWishlist: data?.in_wishlist || false };
        } catch {
          return { productId: product.id, inWishlist: false };
        }
      });
      const results = await Promise.all(statusPromises);
      const wishlistSet = new Set(results.filter(r => r.inWishlist).map(r => r.productId));
      setWishlistStatus(wishlistSet);
    } catch (err) {
      console.error('Failed to fetch wishlist status:', err);
    }
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

  const handleToggleWishlist = async (productId) => {
    if (!user) {
      navigate('/login');
      return;
    }

    const isInWishlist = wishlistStatus.has(productId);
    try {
      if (isInWishlist) {
        await API.delete(`/wishlist/remove/${productId}`);
        setWishlistStatus((prev) => {
          const next = new Set(prev);
          next.delete(productId);
          return next;
        });
      } else {
        await API.post(`/wishlist/add/${productId}`);
        setWishlistStatus((prev) => new Set(prev).add(productId));
      }
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Failed to update wishlist';
      alert(msg);
    }
  };

  if (loading) {
    return (
      <section id="trending-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center py-12">
          <div className="text-neutral-600 text-lg">Loading trending products...</div>
        </div>
      </section>
    );
  }

  if (trendingProducts.length === 0) {
    return null;
  }

  return (
    <section 
      id="trending-section"
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16"
      aria-label="Trending products"
    >
      <div className="text-center mb-12">
        <h2 className="font-serif text-4xl md:text-5xl text-neutral-900 mb-4">
          Trending Deals
        </h2>
        <p className="text-neutral-600 text-lg max-w-2xl mx-auto">
          Discover our most popular products and exclusive offers
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
        {trendingProducts.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onAddToCart={handleAddToCart}
            onToggleWishlist={handleToggleWishlist}
            isInWishlist={wishlistStatus.has(product.id)}
          />
        ))}
      </div>

      <div className="text-center mt-12">
        <button
          onClick={() => navigate('/')}
          className="btn-secondary"
          aria-label="View all products"
        >
          View All Products
        </button>
      </div>
    </section>
  );
}

