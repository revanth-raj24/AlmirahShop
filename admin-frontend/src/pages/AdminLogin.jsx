import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Input from '../components/Input';
import Button from '../components/Button';

export default function AdminLogin() {
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
      await signIn(username, password);
      // Redirect to admin dashboard
      navigate('/admin/dashboard');
    } catch (err) {
      const errorDetail = err?.response?.data?.detail || err?.message || 'Invalid credentials. Please try again.';
      setError(errorDetail);
      
      if (err?.response?.status === 403 && errorDetail.includes('not verified')) {
        // Redirect to OTP verification
        navigate(`/admin/verify-otp?email=${encodeURIComponent(username)}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <h1 className="font-serif text-4xl text-neutral-900 mb-2 text-center">Admin Login</h1>
        <p className="text-neutral-600 text-center mb-8">Sign in to access admin dashboard</p>

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

          <div className="text-right">
            <Link to="/admin/forgot-password" className="text-sm text-neutral-600 hover:text-neutral-900 transition-colors duration-300">
              Forgot password?
            </Link>
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Signing In...' : 'Sign In as Admin'}
          </Button>
        </form>
      </div>
    </div>
  );
}

