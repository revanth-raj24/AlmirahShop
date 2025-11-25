import { useEffect } from 'react';
import { X } from 'lucide-react';

export default function ImagePreview({ images, currentIndex, onClose }) {
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const handleArrowKeys = (e) => {
      if (images && images.length > 1) {
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          const prevIndex = currentIndex > 0 ? currentIndex - 1 : images.length - 1;
          // This would need to be handled by parent component
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          const nextIndex = currentIndex < images.length - 1 ? currentIndex + 1 : 0;
          // This would need to be handled by parent component
        }
      }
    };

    document.addEventListener('keydown', handleEscape);
    if (images && images.length > 1) {
      document.addEventListener('keydown', handleArrowKeys);
    }

    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('keydown', handleArrowKeys);
      document.body.style.overflow = 'unset';
    };
  }, [onClose, images, currentIndex]);

  if (!images || images.length === 0 || currentIndex < 0) return null;

  const currentImage = images[currentIndex];
  const imageUrl = typeof currentImage === 'string' ? currentImage : currentImage?.image_url || currentImage;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="relative max-w-7xl max-h-[90vh] w-full h-full flex items-center justify-center p-4">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 bg-black bg-opacity-50 hover:bg-opacity-70 rounded-full text-white transition-all"
          aria-label="Close preview"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Image */}
        <img
          src={imageUrl}
          alt="Preview"
          className="max-w-full max-h-full object-contain rounded-lg"
          onClick={(e) => e.stopPropagation()}
        />

        {/* Image Counter */}
        {images.length > 1 && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 px-4 py-2 bg-black bg-opacity-50 rounded-full text-white text-sm">
            {currentIndex + 1} / {images.length}
          </div>
        )}
      </div>
    </div>
  );
}

