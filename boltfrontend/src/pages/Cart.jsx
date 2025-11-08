import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import API from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { Trash2, Plus, Minus, ShoppingBag, X, MapPin, Home, Building2, Tag } from 'lucide-react';
import Button from '../components/Button';
import { resolveImageUrl } from '../utils/imageUtils';

export default function Cart() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [cartItems, setCartItems] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingItems, setUpdatingItems] = useState(new Set());
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [userProfile, setUserProfile] = useState(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchAll();
  }, [user, location.pathname]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [{ data: cart }, { data: prods }, profileRes, addressesRes] = await Promise.all([
        API.get('/cart'),
        API.get('/products'),
        API.get('/user/profile').catch(() => ({ data: null })),
        API.get('/profile/addresses').catch(() => ({ data: [] })),
      ]);
      setCartItems(cart || []);
      setProducts(prods || []);
      setUserProfile(profileRes?.data);
      setAddresses(addressesRes?.data || []);
      
      // Set default address as selected
      const defaultAddress = addressesRes?.data?.find(addr => addr.is_default);
      if (defaultAddress) {
        setSelectedAddressId(defaultAddress.id);
      } else if (addressesRes?.data?.length > 0) {
        setSelectedAddressId(addressesRes.data[0].id);
      }
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

    // Validate address
    if (!userProfile?.has_address) {
      const shouldAdd = confirm('You must add a delivery address before placing an order. Would you like to add one now?');
      if (shouldAdd) {
        navigate('/setup-address?returnUrl=/cart');
      }
      return;
    }

    if (addresses.length === 0) {
      alert('No addresses found. Please add a delivery address.');
      navigate('/setup-address?returnUrl=/cart');
      return;
    }

    if (!selectedAddressId) {
      alert('Please select a delivery address');
      return;
    }

    setCheckoutLoading(true);
    try {
      await API.post(`/orders/create?address_id=${selectedAddressId}`);
      alert('Order placed successfully!');
      navigate('/orders');
    } catch (err) {
      const errorMsg = err?.response?.data?.detail || 'Failed to place order. Please try again.';
      if (errorMsg.includes('Address required')) {
        alert('You must add a delivery address before placing an order.');
        navigate('/setup-address?returnUrl=/cart');
      } else {
        alert(errorMsg);
      }
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
                      src={resolveImageUrl(product.image_url)}
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
            <div className="bg-white border border-neutral-300/20 p-8 rounded-lg sticky top-24 space-y-6">
              {/* Address Selection */}
              {addresses.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-serif text-lg text-neutral-900">Delivery Address</h3>
                    <button
                      onClick={() => navigate('/profile/addresses')}
                      className="text-sm text-neutral-600 hover:text-neutral-900"
                    >
                      Manage
                    </button>
                  </div>
                  <div className="space-y-2">
                    {addresses.map((address) => {
                      const getTagIcon = (tag) => {
                        switch (tag) {
                          case 'home':
                            return <Home className="w-4 h-4" />;
                          case 'office':
                            return <Building2 className="w-4 h-4" />;
                          default:
                            return <Tag className="w-4 h-4" />;
                        }
                      };
                      
                      return (
                        <label
                          key={address.id}
                          className={`block p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                            selectedAddressId === address.id
                              ? 'border-neutral-900 bg-neutral-50'
                              : 'border-neutral-200 hover:border-neutral-300'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <input
                              type="radio"
                              name="address"
                              value={address.id}
                              checked={selectedAddressId === address.id}
                              onChange={() => setSelectedAddressId(address.id)}
                              className="mt-1"
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                {getTagIcon(address.tag)}
                                <span className="text-sm font-medium text-neutral-900 capitalize">
                                  {address.tag}
                                </span>
                                {address.is_default && (
                                  <span className="px-2 py-0.5 text-xs bg-neutral-900 text-white rounded">
                                    Default
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-neutral-700">
                                {address.full_name} • {address.phone_number}
                              </p>
                              <p className="text-sm text-neutral-600">
                                {address.address_line_1}
                                {address.address_line_2 && `, ${address.address_line_2}`}
                              </p>
                              <p className="text-sm text-neutral-600">
                                {address.city}, {address.state} {address.pincode}
                              </p>
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

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
