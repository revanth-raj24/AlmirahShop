import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import API from '../lib/api';
import Input from '../components/Input';
import Button from '../components/Button';
import OTPVerification from '../components/OTPVerification';

export default function SellerRegister() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [showOTP, setShowOTP] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });

  const validateForm = () => {
    const newErrors = {};

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    }

    if (formData.phone && !/^\+?[0-9\-\s]{7,15}$/.test(formData.phone)) {
      newErrors.phone = 'Phone is invalid';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);

    try {
      await API.post('/users/register-seller', { 
        username: formData.username, 
        email: formData.email, 
        password: formData.password, 
        phone: formData.phone || undefined 
      });
      setUserEmail(formData.email);
      setShowOTP(true);
    } catch (error) {
      alert(error?.response?.data?.detail || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOTPVerified = () => {
    const username = formData.username;
    navigate(`/seller/login?message=Email%20verified%20successfully!%20Your%20seller%20account%20is%20now%20active.%20Please%20wait%20for%20admin%20approval.&username=${encodeURIComponent(username)}`);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  if (showOTP) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12">
        <OTPVerification email={userEmail} onVerified={handleOTPVerified} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <h1 className="font-serif text-4xl text-neutral-900 mb-2 text-center">Become a Seller</h1>
        <p className="text-neutral-600 text-center mb-8">Register your seller account</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            label="Email"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            error={errors.email}
            required
          />

          <Input
            label="Username"
            name="username"
            value={formData.username}
            onChange={handleChange}
            error={errors.username}
            required
          />

          <Input
            label="Phone (optional)"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            error={errors.phone}
            placeholder="e.g. +1 555 123 4567"
          />

          <Input
            label="Password"
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            error={errors.password}
            required
          />

          <Input
            label="Confirm Password"
            type="password"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            error={errors.confirmPassword}
            required
          />

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Creating Account...' : 'Register as Seller'}
          </Button>
        </form>

        <p className="mt-6 text-center text-neutral-600 text-sm">
          Already have a seller account?{' '}
          <Link 
            to="/seller/login"
            className="text-neutral-900 hover:underline font-medium"
          >
            Seller Login
          </Link>
        </p>
      </div>
    </div>
  );
}

