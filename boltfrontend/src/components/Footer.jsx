import { Instagram, Facebook, Twitter } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-neutral-900 text-neutral-50 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          <div>
            <h3 className="font-serif text-2xl mb-6">ATELIER</h3>
            <p className="text-neutral-50/70 text-sm leading-relaxed">
              Timeless elegance, crafted with care. Discover luxury clothing that transcends trends.
            </p>
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
                <a href="#" className="text-neutral-50/70 hover:text-neutral-50 transition-colors duration-300 text-sm">
                  Size Guide
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-sans uppercase tracking-wider text-sm mb-6">Follow Us</h4>
            <div className="flex gap-4">
              <a
                href="#"
                className="p-2 border border-neutral-50/30 hover:border-neutral-50 hover:bg-neutral-50/10 transition-all duration-300"
              >
                <Instagram className="w-5 h-5" />
              </a>
              <a
                href="#"
                className="p-2 border border-neutral-50/30 hover:border-neutral-50 hover:bg-neutral-50/10 transition-all duration-300"
              >
                <Facebook className="w-5 h-5" />
              </a>
              <a
                href="#"
                className="p-2 border border-neutral-50/30 hover:border-neutral-50 hover:bg-neutral-50/10 transition-all duration-300"
              >
                <Twitter className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-neutral-50/20 text-center text-neutral-50/60 text-sm">
          <p>&copy; {new Date().getFullYear()} ATELIER. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
