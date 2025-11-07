import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import API from '../lib/api';
import Input from '../components/Input';
import Button from '../components/Button';

export default function AdminOTPVerification() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  
  const email = searchParams.get('email') || '';

  const handleVerify = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    
    if (!email) {
      setError('Email is required');
      return;
    }
    
    if (!otp || otp.length !== 6) {
      setError('Please enter a valid 6-digit OTP');
      return;
    }

    setLoading(true);
    try {
      await API.post('/verify-otp', { email, otp });
      setMessage('Email verified successfully! Your admin account is now active.');
      setTimeout(() => {
        navigate('/admin/login?message=Email%20verified%20successfully!%20Please%20login%20to%20access%20admin%20dashboard.');
      }, 2000);
    } catch (err) {
      const errorDetail = err?.response?.data?.detail || 'Invalid OTP. Please try again.';
      setError(errorDetail);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) {
      setError('Email is required');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await API.post('/resend-otp', { email });
      setMessage('OTP has been resent to your email. Please check your inbox.');
    } catch (err) {
      const errorDetail = err?.response?.data?.detail || 'Failed to resend OTP.';
      setError(errorDetail);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <h1 className="font-serif text-4xl text-neutral-900 mb-2 text-center">Verify Admin Account</h1>
        <p className="text-neutral-600 text-center mb-8">
          Enter the OTP sent to <strong>{email || 'your email'}</strong>
        </p>

        {message && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-700 text-sm rounded">
            {message}
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleVerify} className="space-y-6">
          <Input
            label="Email"
            type="email"
            value={email}
            disabled
            className="bg-neutral-100"
          />

          <Input
            label="OTP Code"
            type="text"
            value={otp}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, '').slice(0, 6);
              setOtp(value);
            }}
            placeholder="Enter 6-digit OTP"
            maxLength={6}
            required
            className="text-center text-2xl tracking-widest"
          />

          <Button type="submit" disabled={loading || otp.length !== 6} className="w-full">
            {loading ? 'Verifying...' : 'Verify OTP'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={handleResend}
            disabled={loading}
            className="text-sm text-neutral-600 hover:text-neutral-900 transition-colors duration-300 disabled:opacity-50"
          >
            Didn't receive OTP? Resend
          </button>
        </div>

        <div className="mt-6 text-center">
          <button
            onClick={() => navigate('/admin/login')}
            className="text-sm text-neutral-600 hover:text-neutral-900 transition-colors duration-300"
          >
            Back to Login
          </button>
        </div>
      </div>
    </div>
  );
}

