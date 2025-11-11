import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import AdminOTPVerification from './pages/AdminOTPVerification';
import AdminForgotPassword from './pages/AdminForgotPassword';
import AdminResetPassword from './pages/AdminResetPassword';
import UsersList from './pages/UsersList';
import UserDetail from './pages/UserDetail';
import AdminProductVerification from './pages/AdminProductVerification';
import AdminProductDetail from './pages/AdminProductDetail';
import AdminProducts from './pages/AdminProducts';
import AdminSellers from './pages/AdminSellers';
import AdminReturns from './pages/AdminReturns';
import AdminReturnDetail from './pages/AdminReturnDetail';

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

  if (!user || user.role !== 'admin') {
    return <Navigate to="/admin/login" replace />;
  }

  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin/verify-otp" element={<AdminOTPVerification />} />
      <Route path="/admin/forgot-password" element={<AdminForgotPassword />} />
      <Route path="/admin/reset-password" element={<AdminResetPassword />} />
      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <ProtectedRoute>
            <UsersList />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users/:id"
        element={
          <ProtectedRoute>
            <UserDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/products/pending"
        element={
          <ProtectedRoute>
            <AdminProductVerification />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/products"
        element={
          <ProtectedRoute>
            <AdminProducts />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/products/:id"
        element={
          <ProtectedRoute>
            <AdminProductDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/sellers"
        element={
          <ProtectedRoute>
            <AdminSellers />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/returns"
        element={
          <ProtectedRoute>
            <AdminReturns />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/returns/:id"
        element={
          <ProtectedRoute>
            <AdminReturnDetail />
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Navigate to="/admin/login" replace />} />
      <Route path="*" element={<Navigate to="/admin/login" replace />} />
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

