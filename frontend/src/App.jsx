import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AdaptiveLayout from './components/layouts/AdaptiveLayout';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import OrderDetail from './pages/OrderDetail';

// Salesperson
import NewOrder from './pages/salesperson/NewOrder';
import OrdersList from './pages/salesperson/OrdersList';
import PaymentEntry from './pages/salesperson/PaymentEntry';
import VisitScheduler from './pages/salesperson/VisitScheduler';

// Bill Operator
import BillingQueue from './pages/billoperator/BillingQueue';

// Delivery
import DeliveryQueue from './pages/delivery/DeliveryQueue';

// Store In-charge
import StoreDashboard from './pages/storeincharge/StoreDashboard';
import RetailersList from './pages/storeincharge/RetailersList';
import AreasList from './pages/storeincharge/AreasList';
import ProductsList from './pages/storeincharge/ProductsList';
import StoreOrdersQueue from './pages/storeincharge/StoreOrdersQueue';
import InwardStock from './pages/storeincharge/InwardStock';

// Sales Officer
import TeamList from './pages/salesofficer/TeamList';

// Admin
import UserManagement from './pages/admin/UserManagement';
import SalespersonTracking from './pages/admin/SalespersonTracking';
import AttendanceReport from './pages/admin/AttendanceReport';
import Reports from './pages/admin/Reports';
import TaxPanel from './pages/admin/TaxPanel';
import Approvals from './pages/admin/Approvals';
import ProcurementDashboard from './pages/procurement/ProcurementDashboard';
import VendorManagement from './pages/procurement/VendorManagement';
import MaterialPlanning from './pages/procurement/MaterialPlanning';
import RequestManagement from './pages/procurement/RequestManagement';
import MaterialRequests from './pages/storeincharge/MaterialRequests';
import Chat from './pages/Chat';

// Store Management (New Production System)
import RawMaterials from './pages/Store/RawMaterials';
import BOMManager from './pages/Store/BOMManager';
import ProductionEntry from './pages/Store/ProductionEntry';
import SampleManagement from './pages/Store/SampleManagement';
import PrintInvoice from './pages/PrintInvoice';


