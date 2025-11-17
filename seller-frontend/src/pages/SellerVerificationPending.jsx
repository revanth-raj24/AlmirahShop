import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/Button';

export default function SellerVerificationPending() {
  const navigate = useNavigate();
  const { user, loading, signOut, sellerStatusChecked } = useAuth();

  useEffect(() => {
    // If we have a fully loaded, approved seller, send them to dashboard
    if (!loading && sellerStatusChecked && user?.role === 'seller' && user.isApproved) {
      navigate('/seller/dashboard', { replace: true });
    }
  }, [user, loading, sellerStatusChecked, navigate]);

  const handleLogout = async () => {
    await signOut();
    navigate('/seller/login', { replace: true });
  };

  if (loading || !sellerStatusChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="text-neutral-600 text-lg">Checking your seller status...</div>
      </div>
    );
  }

  const displayName = user?.username || 'Seller';

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-neutral-50">
      <div className="w-full max-w-xl bg-white border border-neutral-200 rounded-2xl shadow-sm p-8">
        <h1 className="font-serif text-3xl md:text-4xl text-neutral-900 mb-4 text-center">
          Your Seller Account is Under Verification
        </h1>
        <p className="text-neutral-600 text-center mb-6">
          Our admin team is reviewing your documents and account details. You will be approved soon.
        </p>

        <div className="bg-neutral-50 border border-dashed border-neutral-200 rounded-xl p-4 mb-6">
          <p className="text-sm text-neutral-500 mb-1">Logged in as</p>
          <p className="text-neutral-900 font-medium">{displayName}</p>
          {user?.email && (
            <p className="text-neutral-600 text-sm mt-1">{user.email}</p>
          )}
        </div>

        <p className="text-neutral-600 text-sm mb-6 text-center">
          Once your account is approved, you will automatically gain access to the seller dashboard,
          product management, orders, and earnings pages. You can refresh this page periodically to
          check your status.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            type="button"
            className="w-full sm:w-auto"
            onClick={() => window.location.reload()}
          >
            Refresh Status
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="w-full sm:w-auto"
            onClick={handleLogout}
          >
            Logout
          </Button>
        </div>

        <p className="text-xs text-neutral-500 mt-6 text-center">
          Need help? Contact our support team at&nbsp;
          <a
            href="mailto:support@example.com"
            className="underline hover:text-neutral-900"
          >
            support@example.com
          </a>
        </p>
      </div>
    </div>
  );
}


