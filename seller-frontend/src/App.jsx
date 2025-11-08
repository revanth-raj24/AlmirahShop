import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
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

// Protected Route Component
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-neutral-600 text-lg">Loading...</div>
      </div>
    );
  }

  if (!user || user.role !== 'seller') {
    return <Navigate to="/seller/login" replace />;
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
      <Route path="/" element={<Navigate to="/seller/login" replace />} />
      <Route path="*" element={<Navigate to="/seller/login" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="min-h-screen">
          <AppRoutes />
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;

