import { useState } from 'react';
import { Instagram, Facebook, Twitter, Mail, Shield, Truck, RotateCcw, Award } from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * Footer Component
 * Enhanced with trust badges and newsletter subscription
 */
export default function Footer() {
  const [email, setEmail] = useState('');
  const [newsletterStatus, setNewsletterStatus] = useState('idle'); // idle, loading, success, error

  const handleNewsletterSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;

    setNewsletterStatus('loading');
    // Simulate API call - replace with actual newsletter subscription endpoint
    setTimeout(() => {
      setNewsletterStatus('success');
      setEmail('');
      setTimeout(() => setNewsletterStatus('idle'), 3000);
    }, 1000);
  };

  return (
    <footer className="bg-neutral-900 text-neutral-50 mt-20">
      {/* Trust Badges Section */}
      <section className="border-b border-neutral-50/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            <div className="flex flex-col items-center text-center">
              <div className="p-3 bg-neutral-50/10 rounded-full mb-3">
                <Truck className="w-6 h-6 text-neutral-50" />
              </div>
              <h5 className="font-sans text-sm font-semibold mb-1">Free Shipping</h5>
              <p className="text-xs text-neutral-50/70">On orders above ₹999</p>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="p-3 bg-neutral-50/10 rounded-full mb-3">
                <RotateCcw className="w-6 h-6 text-neutral-50" />
              </div>
              <h5 className="font-sans text-sm font-semibold mb-1">Easy Returns</h5>
              <p className="text-xs text-neutral-50/70">30-day return policy</p>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="p-3 bg-neutral-50/10 rounded-full mb-3">
                <Shield className="w-6 h-6 text-neutral-50" />
              </div>
              <h5 className="font-sans text-sm font-semibold mb-1">Secure Payment</h5>
              <p className="text-xs text-neutral-50/70">100% secure transactions</p>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="p-3 bg-neutral-50/10 rounded-full mb-3">
                <Award className="w-6 h-6 text-neutral-50" />
              </div>
              <h5 className="font-sans text-sm font-semibold mb-1">Quality Assured</h5>
              <p className="text-xs text-neutral-50/70">Premium quality products</p>
            </div>
          </div>
        </div>
      </section>

      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          <div>
            <h3 className="font-serif text-2xl mb-6">The Almirah Shop</h3>
            <p className="text-neutral-50/70 text-sm leading-relaxed mb-6">
              Timeless elegance, crafted with care. Discover luxury clothing that transcends trends.
            </p>
            
            {/* Newsletter Subscription */}
            <div>
              <h4 className="font-sans uppercase tracking-wider text-sm mb-4">Newsletter</h4>
              <form onSubmit={handleNewsletterSubmit} className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Your email"
                    className="flex-1 px-4 py-2 bg-neutral-800 border border-neutral-50/20 text-neutral-50 placeholder-neutral-50/50 focus:outline-none focus:border-neutral-50/40 text-sm"
                    required
                    aria-label="Newsletter email input"
                  />
                  <button
                    type="submit"
                    disabled={newsletterStatus === 'loading'}
                    className="px-4 py-2 bg-neutral-50 text-neutral-900 hover:bg-neutral-100 transition-colors duration-300 disabled:opacity-50 text-sm font-medium"
                    aria-label="Subscribe to newsletter"
                  >
                    {newsletterStatus === 'loading' ? (
                      '...'
                    ) : newsletterStatus === 'success' ? (
                      '✓'
                    ) : (
                      <Mail className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {newsletterStatus === 'success' && (
                  <p className="text-xs text-green-400">Subscribed successfully!</p>
                )}
                <p className="text-xs text-neutral-50/60">
                  Subscribe to get updates on new arrivals and exclusive offers
                </p>
              </form>
            </div>
          </div>

          <div>
            <h4 className="font-sans uppercase tracking-wider text-sm mb-6">Shop</h4>
            <ul className="space-y-3">
              <li>
                <Link to="/?category=men" className="text-neutral-50/70 hover:text-neutral-50 transition-colors duration-300 text-sm">
                  Men's Collection
                </Link>
              </li>
              <li>
                <Link to="/?category=women" className="text-neutral-50/70 hover:text-neutral-50 transition-colors duration-300 text-sm">
                  Women's Collection
                </Link>
              </li>
              <li>
                <Link to="/" className="text-neutral-50/70 hover:text-neutral-50 transition-colors duration-300 text-sm">
                  New Arrivals
                </Link>
              </li>
              <li>
                <Link to="/" className="text-neutral-50/70 hover:text-neutral-50 transition-colors duration-300 text-sm">
                  Sale
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-sans uppercase tracking-wider text-sm mb-6">Customer Care</h4>
            <ul className="space-y-3">
              <li>
                <a href="#" className="text-neutral-50/70 hover:text-neutral-50 transition-colors duration-300 text-sm">
                  Contact Us
                </a>
              </li>
              <li>
                <a href="#" className="text-neutral-50/70 hover:text-neutral-50 transition-colors duration-300 text-sm">
                  Shipping Information
                </a>
              </li>
              <li>
                <a href="#" className="text-neutral-50/70 hover:text-neutral-50 transition-colors duration-300 text-sm">
                  Returns & Exchanges
                </a>
              </li>
              <li>
                <Link to="/size-guide" className="text-neutral-50/70 hover:text-neutral-50 transition-colors duration-300 text-sm">
                  Size Guide
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-sans uppercase tracking-wider text-sm mb-6">Follow Us</h4>
            <div className="flex gap-4 mb-6">
              <a
                href="#"
                className="p-2 border border-neutral-50/30 hover:border-neutral-50 hover:bg-neutral-50/10 transition-all duration-300"
                aria-label="Follow us on Instagram"
              >
                <Instagram className="w-5 h-5" />
              </a>
              <a
                href="#"
                className="p-2 border border-neutral-50/30 hover:border-neutral-50 hover:bg-neutral-50/10 transition-all duration-300"
                aria-label="Follow us on Facebook"
              >
                <Facebook className="w-5 h-5" />
              </a>
              <a
                href="#"
                className="p-2 border border-neutral-50/30 hover:border-neutral-50 hover:bg-neutral-50/10 transition-all duration-300"
                aria-label="Follow us on Twitter"
              >
                <Twitter className="w-5 h-5" />
              </a>
            </div>
            <div className="text-sm text-neutral-50/70">
              <p className="mb-2">Customer Support</p>
              <p className="text-xs">support@thealmirahshop.com</p>
              <p className="text-xs mt-1">+91 1800-XXX-XXXX</p>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-neutral-50/20 text-center text-neutral-50/60 text-sm">
          <p>&copy; {new Date().getFullYear()} The Almirah Shop. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
