import { Heart, ShoppingCart } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { resolveImageUrl } from '../utils/imageUtils';

export default function ProductCard({ product, onAddToCart, onToggleWishlist, isInWishlist }) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const hasDiscount =
    typeof product.discounted_price === 'number' &&
    typeof product.price === 'number' &&
    product.discounted_price < product.price;

  const handleAddToCart = async () => {
    if (!user) {
      alert('Please login to add items to cart');
      return;
    }
    setIsLoading(true);
    await onAddToCart(product);
    setIsLoading(false);
  };

  const handleToggleWishlist = async () => {
    if (!user) {
      alert('Please login to add items to wishlist');
      return;
    }
    if (onToggleWishlist) {
      await onToggleWishlist(product.id);
    }
  };

  const imageUrl = resolveImageUrl(product.image_url);
  const description = product.description || '';

  return (
    <div className="group cursor-pointer">
      <div 
        className="relative overflow-hidden bg-neutral-100 aspect-[3/4] mb-4 cursor-pointer"
        onClick={() => navigate(`/product/${product.id}`)}
      >
        <img
          src={imageUrl}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />

        <div className="absolute top-4 right-4 flex flex-col gap-2" onClick={e => e.stopPropagation()}>
          {onToggleWishlist && (
            <button
              onClick={handleToggleWishlist}
              className="p-2 bg-white/90 hover:bg-white transition-colors duration-300 shadow-md rounded"
              title={isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
            >
              <Heart
                className={`w-5 h-5 ${isInWishlist ? 'fill-red-600 text-red-600' : 'text-neutral-900'}`}
              />
            </button>
          )}
          {onAddToCart && (
            <button
              onClick={handleAddToCart}
              disabled={isLoading}
              className="p-2 bg-white/90 hover:bg-white transition-colors duration-300 shadow-md disabled:opacity-50 rounded"
              title="Add to cart"
            >
              <ShoppingCart className="w-5 h-5 text-neutral-900" />
            </button>
          )}
        </div>

        {hasDiscount && (
          <div className="absolute top-4 left-4 bg-neutral-900 text-neutral-50 px-3 py-1 text-xs uppercase tracking-wider">
            Sale
          </div>
        )}
        {product.status === 'OUT_OF_STOCK' && (
          <div className="absolute top-4 left-4 bg-red-600 text-white px-3 py-1 text-xs uppercase tracking-wider">
            Out of Stock
          </div>
        )}
      </div>

      <div className="space-y-1" onClick={() => navigate(`/product/${product.id}`)}>
        <h3 className="font-serif text-lg text-neutral-900">{product.name}</h3>
        {description && <p className="text-sm text-neutral-600 leading-relaxed">{description}</p>}
        <div className="flex items-center gap-2 pt-1">
          {typeof product.price === 'number' ? (
            hasDiscount ? (
              <>
                <span className="font-sans text-neutral-900 font-medium">
                  ₹{product.discounted_price.toFixed(2)}
                </span>
                <span className="font-sans text-neutral-600 line-through text-sm">
                  ₹{product.price.toFixed(2)}
                </span>
              </> 
            ) : (
              <span className="font-sans text-neutral-900 font-medium">₹{product.price.toFixed(2)}</span>
            )
          ) : (
            <span className="font-sans text-neutral-900 font-medium">N/A</span>
          )}
        </div>
      </div>
    </div>
  );
}
