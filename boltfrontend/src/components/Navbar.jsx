import { Search, User, ShoppingCart, Heart } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useState, useEffect } from 'react';
import API from '../lib/api';

export default function Navbar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [cartCount, setCartCount] = useState(0);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (user) {
      fetchCounts();
    } else {
      setCartCount(0);
      setWishlistCount(0);
    }
  }, [user]);

  const fetchCounts = async () => {
    try {
      const [{ data: cart }, { data: wishlist }] = await Promise.all([
        API.get('/cart').catch(() => ({ data: [] })),
        API.get('/wishlist').catch(() => ({ data: [] })),
      ]);
      const cartCount = (cart || []).reduce((sum, item) => sum + (item.quantity || 0), 0);
      const wishlistCount = (wishlist || []).length;
      setCartCount(cartCount);
      setWishlistCount(wishlistCount);
    } catch (_) {
      setCartCount(0);
      setWishlistCount(0);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <nav className="sticky top-0 z-50 bg-neutral-50 border-b border-neutral-300/20 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <Link to="/" className="font-serif text-2xl text-neutral-900 tracking-tight">
            The Almirah Shop
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <Link
              to="/?category=men"
              className="text-sm uppercase tracking-wider text-neutral-600 hover:text-neutral-900 transition-colors duration-300"
            >
              Men
            </Link>
            <Link
              to="/?category=women"
              className="text-sm uppercase tracking-wider text-neutral-600 hover:text-neutral-900 transition-colors duration-300"
            >
              Women
            </Link>
            <Link
              to="/size-guide"
              className="text-sm uppercase tracking-wider text-neutral-600 hover:text-neutral-900 transition-colors duration-300"
            >
              Size Guide
            </Link>
          </div>

          <form onSubmit={handleSearch} className="hidden md:block flex-1 max-w-md mx-8">
            <div className="relative">
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 pl-10 border border-neutral-300/30 bg-white text-neutral-900 focus:outline-none focus:border-charcoal transition-colors duration-300"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600" />
            </div>
          </form>

          <div className="flex items-center gap-6">
            {user ? (
              <div className="relative group">
                <button className="text-neutral-600 hover:text-neutral-900 transition-colors duration-300">
                  <User className="w-5 h-5" />
                </button>
                <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-neutral-300/20 shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300">
                  <Link
                    to="/profile"
                    className="block px-4 py-3 text-sm text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 transition-colors duration-300"
                  >
                    My Profile
                  </Link>
                  <Link
                    to="/profile/orders"
                    className="block px-4 py-3 text-sm text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 transition-colors duration-300"
                  >
                    My Orders
                  </Link>
                  <Link
                    to="/profile/wishlist"
                    className="block px-4 py-3 text-sm text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 transition-colors duration-300"
                  >
                    My Wishlist
                  </Link>
                  <Link
                    to="/profile/addresses"
                    className="block px-4 py-3 text-sm text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 transition-colors duration-300"
                  >
                    My Addresses
                  </Link>
                  <Link
                    to="/profile/change-password"
                    className="block px-4 py-3 text-sm text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 transition-colors duration-300"
                  >
                    Change Password
                  </Link>
                  <div className="border-t border-neutral-300/20 my-1"></div>
                  <button
                    onClick={handleSignOut}
                    className="block w-full text-left px-4 py-3 text-sm text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 transition-colors duration-300"
                  >
                    Logout
                  </button>
                </div>
              </div>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-sm uppercase tracking-wider text-neutral-600 hover:text-neutral-900 transition-colors duration-300"
                >
                  Login
                </Link>
              </>
            )}

            <Link
              to="/wishlist"
              className="relative text-neutral-600 hover:text-neutral-900 transition-colors duration-300"
            >
              <Heart className="w-5 h-5" />
              {wishlistCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-neutral-900 text-neutral-50 text-xs w-5 h-5 rounded-full flex items-center justify-center">
                  {wishlistCount}
                </span>
              )}
            </Link>

            <Link
              to="/cart"
              className="relative text-neutral-600 hover:text-neutral-900 transition-colors duration-300"
            >
              <ShoppingCart className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-neutral-900 text-neutral-50 text-xs w-5 h-5 rounded-full flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </Link>
          </div>
        </div>

        <div className="md:hidden pb-4">
          <form onSubmit={handleSearch}>
            <div className="relative">
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 pl-10 border border-neutral-300/30 bg-white text-neutral-900 focus:outline-none focus:border-charcoal transition-colors duration-300"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600" />
            </div>
          </form>
          <div className="flex items-center gap-6 mt-4">
            <Link
              to="/?category=men"
              className="text-sm uppercase tracking-wider text-neutral-600 hover:text-neutral-900 transition-colors duration-300"
            >
              Men
            </Link>
            <Link
              to="/?category=women"
              className="text-sm uppercase tracking-wider text-neutral-600 hover:text-neutral-900 transition-colors duration-300"
            >
              Women
            </Link>
            <Link
              to="/size-guide"
              className="text-sm uppercase tracking-wider text-neutral-600 hover:text-neutral-900 transition-colors duration-300"
            >
              Size Guide
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
