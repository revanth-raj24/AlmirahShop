import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { profile } from '../../services/profile';
import Input from '../../components/Input';
import Button from '../../components/Button';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function EditProfile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    username: '',
    phone: '',
    gender: '',
    dob: '',
  });

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchProfile();
  }, [user, navigate]);

  const fetchProfile = async () => {
    try {
      const data = await profile.getMe();
      setFormData({
        username: data.username || '',
        phone: data.phone || '',
        gender: data.gender || '',
        dob: data.dob ? data.dob.split('T')[0] : '', // Format date for input
      });
    } catch (err) {
      setError('Failed to load profile');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const updateData = {
        ...formData,
        dob: formData.dob ? new Date(formData.dob).toISOString() : null,
      };
      // Remove empty strings
      Object.keys(updateData).forEach((key) => {
        if (updateData[key] === '') {
          updateData[key] = null;
        }
      });
      await profile.update(updateData);
      navigate('/profile');
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <Link
          to="/profile"
          className="inline-flex items-center gap-2 text-neutral-600 hover:text-neutral-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Profile
        </Link>

        <h1 className="font-serif text-4xl text-neutral-900 mb-8">Edit Profile</h1>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white border border-neutral-300/20 rounded-lg p-8">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Username *
              </label>
              <Input
                name="username"
                value={formData.username}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Phone Number
              </label>
              <Input
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                type="tel"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Gender
              </label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-neutral-300 rounded focus:outline-none focus:border-neutral-900 transition-colors"
              >
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Date of Birth
              </label>
              <Input
                name="dob"
                type="date"
                value={formData.dob}
                onChange={handleChange}
              />
            </div>

            <div className="flex gap-4 pt-4">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
              <button
                type="button"
                onClick={() => navigate('/profile')}
                className="px-6 py-3 border border-neutral-300 text-neutral-900 hover:bg-neutral-100 rounded transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

