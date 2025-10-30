import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { Trash2, Plus, Minus } from 'lucide-react';
import Button from '../components/Button';

export default function Cart() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState([]);
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
      const [{ data: cart }, { data: prods }] = await Promise.all([
        API.get('/cart'),
        API.get('/products'),
      ]);
      setCartItems(cart || []);
      setProducts(prods || []);
    } catch (_) {
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
    try {
      await API.patch('/cart/quantity', { product_id: productId, quantity: newQuantity });
      await fetchAll();
    } catch (_) {}
  };

  const removeItem = async (productId) => {
    try {
      await API.delete(`/cart/remove/${productId}`);
      await fetchAll();
    } catch (_) {}
  };

  const clearCart = async () => {
    try {
      await API.delete('/cart/clear');
      await fetchAll();
    } catch (_) {}
  };

  const handleCheckout = async () => {
    if (cartItems.length === 0) {
      alert('Your cart is empty');
      return;
    }
    try {
      await API.post('/orders/create');
      alert('Order placed successfully!');
      navigate('/orders');
    } catch (err) {
      alert(err?.response?.data?.detail || 'Failed to place order. Please try again.');
    }
  };

  const detailedItems = cartItems
    .map((ci) => ({ ...ci, product: productById.get(ci.product_id) }))
    .filter((ci) => !!ci.product);

  const subtotal = detailedItems.reduce((sum, item) => {
    const price = item.product.price || 0;
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
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="font-serif text-4xl text-neutral-900 mb-4">Your Cart is Empty</h1>
          <p className="text-neutral-600 mb-8">Add some beautiful pieces to your collection</p>
          <Button onClick={() => navigate('/')}>Continue Shopping</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-12">
          <h1 className="font-serif text-4xl text-neutral-900">Shopping Cart</h1>
          <button onClick={clearCart} className="text-sm text-neutral-600 hover:text-neutral-900">Clear cart</button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 space-y-6">
            {detailedItems.map((item) => (
              <div
                key={item.id}
                className="flex gap-6 p-6 bg-white border border-neutral-300/20 hover:border-neutral-300/40 transition-colors duration-300"
              >
                <div className="w-32 h-40 bg-neutral-100 flex items-center justify-center">
                  <span className="text-neutral-400 text-sm">No Image</span>
                </div>

                <div className="flex-1">
                  <h3 className="font-serif text-xl text-neutral-900 mb-2">{item.product.name}</h3>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                        className="p-1 hover:bg-neutral-100/30 transition-colors duration-300"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="font-sans text-neutral-900 w-8 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                        className="p-1 hover:bg-neutral-100/30 transition-colors duration-300"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center gap-6">
                      <span className="font-sans text-neutral-900 font-medium">
                        ${(item.product.price * item.quantity).toFixed(2)}
                      </span>
                      <button
                        onClick={() => removeItem(item.product_id)}
                        className="text-neutral-600 hover:text-red-600 transition-colors duration-300"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white border border-neutral-300/20 p-8 sticky top-24">
              <h2 className="font-serif text-2xl text-neutral-900 mb-6">Order Summary</h2>

              <div className="space-y-4 mb-6">
                <div className="flex justify-between text-neutral-600">
                  <span>Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-neutral-600">
                  <span>Tax (10%)</span>
                  <span>${tax.toFixed(2)}</span>
                </div>
                <div className="border-t border-neutral-300/20 pt-4">
                  <div className="flex justify-between font-sans font-medium text-neutral-900 text-lg">
                    <span>Total</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <Button onClick={handleCheckout} className="w-full">
                Proceed to Checkout
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
