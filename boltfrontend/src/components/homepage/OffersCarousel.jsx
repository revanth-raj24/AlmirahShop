import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * OffersCarousel Component
 * Flipkart-style horizontal scrolling offers strip
 * Auto-scrolls with manual navigation controls
 */
const offers = [
  {
    id: 1,
    title: 'Flash Sale',
    subtitle: 'Up to 50% OFF',
    description: 'Limited time only',
    color: 'from-red-500 to-red-600',
    textColor: 'text-white'
  },
  {
    id: 2,
    title: 'New Arrivals',
    subtitle: 'Fresh Collection',
    description: 'Shop the latest trends',
    color: 'from-blue-500 to-blue-600',
    textColor: 'text-white'
  },
  {
    id: 3,
    title: 'Free Shipping',
    subtitle: 'On orders above ₹999',
    description: 'No delivery charges',
    color: 'from-green-500 to-green-600',
    textColor: 'text-white'
  },
  {
    id: 4,
    title: 'Buy 2 Get 1',
    subtitle: 'Special Offer',
    description: 'On selected items',
    color: 'from-purple-500 to-purple-600',
    textColor: 'text-white'
  },
  {
    id: 5,
    title: 'Student Discount',
    subtitle: 'Extra 10% OFF',
    description: 'Valid ID required',
    color: 'from-orange-500 to-orange-600',
    textColor: 'text-white'
  },
  {
    id: 6,
    title: 'Weekend Sale',
    subtitle: 'Up to 40% OFF',
    description: 'This weekend only',
    color: 'from-pink-500 to-pink-600',
    textColor: 'text-white'
  }
];

export default function OffersCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const scrollContainerRef = useRef(null);
  const autoPlayIntervalRef = useRef(null);

  // Auto-scroll functionality
  useEffect(() => {
    if (isAutoPlaying) {
      autoPlayIntervalRef.current = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % offers.length);
      }, 4000); // Change offer every 4 seconds
    }

    return () => {
      if (autoPlayIntervalRef.current) {
        clearInterval(autoPlayIntervalRef.current);
      }
    };
  }, [isAutoPlaying]);

  // Scroll to current offer
  useEffect(() => {
    if (scrollContainerRef.current) {
      const scrollAmount = currentIndex * scrollContainerRef.current.offsetWidth;
      scrollContainerRef.current.scrollTo({
        left: scrollAmount,
        behavior: 'smooth'
      });
    }
  }, [currentIndex]);

  const handlePrev = () => {
    setIsAutoPlaying(false);
    setCurrentIndex((prev) => (prev - 1 + offers.length) % offers.length);
    setTimeout(() => setIsAutoPlaying(true), 10000); // Resume auto-play after 10s
  };

  const handleNext = () => {
    setIsAutoPlaying(false);
    setCurrentIndex((prev) => (prev + 1) % offers.length);
    setTimeout(() => setIsAutoPlaying(true), 10000); // Resume auto-play after 10s
  };

  const handleDotClick = (index) => {
    setIsAutoPlaying(false);
    setCurrentIndex(index);
    setTimeout(() => setIsAutoPlaying(true), 10000);
  };

  return (
    <section 
      className="bg-neutral-50 py-8 overflow-hidden"
      aria-label="Special offers"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative">
          {/* Scrollable Container */}
          <div
            ref={scrollContainerRef}
            className="flex overflow-x-hidden scroll-smooth snap-x snap-mandatory"
            style={{ 
              scrollbarWidth: 'none', 
              msOverflowStyle: 'none',
              WebkitOverflowScrolling: 'touch'
            }}
            onMouseEnter={() => setIsAutoPlaying(false)}
            onMouseLeave={() => setIsAutoPlaying(true)}
          >
            {offers.map((offer) => (
              <div
                key={offer.id}
                className={`min-w-full snap-start flex-shrink-0 px-4`}
              >
                <div
                  className={`bg-gradient-to-r ${offer.color} rounded-lg p-8 md:p-12 text-center ${offer.textColor} shadow-lg`}
                >
                  <div className="max-w-2xl mx-auto">
                    <h3 className="font-serif text-3xl md:text-4xl font-bold mb-2">
                      {offer.title}
                    </h3>
                    <p className="text-xl md:text-2xl font-semibold mb-2">
                      {offer.subtitle}
                    </p>
                    <p className="text-base md:text-lg opacity-90">
                      {offer.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Navigation Arrows */}
          <button
            onClick={handlePrev}
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-neutral-900 p-2 rounded-full shadow-lg transition-all duration-300 z-10"
            aria-label="Previous offer"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={handleNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-neutral-900 p-2 rounded-full shadow-lg transition-all duration-300 z-10"
            aria-label="Next offer"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>

        {/* Dot Indicators */}
        <div className="flex justify-center gap-2 mt-6">
          {offers.map((_, index) => (
            <button
              key={index}
              onClick={() => handleDotClick(index)}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                index === currentIndex
                  ? 'bg-neutral-900 w-8'
                  : 'bg-neutral-300 hover:bg-neutral-400'
              }`}
              aria-label={`Go to offer ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

