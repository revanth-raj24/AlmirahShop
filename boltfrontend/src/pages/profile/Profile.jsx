import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { profile } from '../../services/profile';
import { User, Edit, Lock, MapPin, Package, Heart } from 'lucide-react';

export default function Profile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);

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
      setProfileData(data);
    } catch (err) {
      console.error('Failed to fetch profile:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-neutral-600 text-lg">Loading...</div>
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-neutral-600 mb-4">Failed to load profile</p>
          <button
            onClick={fetchProfile}
            className="px-4 py-2 bg-neutral-900 text-white rounded hover:bg-neutral-800"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return 'Not set';
    }
  };

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="font-serif text-4xl text-neutral-900 mb-8">My Profile</h1>

        <div className="bg-white border border-neutral-300/20 rounded-lg p-8 mb-8">
          <div className="flex items-center gap-6 mb-6">
            <div className="w-20 h-20 bg-neutral-100 rounded-full flex items-center justify-center">
              <User className="w-10 h-10 text-neutral-600" />
            </div>
            <div className="flex-1">
              <h2 className="font-serif text-2xl text-neutral-900 mb-1">
                {profileData.username}
              </h2>
              <p className="text-neutral-600">{profileData.email}</p>
            </div>
            <Link
              to="/profile/edit"
              className="flex items-center gap-2 px-4 py-2 border border-neutral-300 text-neutral-900 hover:bg-neutral-100 rounded transition-colors"
            >
              <Edit className="w-4 h-4" />
              Edit Profile
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Username</label>
              <p className="text-neutral-900">{profileData.username}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Email</label>
              <p className="text-neutral-900">{profileData.email}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Phone</label>
              <p className="text-neutral-900">{profileData.phone || 'Not set'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Gender</label>
              <p className="text-neutral-900 capitalize">{profileData.gender || 'Not set'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Date of Birth</label>
              <p className="text-neutral-900">{formatDate(profileData.dob)}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link
            to="/profile/change-password"
            className="bg-white border border-neutral-300/20 rounded-lg p-6 hover:border-neutral-300/40 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-neutral-100 rounded-full flex items-center justify-center">
                <Lock className="w-6 h-6 text-neutral-600" />
              </div>
              <div>
                <h3 className="font-serif text-lg text-neutral-900 mb-1">Change Password</h3>
                <p className="text-sm text-neutral-600">Update your account password</p>
              </div>
            </div>
          </Link>

          <Link
            to="/profile/addresses"
            className="bg-white border border-neutral-300/20 rounded-lg p-6 hover:border-neutral-300/40 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-neutral-100 rounded-full flex items-center justify-center">
                <MapPin className="w-6 h-6 text-neutral-600" />
              </div>
              <div>
                <h3 className="font-serif text-lg text-neutral-900 mb-1">My Addresses</h3>
                <p className="text-sm text-neutral-600">Manage delivery addresses</p>
              </div>
            </div>
          </Link>

          <Link
            to="/profile/orders"
            className="bg-white border border-neutral-300/20 rounded-lg p-6 hover:border-neutral-300/40 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-neutral-100 rounded-full flex items-center justify-center">
                <Package className="w-6 h-6 text-neutral-600" />
              </div>
              <div>
                <h3 className="font-serif text-lg text-neutral-900 mb-1">My Orders</h3>
                <p className="text-sm text-neutral-600">View order history</p>
              </div>
            </div>
          </Link>

          <Link
            to="/profile/wishlist"
            className="bg-white border border-neutral-300/20 rounded-lg p-6 hover:border-neutral-300/40 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-neutral-100 rounded-full flex items-center justify-center">
                <Heart className="w-6 h-6 text-neutral-600" />
              </div>
              <div>
                <h3 className="font-serif text-lg text-neutral-900 mb-1">My Wishlist</h3>
                <p className="text-sm text-neutral-600">View saved items</p>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}

