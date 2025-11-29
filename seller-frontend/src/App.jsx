import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SellerWSProvider } from './contexts/SellerWSContext';
import SellerLogin from './pages/SellerLogin';
import SellerRegister from './pages/SellerRegister';
import SellerDashboard from './pages/SellerDashboard';
import SellerOTPVerification from './pages/SellerOTPVerification';
import SellerForgotPassword from './pages/SellerForgotPassword';
import SellerResetPassword from './pages/SellerResetPassword';
import SellerOrders from './pages/SellerOrders';
import SellerOrderDetail from './pages/SellerOrderDetail';
import SellerReturns from './pages/SellerReturns';
import SellerReturnDetail from './pages/SellerReturnDetail';
import SellerVerificationPending from './pages/SellerVerificationPending';
import SellerInventory from './pages/SellerInventory';
import SellerLowStock from './pages/SellerLowStock';
import NotificationsPage from './pages/seller/NotificationsPage';

// Protected Route Component
function ProtectedRoute({ children }) {
  const { user, loading, sellerStatusChecked } = useAuth();

  if (loading || !sellerStatusChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-neutral-600 text-lg">Loading...</div>
      </div>
    );
  }

  if (!user || user.role !== 'seller') {
    return <Navigate to="/seller/login" replace />;
  }

  // If seller is logged in but not approved, they should not access protected pages
  if (!user.isApproved) {
    return <Navigate to="/seller/verification-pending" replace />;
  }

  return children;
}

// Route that requires seller login but not approval yet
function PendingSellerRoute({ children }) {
  const { user, loading, sellerStatusChecked } = useAuth();

  if (loading || !sellerStatusChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-neutral-600 text-lg">Loading...</div>
      </div>
    );
  }

  // If not logged in as seller, go to login
  if (!user || user.role !== 'seller') {
    return <Navigate to="/seller/login" replace />;
  }

  // If already approved, go to dashboard instead of showing pending page
  if (user.isApproved) {
    return <Navigate to="/seller/dashboard" replace />;
  }

  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/seller/login" element={<SellerLogin />} />
      <Route path="/seller/register" element={<SellerRegister />} />
      <Route path="/seller/verify-otp" element={<SellerOTPVerification />} />
      <Route path="/seller/forgot-password" element={<SellerForgotPassword />} />
      <Route path="/seller/reset-password" element={<SellerResetPassword />} />
      <Route
        path="/seller/verification-pending"
        element={
          <PendingSellerRoute>
            <SellerVerificationPending />
          </PendingSellerRoute>
        }
      />
      <Route
        path="/seller/dashboard"
        element={
          <ProtectedRoute>
            <SellerDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/seller/orders"
        element={
          <ProtectedRoute>
            <SellerOrders />
          </ProtectedRoute>
        }
      />
      <Route
        path="/seller/orders/:id"
        element={
          <ProtectedRoute>
            <SellerOrderDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/seller/returns"
        element={
          <ProtectedRoute>
            <SellerReturns />
          </ProtectedRoute>
        }
      />
      <Route
        path="/seller/returns/:id"
        element={
          <ProtectedRoute>
            <SellerReturnDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/seller/inventory"
        element={
          <ProtectedRoute>
            <SellerInventory />
          </ProtectedRoute>
        }
      />
      <Route
        path="/seller/inventory/low-stock"
        element={
          <ProtectedRoute>
            <SellerLowStock />
          </ProtectedRoute>
        }
      />
      <Route
        path="/seller/dashboard/notifications"
        element={
          <ProtectedRoute>
            <NotificationsPage />
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Navigate to="/seller/login" replace />} />
      <Route path="*" element={<Navigate to="/seller/login" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <SellerWSProvider>
          <div className="min-h-screen">
            <AppRoutes />
          </div>
        </SellerWSProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;

