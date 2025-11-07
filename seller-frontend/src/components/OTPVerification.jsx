import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../lib/api';
import Input from './Input';
import Button from './Button';

export default function OTPVerification({ email, onVerified }) {
  const navigate = useNavigate();
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleVerify = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!otp || otp.length !== 6) {
      setError('Please enter a valid 6-digit OTP');
      return;
    }

    setLoading(true);
    try {
      await API.post('/verify-otp', { email, otp });
      setSuccess(true);
      setTimeout(() => {
        if (onVerified) {
          onVerified();
        } else {
          navigate('/seller/login?message=Email%20verified%20successfully!%20Please%20login.');
        }
      }, 1500);
    } catch (err) {
      setError(err?.response?.data?.detail || 'Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setError('');
    setResending(true);
    try {
      await API.post('/resend-otp', { email });
      alert('OTP has been resent to your email. Please check your inbox.');
    } catch (err) {
      const errorMsg = err?.response?.data?.detail || 'Failed to resend OTP. Please try again.';
      setError(errorMsg);
      alert(errorMsg);
    } finally {
      setResending(false);
    }
  };

  const handleOtpChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setOtp(value);
    setError('');
  };

  if (success) {
    return (
      <div className="text-center py-8">
        <div className="mb-4">
          <svg className="w-16 h-16 text-green-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-xl font-serif text-neutral-900 mb-2">Email Verified!</h3>
        <p className="text-neutral-600">Your account is now active. Redirecting to login...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="text-center mb-8">
        <h2 className="font-serif text-3xl text-neutral-900 mb-2">Verify Your Email</h2>
        <p className="text-neutral-600">
          We've sent a 6-digit verification code to
        </p>
        <p className="text-neutral-900 font-medium mt-1">{email}</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded">
          {error}
        </div>
      )}

      <form onSubmit={handleVerify} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-neutral-900 mb-2">
            Enter Verification Code
          </label>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={otp}
            onChange={handleOtpChange}
            placeholder="000000"
            className="w-full px-4 py-3 text-center text-2xl tracking-widest border border-neutral-300 focus:outline-none focus:border-neutral-900 transition-colors rounded font-mono"
            maxLength={6}
            required
            autoFocus
          />
          <p className="text-xs text-neutral-500 mt-2 text-center">
            Enter the 6-digit code sent to your email
          </p>
        </div>

        <Button type="submit" disabled={loading || otp.length !== 6} className="w-full">
          {loading ? 'Verifying...' : 'Verify Email'}
        </Button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-neutral-600 mb-3">
          Didn't receive the code?
        </p>
        <button
          type="button"
          onClick={handleResendOTP}
          disabled={resending}
          className="text-sm text-neutral-900 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {resending ? 'Resending...' : 'Resend OTP'}
        </button>
      </div>
    </div>
  );
}

