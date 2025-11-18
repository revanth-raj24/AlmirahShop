export default function VideoProductCard({ product }) {
  return (
    <div className="group cursor-pointer">
      <div className="relative overflow-hidden bg-neutral-900 aspect-[9/16] mb-4 rounded-sm">
        {product.video_url ? (
          <video
            src={product.video_url}
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-neutral-50/50 text-sm">
            Video Demo
          </div>
        )}

        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-neutral-900/80 to-transparent p-6">
          <h3 className="font-serif text-xl text-neutral-50 mb-1">{product.name}</h3>
          <p className="text-sm text-neutral-50/80 mb-3">{product.description}</p>
          <div className="flex items-center gap-2">
            {product.discounted_price && product.discounted_price < product.price ? (
              <>
                <span className="font-sans text-neutral-50 font-medium">
                  ₹{product.discounted_price.toFixed(2)}
                </span>
                <span className="font-sans text-neutral-50/60 line-through text-sm">
                  ₹{product.price.toFixed(2)}
                </span>
              </> 
            ) : (
              <span className="font-sans text-neutral-50 font-medium">
                ₹{product.price.toFixed(2)}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