function RoleRouter() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  const defaults = {
    salesperson: '/orders',
    bill_operator: '/billing',
    delivery_incharge: '/delivery',
    store_incharge: '/store',
    sales_officer: '/team',
    procurement: '/procurement',
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

import useGPSTracking from './hooks/useGPSTracking';

function GPSTracker() {
  useGPSTracking();
  return null;
}

export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <GPSTracker />
        <Routes>
          {/* Public */}
          <Route path="/login" element={<Login />} />
          <Route path="/unauthorized" element={<Unauthorized />} />

          {/* Root redirect */}
          <Route path="/" element={<ProtectedRoute><RoleRouter /></ProtectedRoute>} />

          {/* Dashboard — all roles */}
          <Route path="/dashboard" element={<ProtectedRoute><AdaptiveLayout><Dashboard /></AdaptiveLayout></ProtectedRoute>} />

          {/* ── Salesperson ── */}
          <Route path="/orders" element={
            <ProtectedRoute roles={['salesperson', 'sales_officer', 'store_incharge', 'delivery_incharge', 'admin', 'super_admin']}><AdaptiveLayout><OrdersList /></AdaptiveLayout></ProtectedRoute>
          } />
          <Route path="/orders/new" element={
            <ProtectedRoute roles={['salesperson', 'admin', 'super_admin']}><AdaptiveLayout><NewOrder /></AdaptiveLayout></ProtectedRoute>
          } />
          <Route path="/orders/:id" element={
            <ProtectedRoute roles={['salesperson', 'sales_officer', 'bill_operator', 'delivery_incharge', 'store_incharge', 'admin', 'super_admin']}><AdaptiveLayout><OrderDetail /></AdaptiveLayout></ProtectedRoute>
          } />
          <Route path="/payments" element={
            <ProtectedRoute roles={['salesperson', 'admin', 'super_admin']}><AdaptiveLayout><PaymentEntry /></AdaptiveLayout></ProtectedRoute>
          } />
          <Route path="/visits" element={
            <ProtectedRoute roles={['salesperson', 'sales_officer', 'admin', 'super_admin']}><AdaptiveLayout><VisitScheduler /></AdaptiveLayout></ProtectedRoute>
          } />

          {/* ── Bill Operator ── */}
          <Route path="/billing" element={
            <ProtectedRoute roles={['bill_operator', 'admin', 'super_admin']}><AdaptiveLayout><BillingQueue /></AdaptiveLayout></ProtectedRoute>
          } />

          {/* ── Delivery In-charge ── */}
          <Route path="/delivery" element={
            <ProtectedRoute roles={['delivery_incharge', 'admin', 'super_admin']}><AdaptiveLayout><DeliveryQueue /></AdaptiveLayout></ProtectedRoute>
          } />

          {/* ── Store In-charge ── */}
          <Route path="/store" element={
            <ProtectedRoute roles={['store_incharge', 'admin', 'super_admin']}><AdaptiveLayout><StoreDashboard /></AdaptiveLayout></ProtectedRoute>
          } />
          <Route path="/store/inward" element={
            <ProtectedRoute roles={['store_incharge', 'admin', 'super_admin']}><AdaptiveLayout><InwardStock /></AdaptiveLayout></ProtectedRoute>
          } />
          <Route path="/store/orders" element={
            <ProtectedRoute roles={['store_incharge', 'admin', 'super_admin']}><AdaptiveLayout><StoreOrdersQueue /></AdaptiveLayout></ProtectedRoute>
          } />
          <Route path="/store/retailers" element={
            <ProtectedRoute roles={['store_incharge', 'admin', 'super_admin', 'salesperson', 'bill_operator']}><AdaptiveLayout><RetailersList /></AdaptiveLayout></ProtectedRoute>
          } />
          <Route path="/store/areas" element={
            <ProtectedRoute roles={['store_incharge', 'admin', 'super_admin']}><AdaptiveLayout><AreasList /></AdaptiveLayout></ProtectedRoute>
          } />
          <Route path="/store/products" element={
            <ProtectedRoute roles={['store_incharge', 'admin', 'super_admin', 'bill_operator']}><AdaptiveLayout><ProductsList /></AdaptiveLayout></ProtectedRoute>
          } />
          <Route path="/store/raw-materials" element={
            <ProtectedRoute roles={['store_incharge', 'admin', 'super_admin', 'procurement']}><AdaptiveLayout><RawMaterials /></AdaptiveLayout></ProtectedRoute>
          } />
          <Route path="/store/bom" element={
            <ProtectedRoute roles={['store_incharge', 'admin', 'super_admin']}><AdaptiveLayout><BOMManager /></AdaptiveLayout></ProtectedRoute>
          } />
          <Route path="/store/production" element={
            <ProtectedRoute roles={['store_incharge', 'admin', 'super_admin']}><AdaptiveLayout><ProductionEntry /></AdaptiveLayout></ProtectedRoute>
          } />
          <Route path="/store/requests" element={
            <ProtectedRoute roles={['store_incharge', 'admin', 'super_admin']}><AdaptiveLayout><MaterialRequests /></AdaptiveLayout></ProtectedRoute>
          } />
          <Route path="/store/samples" element={
            <ProtectedRoute roles={['store_incharge', 'admin', 'super_admin', 'bill_operator']}><AdaptiveLayout><SampleManagement /></AdaptiveLayout></ProtectedRoute>
          } />

          {/* ── Sales Officer ── */}
          <Route path="/team" element={
            <ProtectedRoute roles={['sales_officer', 'admin', 'super_admin']}><AdaptiveLayout><TeamList /></AdaptiveLayout></ProtectedRoute>
          } />

          {/* ── Admin ── */}
          <Route path="/admin/users" element={
            <ProtectedRoute roles={['admin', 'super_admin']}><AdaptiveLayout><UserManagement /></AdaptiveLayout></ProtectedRoute>
          } />
          <Route path="/admin/tracking" element={
            <ProtectedRoute roles={['admin', 'super_admin', 'sales_officer']}><AdaptiveLayout><SalespersonTracking /></AdaptiveLayout></ProtectedRoute>
          } />
          <Route path="/admin/attendance" element={
            <ProtectedRoute roles={['admin', 'super_admin', 'sales_officer']}><AdaptiveLayout><AttendanceReport /></AdaptiveLayout></ProtectedRoute>
          } />
          <Route path="/reports" element={
            <ProtectedRoute roles={['admin', 'super_admin', 'sales_officer', 'salesperson']}><AdaptiveLayout><Reports /></AdaptiveLayout></ProtectedRoute>
          } />
          <Route path="/admin/tax-panel" element={
            <ProtectedRoute roles={['admin', 'super_admin', 'bill_operator']}><AdaptiveLayout><TaxPanel /></AdaptiveLayout></ProtectedRoute>
          } />
          <Route path="/admin/approvals" element={
            <ProtectedRoute roles={['admin', 'super_admin']}><AdaptiveLayout><Approvals /></AdaptiveLayout></ProtectedRoute>
          } />
          <Route path="/chat" element={
            <ProtectedRoute roles={['admin', 'super_admin', 'sales_officer', 'salesperson', 'bill_operator', 'delivery_incharge', 'store_incharge', 'procurement']}><AdaptiveLayout><Chat /></AdaptiveLayout></ProtectedRoute>
          } />

          <Route path="/invoice/print" element={<PrintInvoice />} />
          {/* Procurement Routes */}
          <Route path="/procurement" element={<ProtectedRoute roles={['admin', 'super_admin', 'procurement']}><ProcurementDashboard /></ProtectedRoute>} />
          <Route path="/procurement/vendors" element={<ProtectedRoute roles={['admin', 'super_admin', 'procurement']}><VendorManagement /></ProtectedRoute>} />
          <Route path="/procurement/planning" element={<ProtectedRoute roles={['admin', 'super_admin', 'procurement']}><MaterialPlanning /></ProtectedRoute>} />
          <Route path="/procurement/requests" element={<ProtectedRoute roles={['admin', 'super_admin', 'procurement']}><RequestManagement /></ProtectedRoute>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </AuthProvider>
  );
}
