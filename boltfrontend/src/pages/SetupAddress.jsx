import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import API from '../lib/api';
import Input from '../components/Input';
import Button from '../components/Button';
import { MapPin, Home, Building2, Tag, ArrowRight } from 'lucide-react';

export default function SetupAddress() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    full_name: '',
    phone_number: '',
    address_line_1: '',
    address_line_2: '',
    landmark: '',
    city: '',
    state: '',
    pincode: '',
    tag: 'home',
  });

  useEffect(() => {
    // Check if user is logged in
    if (!user) {
      navigate('/login');
      return;
    }

    // Check if user already has an address
    const checkAddress = async () => {
      try {
        const { data: profile } = await API.get('/user/profile');
        if (profile.has_address) {
          // If they already have an address, redirect to return URL or home
          const returnUrl = searchParams.get('returnUrl');
          if (returnUrl) {
            navigate(returnUrl);
          } else {
            navigate('/');
          }
          return;
        }
      } catch (err) {
        console.error('Error checking address:', err);
      }
    };
    checkAddress();
  }, [user, navigate, searchParams]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await API.post('/profile/addresses', formData);
      // Check if there's a return URL, otherwise go to home
      const returnUrl = searchParams.get('returnUrl');
      if (returnUrl) {
        navigate(returnUrl);
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to save address. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl">
        <div className="bg-white border border-neutral-300 rounded-lg p-8 shadow-sm">
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-neutral-100 rounded-lg">
                <MapPin className="w-6 h-6 text-neutral-900" />
              </div>
              <div>
                <h1 className="font-serif text-3xl text-neutral-900">Add Your Delivery Address</h1>
                <p className="text-neutral-600 mt-1">
                  We need your address to deliver your orders
                </p>
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="full_name" className="block text-sm font-medium text-neutral-700 mb-2">
                  Full Name *
                </label>
                <Input
                  id="full_name"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleChange}
                  required
                  placeholder="John Doe"
                  autoFocus
                />
              </div>

              <div>
                <label htmlFor="phone_number" className="block text-sm font-medium text-neutral-700 mb-2">
                  Phone Number *
                </label>
                <Input
                  id="phone_number"
                  name="phone_number"
                  value={formData.phone_number}
                  onChange={handleChange}
                  required
                  placeholder="+1 555 123 4567"
                />
              </div>
            </div>

            <div>
              <label htmlFor="address_line_1" className="block text-sm font-medium text-neutral-700 mb-2">
                Address Line 1 *
              </label>
              <Input
                id="address_line_1"
                name="address_line_1"
                value={formData.address_line_1}
                onChange={handleChange}
                required
                placeholder="Street address, P.O. box"
              />
            </div>

            <div>
              <label htmlFor="address_line_2" className="block text-sm font-medium text-neutral-700 mb-2">
                Address Line 2 (Optional)
              </label>
              <Input
                id="address_line_2"
                name="address_line_2"
                value={formData.address_line_2}
                onChange={handleChange}
                placeholder="Apartment, suite, unit, building, floor, etc."
              />
            </div>

            <div>
              <label htmlFor="landmark" className="block text-sm font-medium text-neutral-700 mb-2">
                Landmark (Optional)
              </label>
              <Input
                id="landmark"
                name="landmark"
                value={formData.landmark}
                onChange={handleChange}
                placeholder="Nearby landmark"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label htmlFor="city" className="block text-sm font-medium text-neutral-700 mb-2">
                  City *
                </label>
                <Input
                  id="city"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  required
                  placeholder="City"
                />
              </div>

              <div>
                <label htmlFor="state" className="block text-sm font-medium text-neutral-700 mb-2">
                  State *
                </label>
                <Input
                  id="state"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  required
                  placeholder="State"
                />
              </div>

              <div>
                <label htmlFor="pincode" className="block text-sm font-medium text-neutral-700 mb-2">
                  Pincode *
                </label>
                <Input
                  id="pincode"
                  name="pincode"
                  value={formData.pincode}
                  onChange={handleChange}
                  required
                  placeholder="12345"
                />
              </div>
            </div>

            <div>
              <label htmlFor="tag" className="block text-sm font-medium text-neutral-700 mb-2">
                Address Type
              </label>
              <select
                id="tag"
                name="tag"
                value={formData.tag}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-neutral-300 rounded focus:outline-none focus:border-neutral-900 transition-colors"
              >
                <option value="home">Home</option>
                <option value="office">Office</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="flex gap-4 pt-4">
              <Button type="submit" disabled={loading} className="flex-1 flex items-center justify-center gap-2">
                Save Address & Continue
                <ArrowRight className="w-4 h-4" />
              </Button>
              <button
                type="button"
                onClick={handleSkip}
                className="px-6 py-3 text-neutral-600 hover:text-neutral-900 transition-colors"
              >
                Skip for now
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

