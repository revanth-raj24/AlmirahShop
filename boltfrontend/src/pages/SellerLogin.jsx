import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Input from '../components/Input';
import Button from '../components/Button';

export default function SellerLogin() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const msg = searchParams.get('message');
    if (msg) {
      setMessage(decodeURIComponent(msg));
    }
    
    const usernameParam = searchParams.get('username');
    if (usernameParam) {
      setUsername(decodeURIComponent(usernameParam));
    }
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const result = await signIn(username, password);
      // Check user role and redirect accordingly
      const userRole = result.role || localStorage.getItem('userRole');
      if (userRole === 'seller') {
        navigate('/seller/dashboard');
      } else {
        setError('Access denied. Seller credentials required.');
        // Clear token if not seller
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        localStorage.removeItem('userRole');
      }
    } catch (err) {
      const errorDetail = err?.response?.data?.detail || 'Invalid credentials. Please try again.';
      setError(errorDetail);
      
      if (err?.response?.status === 403 && errorDetail.includes('not verified')) {
        // Redirect to OTP verification
        navigate(`/seller/verify-otp?email=${encodeURIComponent(username)}`);
      } else if (err?.response?.status === 403 && errorDetail.includes('not approved')) {
        setError('Your seller account is pending admin approval. Please wait for approval.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <h1 className="font-serif text-4xl text-neutral-900 mb-2 text-center">Seller Login</h1>
        <p className="text-neutral-600 text-center mb-8">Sign in to access seller dashboard</p>

        {message && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 text-blue-700 text-sm rounded">
            {message}
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            label="Username or Email"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            placeholder="Enter your username or email"
          />

          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Signing In...' : 'Sign In as Seller'}
          </Button>
        </form>

        <div className="mt-6 space-y-4">
          <p className="text-center text-neutral-600 text-sm">
            Don't have a seller account?{' '}
            <Link to="/seller/register" className="text-neutral-900 hover:underline font-medium">
              Register as Seller
            </Link>
          </p>
          <p className="text-center text-neutral-600 text-sm">
            Not a seller?{' '}
            <Link to="/login" className="text-neutral-900 hover:underline font-medium">
              Regular Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

