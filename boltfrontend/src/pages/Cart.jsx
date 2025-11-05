import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { Trash2, Plus, Minus, ShoppingBag, X } from 'lucide-react';
import Button from '../components/Button';

export default function Cart() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingItems, setUpdatingItems] = useState(new Set());
  const [checkoutLoading, setCheckoutLoading] = useState(false);

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
      const [{ data: cart }, { data: prods }] = await Promise.all([
        API.get('/cart'),
        API.get('/products'),
      ]);
      setCartItems(cart || []);
      setProducts(prods || []);
    } catch (err) {
      console.error('Failed to fetch cart:', err);
      setCartItems([]);
      setProducts([]);
    }
    setLoading(false);
  };

  const productById = useMemo(() => {
    const map = new Map();
    products.forEach((p) => map.set(p.id, p));
    return map;
  }, [products]);

  const updateQuantity = async (productId, newQuantity) => {
    if (newQuantity < 1) {
      await removeItem(productId);
      return;
    }
    setUpdatingItems((prev) => new Set(prev).add(productId));
    try {
      await API.patch('/cart/quantity', { product_id: productId, quantity: newQuantity });
      await fetchAll();
    } catch (err) {
      alert(err?.response?.data?.detail || 'Failed to update quantity');
    } finally {
      setUpdatingItems((prev) => {
        const next = new Set(prev);
        next.delete(productId);
        return next;
      });
    }
  };

  const increaseQuantity = async (productId) => {
    setUpdatingItems((prev) => new Set(prev).add(productId));
    try {
      await API.post(`/cart/increase/${productId}`);
      await fetchAll();
    } catch (err) {
      alert(err?.response?.data?.detail || 'Failed to increase quantity');
    } finally {
      setUpdatingItems((prev) => {
        const next = new Set(prev);
        next.delete(productId);
        return next;
      });
    }
  };

  const decreaseQuantity = async (productId) => {
    setUpdatingItems((prev) => new Set(prev).add(productId));
    try {
      await API.post(`/cart/decrease/${productId}`);
      await fetchAll();
    } catch (err) {
      alert(err?.response?.data?.detail || 'Failed to decrease quantity');
    } finally {
      setUpdatingItems((prev) => {
        const next = new Set(prev);
        next.delete(productId);
        return next;
      });
    }
  };

  const removeItem = async (productId) => {
    if (!confirm('Remove this item from cart?')) return;
    setUpdatingItems((prev) => new Set(prev).add(productId));
    try {
      await API.delete(`/cart/remove/${productId}`);
      await fetchAll();
    } catch (err) {
      alert(err?.response?.data?.detail || 'Failed to remove item');
    } finally {
      setUpdatingItems((prev) => {
        const next = new Set(prev);
        next.delete(productId);
        return next;
      });
    }
  };

  const clearCart = async () => {
    if (!confirm('Clear all items from cart?')) return;
    try {
      await API.delete('/cart/clear');
      await fetchAll();
    } catch (err) {
      alert(err?.response?.data?.detail || 'Failed to clear cart');
    }
  };

  const handleCheckout = async () => {
    if (cartItems.length === 0) {
      alert('Your cart is empty');
      return;
    }
    setCheckoutLoading(true);
    try {
      await API.post('/orders/create');
      alert('Order placed successfully!');
      navigate('/orders');
    } catch (err) {
      alert(err?.response?.data?.detail || 'Failed to place order. Please try again.');
    } finally {
      setCheckoutLoading(false);
    }
  };

  const detailedItems = cartItems
    .map((ci) => ({ ...ci, product: productById.get(ci.product_id) }))
    .filter((ci) => !!ci.product);

  const subtotal = detailedItems.reduce((sum, item) => {
    const product = item.product;
    const price = product.discounted_price && product.discounted_price < product.price
      ? product.discounted_price
      : product.price || 0;
    return sum + price * item.quantity;
  }, 0);

  const tax = subtotal * 0.1;
  const total = subtotal + tax;

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
          <ShoppingBag className="w-24 h-24 text-neutral-300 mx-auto mb-6" />
          <h1 className="font-serif text-4xl text-neutral-900 mb-4">Your Cart is Empty</h1>
          <p className="text-neutral-600 mb-8 max-w-md mx-auto">
            Add some beautiful pieces to your collection. Discover timeless elegance that matches your style.
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
        <div className="flex items-center justify-between mb-12">
          <h1 className="font-serif text-4xl text-neutral-900">Shopping Cart</h1>
          {detailedItems.length > 0 && (
            <button
              onClick={clearCart}
              className="text-sm text-neutral-600 hover:text-neutral-900 transition-colors duration-300 flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              Clear cart
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
          <div className="lg:col-span-2 space-y-4">
            {detailedItems.map((item) => {
              const isUpdating = updatingItems.has(item.product_id);
              const product = item.product;
              const itemPrice = product.discounted_price && product.discounted_price < product.price
                ? product.discounted_price
                : product.price || 0;
              const itemTotal = itemPrice * item.quantity;

              return (
                <div
                  key={item.id}
                  className="flex gap-6 p-6 bg-white border border-neutral-300/20 hover:border-neutral-300/40 transition-all duration-300 rounded-lg"
                >
                  <div className="w-32 h-40 bg-neutral-100 flex-shrink-0 rounded overflow-hidden">
                    <img
                      src={product.image_url || 'https://via.placeholder.com/400x533?text=Product'}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-serif text-xl text-neutral-900 mb-2">{product.name}</h3>
                      {product.description && (
                        <p className="text-sm text-neutral-600 mb-3 line-clamp-2">{product.description}</p>
                      )}
                      <div className="flex items-center gap-2 mb-4">
                        {product.discounted_price && product.discounted_price < product.price ? (
                          <>
                            <span className="text-lg font-medium text-neutral-900">${itemPrice.toFixed(2)}</span>
                            <span className="text-sm text-neutral-500 line-through">${product.price.toFixed(2)}</span>
                          </>
                        ) : (
                          <span className="text-lg font-medium text-neutral-900">${itemPrice.toFixed(2)}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 border border-neutral-300/40 rounded">
                        <button
                          onClick={() => decreaseQuantity(item.product_id)}
                          disabled={isUpdating}
                          className="p-2 hover:bg-neutral-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="font-sans text-neutral-900 w-12 text-center font-medium">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => increaseQuantity(item.product_id)}
                          disabled={isUpdating}
                          className="p-2 hover:bg-neutral-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex items-center gap-6">
                        <span className="font-sans text-neutral-900 font-semibold text-lg">
                          ${itemTotal.toFixed(2)}
                        </span>
                        <button
                          onClick={() => removeItem(item.product_id)}
                          disabled={isUpdating}
                          className="text-neutral-600 hover:text-red-600 transition-colors duration-300 disabled:opacity-50"
                          title="Remove item"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white border border-neutral-300/20 p-8 rounded-lg sticky top-24">
              <h2 className="font-serif text-2xl text-neutral-900 mb-6">Order Summary</h2>

              <div className="space-y-4 mb-6">
                <div className="flex justify-between text-neutral-600">
                  <span>Subtotal ({detailedItems.length} {detailedItems.length === 1 ? 'item' : 'items'})</span>
                  <span className="font-medium">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-neutral-600">
                  <span>Tax (10%)</span>
                  <span className="font-medium">${tax.toFixed(2)}</span>
                </div>
                <div className="border-t border-neutral-300/20 pt-4">
                  <div className="flex justify-between font-sans font-semibold text-neutral-900 text-xl">
                    <span>Total</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleCheckout}
                disabled={checkoutLoading || detailedItems.length === 0}
                className="w-full"
              >
                {checkoutLoading ? 'Processing...' : 'Proceed to Checkout'}
              </Button>

              <button
                onClick={() => navigate('/')}
                className="w-full mt-4 text-center text-neutral-600 hover:text-neutral-900 transition-colors duration-300 text-sm"
              >
                Continue Shopping
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
