import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import API from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { Heart, Star, ChevronDown, ChevronUp } from 'lucide-react';
import { resolveImageUrl } from '../utils/imageUtils';
import ProductCard from '../components/ProductCard';
import SizeGuideModal from '../components/SizeGuideModal';

export default function ProductDetails() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [selectedSize, setSelectedSize] = useState(null);
  const [selectedColor, setSelectedColor] = useState(null);
  const [currentImage, setCurrentImage] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [similarProducts, setSimilarProducts] = useState([]);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showSizeGuideModal, setShowSizeGuideModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [expandedSections, setExpandedSections] = useState({
    sizeFit: false,
    materialCare: false,
    specifications: false
  });

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const { data } = await API.get(`/products/${productId}`);
        setProduct(data);
        setCurrentImage(data.image_url);
        setError(null);
        
        // Fetch reviews
        try {
          const reviewsRes = await API.get(`/products/${productId}/reviews`);
          setReviews(reviewsRes.data || []);
        } catch (err) {
          console.error('Failed to fetch reviews:', err);
        }
        
        // Fetch similar products
        try {
          const similarRes = await API.get(`/products/${productId}/similar`);
          setSimilarProducts(similarRes.data || []);
        } catch (err) {
          console.error('Failed to fetch similar products:', err);
        }
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
      const returnUrl = `/product/${productId}`;
      navigate(`/login?message=Please%20login%20to%20add%20items%20to%20cart&returnUrl=${encodeURIComponent(returnUrl)}`);
      return;
    }

    // Validate size selection if product has sizes
    if (product?.sizes && product.sizes.length > 0 && !selectedSize) {
      alert('Please select a size');
      return;
    }

    try {
      await API.post('/cart/add', {
        product_id: product.id,
        quantity: 1,
        size: selectedSize,
        color: selectedColor
      });
      alert('Added to cart!');
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Failed to add to cart';
      alert(msg);
    }
  };

  const handleOrderNow = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      const returnUrl = `/product/${productId}`;
      navigate(`/login?message=Please%20login%20to%20place%20an%20order&returnUrl=${encodeURIComponent(returnUrl)}`);
      return;
    }

    // Validate size selection if product has sizes
    if (product?.sizes && product.sizes.length > 0 && !selectedSize) {
      alert('Please select a size');
      return;
    }

    try {
      await API.post('/cart/add', {
        product_id: product.id,
        quantity: 1,
        size: selectedSize,
        color: selectedColor
      });
      navigate('/cart');
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Failed to add to cart';
      alert(msg);
    }
  };

  const handleColorSelect = (color) => {
    setSelectedColor(color);
    // Update image if variant exists
    if (product?.variants && product.variants[color]) {
      setCurrentImage(product.variants[color]);
    }
  };

  const handleSubmitReview = async () => {
    if (!user) {
      alert('Please login to submit a review');
      return;
    }

    try {
      await API.post(`/products/${productId}/reviews`, {
        rating: reviewRating,
        review_text: reviewText
      });
      setShowReviewModal(false);
      setReviewText('');
      setReviewRating(5);
      // Refresh reviews
      const reviewsRes = await API.get(`/products/${productId}/reviews`);
      setReviews(reviewsRes.data || []);
      // Refresh product to update rating
      const productRes = await API.get(`/products/${productId}`);
      setProduct(productRes.data);
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Failed to submit review';
      alert(msg);
    }
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }
  if (error) {
    return <div className="min-h-screen flex items-center justify-center text-red-500">{error}</div>;
  }
  if (!product) return null;

  // Parse sizes and colors - handle both array and JSON string
  const getSizes = () => {
    if (!product.sizes) return [];
    if (Array.isArray(product.sizes)) return product.sizes;
    try {
      return JSON.parse(product.sizes);
    } catch {
      return [];
    }
  };
  
  const getColors = () => {
    if (!product.colors) return [];
    if (Array.isArray(product.colors)) return product.colors;
    try {
      return JSON.parse(product.colors);
    } catch {
      return [];
    }
  };
  
  const sizes = getSizes();
  const colors = getColors();
  const variants = product.variants || {};
  const specifications = product.specifications || {};

  return (
    <div className="max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-16">
        {/* Product Image */}
        <div className="bg-neutral-100 aspect-[3/4] flex items-center justify-center rounded-lg overflow-hidden">
          <img
            src={resolveImageUrl(currentImage || product.image_url)}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Product Info */}
        <div>
          <h1 className="font-serif text-3xl text-neutral-900 mb-2">{product.name}</h1>
          
          {/* Rating */}
          {product.average_rating && (
            <div className="flex items-center gap-2 mb-4">
              <div className="flex items-center">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-5 h-5 ${
                      i < Math.round(product.average_rating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-neutral-300'
                    }`}
                  />
                ))}
              </div>
              <span className="text-sm text-neutral-600">
                {product.average_rating.toFixed(1)} ({product.total_reviews || 0} reviews)
              </span>
            </div>
          )}

          <div className="flex items-center gap-4 mb-4">
            {product.discounted_price && product.discounted_price < product.price ? (
              <>
                <span className="text-2xl font-medium text-red-600">₹{product.discounted_price.toFixed(2)}</span>
                <span className="text-lg line-through text-neutral-600">₹{product.price.toFixed(2)}</span>
              </> 
            ) : (
              <span className="text-2xl font-medium text-neutral-900">₹{product.price.toFixed(2)}</span>
            )}
          </div>

          <p className="mb-6 text-neutral-700">{product.description}</p>

          {/* Size Selector */}
          {sizes.length > 0 && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Size {selectedSize ? `: ${selectedSize}` : '*'}
              </label>
              <div className="flex flex-wrap gap-2">
                {sizes.map((size) => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={`px-4 py-2 border-2 transition-colors ${
                      selectedSize === size
                        ? 'border-neutral-900 bg-neutral-900 text-white'
                        : 'border-neutral-300 hover:border-neutral-900'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="mt-3 text-sm text-neutral-600 hover:text-neutral-900 underline underline-offset-4"
                onClick={() => setShowSizeGuideModal(true)}
              >
                View Size Guide
              </button>
            </div>
          )}

          {/* Color Selector */}
          {colors.length > 0 && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Color {selectedColor ? `: ${selectedColor}` : ''}
              </label>
              <div className="flex flex-wrap gap-2">
                {colors.map((color) => (
                  <button
                    key={color}
                    onClick={() => handleColorSelect(color)}
                    className={`px-4 py-2 border-2 transition-colors ${
                      selectedColor === color
                        ? 'border-neutral-900 bg-neutral-900 text-white'
                        : 'border-neutral-300 hover:border-neutral-900'
                    }`}
                  >
                    {color}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
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
            <button
              onClick={handleAddToCart}
              className="px-5 py-2.5 bg-neutral-900 text-neutral-50 hover:bg-neutral-800 transition-colors"
            >
              Add to Cart
            </button>
            <button
              onClick={handleOrderNow}
              className="px-5 py-2.5 bg-neutral-900 text-neutral-50 hover:bg-neutral-800 transition-colors"
            >
              Order Now
            </button>
          </div>
        </div>
      </div>

      {/* Product Detail Sections */}
      <div className="border-t border-neutral-300 pt-8 mb-16">
        {/* Size & Fit */}
        {product.size_fit && (
          <div className="mb-6">
            <button
              onClick={() => toggleSection('sizeFit')}
              className="w-full flex items-center justify-between py-4 border-b border-neutral-300"
            >
              <h3 className="text-lg font-medium text-neutral-900">Size & Fit</h3>
              {expandedSections.sizeFit ? (
                <ChevronUp className="w-5 h-5" />
              ) : (
                <ChevronDown className="w-5 h-5" />
              )}
            </button>
            {expandedSections.sizeFit && (
              <div className="py-4 text-neutral-700 whitespace-pre-wrap">{product.size_fit}</div>
            )}
          </div>
        )}

        {/* Material & Care */}
        {product.material_care && (
          <div className="mb-6">
            <button
              onClick={() => toggleSection('materialCare')}
              className="w-full flex items-center justify-between py-4 border-b border-neutral-300"
            >
              <h3 className="text-lg font-medium text-neutral-900">Material & Care</h3>
              {expandedSections.materialCare ? (
                <ChevronUp className="w-5 h-5" />
              ) : (
                <ChevronDown className="w-5 h-5" />
              )}
            </button>
            {expandedSections.materialCare && (
              <div className="py-4 text-neutral-700 whitespace-pre-wrap">{product.material_care}</div>
            )}
          </div>
        )}

        {/* Specifications */}
        {Object.keys(specifications).length > 0 && (
          <div className="mb-6">
            <button
              onClick={() => toggleSection('specifications')}
              className="w-full flex items-center justify-between py-4 border-b border-neutral-300"
            >
              <h3 className="text-lg font-medium text-neutral-900">Specifications</h3>
              {expandedSections.specifications ? (
                <ChevronUp className="w-5 h-5" />
              ) : (
                <ChevronDown className="w-5 h-5" />
              )}
            </button>
            {expandedSections.specifications && (
              <div className="py-4">
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(specifications).map(([key, value]) => (
                    <div key={key}>
                      <dt className="text-sm font-medium text-neutral-600">{key}</dt>
                      <dd className="text-neutral-900">{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Reviews Section */}
      <div className="border-t border-neutral-300 pt-8 mb-16">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-serif text-neutral-900">
            Reviews ({reviews.length})
          </h2>
          {user && (
            <button
              onClick={() => setShowReviewModal(true)}
              className="px-4 py-2 bg-neutral-900 text-white hover:bg-neutral-800 transition-colors"
            >
              Add Review
            </button>
          )}
        </div>

        {reviews.length === 0 ? (
          <p className="text-neutral-600">No reviews yet. Be the first to review!</p>
        ) : (
          <div className="space-y-6">
            {reviews.map((review) => (
              <div key={review.id} className="border-b border-neutral-200 pb-6">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${
                          i < review.rating
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-neutral-300'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-sm font-medium text-neutral-900">
                    {review.user_username || 'Anonymous'}
                  </span>
                  <span className="text-sm text-neutral-500">
                    {new Date(review.created_at).toLocaleDateString()}
                  </span>
                </div>
                {review.review_text && (
                  <p className="text-neutral-700 mt-2">{review.review_text}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Similar Products */}
      {similarProducts.length > 0 && (
        <div className="border-t border-neutral-300 pt-8">
          <h2 className="text-2xl font-serif text-neutral-900 mb-6">Similar Products</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {similarProducts.map((similarProduct) => (
              <ProductCard key={similarProduct.id} product={similarProduct} />
            ))}
          </div>
        </div>
      )}

      {/* Size Guide Modal */}
      <SizeGuideModal open={showSizeGuideModal} onClose={() => setShowSizeGuideModal(false)} />

      {/* Review Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
            <h3 className="text-xl font-serif mb-4">Write a Review</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Rating</label>
              <div className="flex gap-1">
                {[...Array(5)].map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setReviewRating(i + 1)}
                    className="focus:outline-none"
                  >
                    <Star
                      className={`w-8 h-8 ${
                        i < reviewRating
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-neutral-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Review</label>
              <textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                className="w-full px-4 py-2 border border-neutral-300 focus:outline-none focus:border-neutral-900"
                rows={4}
                placeholder="Share your thoughts about this product..."
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleSubmitReview}
                className="flex-1 px-4 py-2 bg-neutral-900 text-white hover:bg-neutral-800 transition-colors"
              >
                Submit Review
              </button>
              <button
                onClick={() => {
                  setShowReviewModal(false);
                  setReviewText('');
                  setReviewRating(5);
                }}
                className="px-4 py-2 border border-neutral-300 hover:bg-neutral-100 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
