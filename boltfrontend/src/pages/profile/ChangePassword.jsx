import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { profile } from '../../services/profile';
import Input from '../../components/Input';
import Button from '../../components/Button';
import { ArrowLeft, Lock } from 'lucide-react';

export default function ChangePassword() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    old_password: '',
    new_password: '',
    confirm_password: '',
  });

  if (!user) {
    navigate('/login');
    return null;
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError('');
    setSuccess(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    // Validation
    if (formData.new_password !== formData.confirm_password) {
      setError('New passwords do not match');
      return;
    }

    if (formData.new_password.length < 10) {
      setError('Password must be at least 10 characters long');
      return;
    }

    setLoading(true);

    try {
      await profile.changePassword(formData.old_password, formData.new_password);
      setSuccess(true);
      setFormData({
        old_password: '',
        new_password: '',
        confirm_password: '',
      });
      setTimeout(() => {
        navigate('/profile');
      }, 2000);
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to change password');
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

        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 bg-neutral-100 rounded-full flex items-center justify-center">
            <Lock className="w-6 h-6 text-neutral-600" />
          </div>
          <h1 className="font-serif text-4xl text-neutral-900">Change Password</h1>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-700 text-sm rounded">
            Password changed successfully! Redirecting...
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white border border-neutral-300/20 rounded-lg p-8">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Current Password *
              </label>
              <Input
                name="old_password"
                type="password"
                value={formData.old_password}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                New Password *
              </label>
              <Input
                name="new_password"
                type="password"
                value={formData.new_password}
                onChange={handleChange}
                required
              />
              <p className="mt-2 text-xs text-neutral-600">
                Password must be at least 10 characters and include uppercase, lowercase, digit, and special character.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Confirm New Password *
              </label>
              <Input
                name="confirm_password"
                type="password"
                value={formData.confirm_password}
                onChange={handleChange}
                required
              />
            </div>

            <div className="flex gap-4 pt-4">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? 'Changing...' : 'Change Password'}
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

