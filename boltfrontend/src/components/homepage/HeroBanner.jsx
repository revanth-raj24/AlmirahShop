import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

/**
 * HeroBanner Component
 * Full-width hero section with call-to-action button
 * SEO: Semantic HTML with proper heading hierarchy
 */
export default function HeroBanner() {
  const navigate = useNavigate();

  const handleShopNow = () => {
    navigate('/');
    // Scroll to products section after navigation
    setTimeout(() => {
      const productsSection = document.getElementById('trending-section');
      if (productsSection) {
        productsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  return (
    <section 
      className="relative w-full h-[85vh] min-h-[600px] flex items-center justify-center overflow-hidden bg-gradient-to-br from-neutral-50 via-neutral-100 to-neutral-200"
      aria-label="Hero banner"
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 35px, rgba(0,0,0,0.1) 35px, rgba(0,0,0,0.1) 70px)`
        }}></div>
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl lg:text-8xl text-neutral-900 mb-6 leading-tight">
          The Almirah Shop
        </h1>
        <p className="text-neutral-700 text-lg sm:text-xl md:text-2xl max-w-3xl mx-auto mb-8 leading-relaxed font-light">
          Discover timeless elegance with our curated collection of premium fashion
        </p>
        <p className="text-neutral-600 text-base sm:text-lg max-w-2xl mx-auto mb-12 leading-relaxed">
          Where style meets sophistication. Shop the latest trends and classic essentials.
        </p>
        <button
          onClick={handleShopNow}
          className="group inline-flex items-center gap-3 bg-neutral-900 text-neutral-50 px-8 py-4 text-sm uppercase tracking-wider font-medium hover:bg-stone transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          aria-label="Shop now button"
        >
          Shop Now
          <ArrowRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
        </button>
      </div>

      {/* Decorative Elements */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-neutral-50 to-transparent"></div>
    </section>
  );
}

