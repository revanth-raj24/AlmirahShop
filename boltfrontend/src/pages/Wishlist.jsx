import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { Heart, ShoppingBag, Trash2 } from 'lucide-react';
import Button from '../components/Button';
import ProductCard from '../components/ProductCard';

export default function Wishlist() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [wishlistItems, setWishlistItems] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchAll();
  }, [user]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [{ data: wishlist }, { data: prods }] = await Promise.all([
        API.get('/wishlist'),
        API.get('/products'),
      ]);
      setWishlistItems(wishlist || []);
      setProducts(prods || []);
    } catch (err) {
      console.error('Failed to fetch wishlist:', err);
      setWishlistItems([]);
      setProducts([]);
    }
    setLoading(false);
  };

  const productById = useMemo(() => {
    const map = new Map();
    products.forEach((p) => map.set(p.id, p));
    return map;
  }, [products]);

  const removeFromWishlist = async (productId) => {
    try {
      await API.delete(`/wishlist/remove/${productId}`);
      await fetchAll();
    } catch (err) {
      alert(err?.response?.data?.detail || 'Failed to remove from wishlist');
    }
  };

  const handleAddToCart = async (product) => {
    try {
      await API.post('/cart/add', { product_id: product.id, quantity: 1 });
      alert('Added to cart!');
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Failed to add to cart';
      alert(msg);
    }
  };

  const detailedItems = wishlistItems
    .map((wi) => ({ ...wi, product: productById.get(wi.product_id) }))
    .filter((wi) => !!wi.product);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-neutral-600 text-lg">Loading...</div>
      </div>
    );
  }

  if (detailedItems.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-16">
        <div className="text-center">
          <Heart className="w-24 h-24 text-neutral-300 mx-auto mb-6" />
          <h1 className="font-serif text-4xl text-neutral-900 mb-4">Your Wishlist is Empty</h1>
          <p className="text-neutral-600 mb-8 max-w-md mx-auto">
            Save items you love to your wishlist. Click the heart icon on any product to add it here.
          </p>
          <Button onClick={() => navigate('/')} className="px-8">
            Continue Shopping
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="font-serif text-4xl text-neutral-900 mb-12">My Wishlist</h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {detailedItems.map((item) => (
            <div key={item.id} className="relative">
              <ProductCard
                product={item.product}
                onAddToCart={handleAddToCart}
                isInWishlist={true}
              />
              <button
                onClick={() => removeFromWishlist(item.product_id)}
                className="absolute top-4 right-4 p-2 bg-white/90 hover:bg-white transition-colors shadow-md z-10"
                title="Remove from wishlist"
              >
                <Trash2 className="w-5 h-5 text-red-600" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
