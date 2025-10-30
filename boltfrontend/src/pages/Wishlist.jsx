import { Link } from 'react-router-dom';

export default function Wishlist() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="font-serif text-4xl text-neutral-900 mb-4">Wishlist Coming Soon</h1>
        <p className="text-neutral-600 mb-8">This feature is not yet available with the current backend.</p>
        <Link to="/" className="btn-primary">Go back home</Link>
      </div>
    </div>
  );
}
