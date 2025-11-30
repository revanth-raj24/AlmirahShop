import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import API from '../../lib/api';
import ProductCard from '../ProductCard';

/**
 * RecommendedProducts Component
 * Displays personalized product recommendations
 * Initially static, can be enhanced with dynamic API later
 */
export default function RecommendedProducts() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [recommendedProducts, setRecommendedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [wishlistStatus, setWishlistStatus] = useState(new Set());

  useEffect(() => {
    fetchRecommendedProducts();
  }, []);

  useEffect(() => {
    if (user && recommendedProducts.length > 0) {
      fetchWishlistStatus();
    } else {
      setWishlistStatus(new Set());
    }
  }, [user, recommendedProducts]);

  const fetchRecommendedProducts = async () => {
    setLoading(true);
    try {
      // For now, fetch recent products as recommendations
      // Later this can be enhanced with:
      // - User purchase history
      // - Browsing behavior
      // - Similar products algorithm
      // - Popular products by category
      const response = await API.get('/products/paginated', {
        params: { page: 1, page_size: 8 }
      });
      const data = response?.data || {};
      const products = data?.items || [];
      
      // Shuffle for variety (in production, use proper recommendation algorithm)
      const shuffled = [...products].sort(() => Math.random() - 0.5);
      setRecommendedProducts(shuffled.slice(0, 8));
    } catch (err) {
      console.error('Failed to fetch recommended products:', err);
      setRecommendedProducts([]);
    }
    setLoading(false);
  };

  const fetchWishlistStatus = async () => {
    if (!user) return;
    try {
      const statusPromises = recommendedProducts.map(async (product) => {
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
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center py-12">
          <div className="text-neutral-600 text-lg">Loading recommendations...</div>
        </div>
      </section>
    );
  }

  if (recommendedProducts.length === 0) {
    return null;
  }

  return (
    <section 
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16"
      aria-label="Recommended products"
    >
      <div className="text-center mb-12">
        <h2 className="font-serif text-4xl md:text-5xl text-neutral-900 mb-4">
          Recommended For You
        </h2>
        <p className="text-neutral-600 text-lg max-w-2xl mx-auto">
          {user 
            ? 'Curated picks based on your preferences'
            : 'Discover products you might love'
          }
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
        {recommendedProducts.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onAddToCart={handleAddToCart}
            onToggleWishlist={handleToggleWishlist}
            isInWishlist={wishlistStatus.has(product.id)}
          />
        ))}
      </div>
    </section>
  );
}

