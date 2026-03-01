import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

// Salesperson
import NewOrder from './pages/salesperson/NewOrder';
import OrdersList from './pages/salesperson/OrdersList';
import PaymentEntry from './pages/salesperson/PaymentEntry';

// Bill Operator
import BillingQueue from './pages/billoperator/BillingQueue';

// Delivery
import DeliveryQueue from './pages/delivery/DeliveryQueue';

function RoleRouter() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;

  // Default landing per role
  const defaults = {
    salesperson: '/orders',
    bill_operator: '/billing',
    delivery_incharge: '/delivery',
    store_incharge: '/dashboard',
    sales_officer: '/dashboard',
    admin: '/dashboard',
    super_admin: '/dashboard',
  };
  return <Navigate to={defaults[user.role] || '/dashboard'} replace />;
}

function Unauthorized() {
  const { logout } = useAuth();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <div className="text-5xl mb-4">🚫</div>
      <h1 className="text-xl font-bold text-gray-800 mb-2">Access Denied</h1>
      <p className="text-gray-500 text-sm mb-6">You don't have permission to view this page.</p>
      <button onClick={logout} className="btn-primary max-w-xs">Logout</button>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<Login />} />
          <Route path="/unauthorized" element={<Unauthorized />} />

          {/* Root redirect */}
          <Route path="/" element={<ProtectedRoute><RoleRouter /></ProtectedRoute>} />

          {/* Dashboard — all roles */}
          <Route path="/dashboard" element={
            <ProtectedRoute><Dashboard /></ProtectedRoute>
          } />

          {/* Orders */}
          <Route path="/orders" element={
            <ProtectedRoute><OrdersList /></ProtectedRoute>
          } />
          <Route path="/orders/new" element={
            <ProtectedRoute roles={['salesperson', 'admin', 'super_admin']}>
              <NewOrder />
            </ProtectedRoute>
          } />

          {/* Payments */}
          <Route path="/payments" element={
            <ProtectedRoute roles={['salesperson', 'admin', 'super_admin']}>
              <PaymentEntry />
            </ProtectedRoute>
          } />

          {/* Billing */}
          <Route path="/billing" element={
            <ProtectedRoute roles={['bill_operator', 'admin', 'super_admin']}>
              <BillingQueue />
            </ProtectedRoute>
          } />

          {/* Delivery */}
          <Route path="/delivery" element={
            <ProtectedRoute roles={['delivery_incharge', 'admin', 'super_admin']}>
              <DeliveryQueue />
            </ProtectedRoute>
          } />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
