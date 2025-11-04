import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import API from '../lib/api';

export default function ProductDetails() {
  const { productId } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const { data } = await API.get(`/products/${productId}`);
        setProduct(data);
        setError(null);
      } catch (err) {
        setError('Product not found');
        setProduct(null);
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [productId]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }
  if (error) {
    return <div className="min-h-screen flex items-center justify-center text-red-500">{error}</div>;
  }
  if (!product) return null;

  return (
    <div className="max-w-4xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        <div className="bg-neutral-100 aspect-[3/4] flex items-center justify-center">
          <img src={product.image_url || 'https://via.placeholder.com/400x533?text=Product'} alt={product.name} className="w-full h-full object-cover rounded-lg" />
        </div>
        <div>
          <h1 className="font-serif text-3xl text-neutral-900 mb-2">{product.name}</h1>
          <div className="flex items-center gap-4 mb-4">
            {product.discounted_price && product.discounted_price < product.price ? (
              <>
                <span className="text-2xl font-medium text-red-600">${product.discounted_price.toFixed(2)}</span>
                <span className="text-lg line-through text-neutral-600">${product.price.toFixed(2)}</span>
              </>
            ) : (
              <span className="text-2xl font-medium text-neutral-900">${product.price.toFixed(2)}</span>
            )}
          </div>
          <p className="mb-6 text-neutral-700">{product.description}</p>
        </div>
      </div>
    </div>
  );
}
