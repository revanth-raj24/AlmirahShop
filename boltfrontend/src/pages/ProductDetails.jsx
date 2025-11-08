import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import API from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { Heart } from 'lucide-react';
import { resolveImageUrl } from '../utils/imageUtils';

export default function ProductDetails() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const { data } = await API.get(`/products/${productId}`);
        setProduct(data);
        setError(null);
      } catch (err) {
        setError('Product not found');
        setProduct(null);
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [productId]);

  useEffect(() => {
    if (user && productId) {
      checkWishlistStatus();
    }
  }, [user, productId]);

  const checkWishlistStatus = async () => {
    if (!user) return;
    try {
      const { data } = await API.get(`/wishlist/check/${productId}`);
      setIsInWishlist(data?.in_wishlist || false);
    } catch {
      setIsInWishlist(false);
    }
  };

  const handleToggleWishlist = async () => {
    if (!user) {
      const returnUrl = `/product/${productId}`;
      navigate(`/login?message=Please%20login%20to%20add%20items%20to%20wishlist&returnUrl=${encodeURIComponent(returnUrl)}`);
      return;
    }

    setWishlistLoading(true);
    try {
      if (isInWishlist) {
        await API.delete(`/wishlist/remove/${productId}`);
        setIsInWishlist(false);
      } else {
        await API.post(`/wishlist/add/${productId}`);
        setIsInWishlist(true);
      }
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Failed to update wishlist';
      alert(msg);
    } finally {
      setWishlistLoading(false);
    }
  };

  const handleAddToCart = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      const returnUrl = `/product/${product.id}`;
      navigate(`/login?message=Please%20login%20to%20add%20items%20to%20cart&returnUrl=${encodeURIComponent(returnUrl)}`);
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

  const handleOrderNow = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      const returnUrl = `/product/${product.id}`;
      navigate(`/login?message=Please%20login%20to%20place%20an%20order&returnUrl=${encodeURIComponent(returnUrl)}`);
      return;
    }

    try {
      await API.post('/cart/add', { product_id: product.id, quantity: 1 });
      navigate('/cart');
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Failed to add to cart';
      alert(msg);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }
  if (error) {
    return <div className="min-h-screen flex items-center justify-center text-red-500">{error}</div>;
  }
  if (!product) return null;

  return (
    <div className="max-w-4xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        <div className="bg-neutral-100 aspect-[3/4] flex items-center justify-center">
          <img src={resolveImageUrl(product.image_url)} alt={product.name} className="w-full h-full object-cover rounded-lg" />
        </div>
        <div>
          <h1 className="font-serif text-3xl text-neutral-900 mb-2">{product.name}</h1>
          <div className="flex items-center gap-4 mb-4">
            {product.discounted_price && product.discounted_price < product.price ? (
              <>
                <span className="text-2xl font-medium text-red-600">${product.discounted_price.toFixed(2)}</span>
                <span className="text-lg line-through text-neutral-600">${product.price.toFixed(2)}</span>
              </>
            ) : (
              <span className="text-2xl font-medium text-neutral-900">${product.price.toFixed(2)}</span>
            )}
          </div>
          <p className="mb-6 text-neutral-700">{product.description}</p>

          <div className="flex items-center gap-4 mt-8">
            <button
              onClick={handleToggleWishlist}
              disabled={wishlistLoading}
              className={`px-5 py-2.5 border transition-colors flex items-center gap-2 ${
                isInWishlist
                  ? 'border-red-600 text-red-600 bg-red-50 hover:bg-red-100'
                  : 'border-neutral-300 text-neutral-700 hover:border-neutral-900'
              } disabled:opacity-50`}
              title={isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
            >
              <Heart className={`w-5 h-5 ${isInWishlist ? 'fill-red-600' : ''}`} />
              {isInWishlist ? 'In Wishlist' : 'Add to Wishlist'}
            </button>
            <button onClick={handleAddToCart} className="px-5 py-2.5 bg-neutral-900 text-neutral-50 hover:bg-neutral-800 transition-colors">
              Add to Cart
            </button>
            <button onClick={handleOrderNow} className="px-5 py-2.5 bg-neutral-900 text-neutral-50 hover:bg-neutral-800 transition-colors">
              Order Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
