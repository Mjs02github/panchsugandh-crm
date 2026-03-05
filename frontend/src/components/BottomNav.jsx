import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV_CONFIG = {
    salesperson: [
        { label: 'Orders', icon: '📋', path: '/orders' },
        { label: 'New Order', icon: '➕', path: '/orders/new' },
        { label: 'Payments', icon: '💰', path: '/payments' },
        { label: 'Parties', icon: '🏪', path: '/store/retailers' }, // ← NEW
        { label: 'Visits', icon: '🗺️', path: '/visits' },
        { label: 'Reports', icon: '📊', path: '/reports' },
    ],
    bill_operator: [
        { label: 'Queue', icon: '📄', path: '/billing' },
        { label: 'Parties', icon: '🏪', path: '/store/retailers' }, // ← NEW
        { label: 'Products', icon: '📦', path: '/store/products' },
    ],
    delivery_incharge: [
        { label: 'Pending', icon: '🚚', path: '/delivery' },
        { label: 'Done', icon: '✅', path: '/delivery/history' },
    ],
    store_incharge: [
        { label: 'Orders', icon: '📋', path: '/store/orders' },
        { label: 'Retailers', icon: '🏪', path: '/store/retailers' },
        { label: 'Areas', icon: '📍', path: '/store/areas' },
        { label: 'Products', icon: '📦', path: '/store/products' },
    ],
    sales_officer: [
        { label: 'Team', icon: '👥', path: '/team' },
        { label: 'Orders', icon: '📋', path: '/orders' },
        { label: 'Visits', icon: '🗺️', path: '/visits' },
        { label: 'Reports', icon: '📊', path: '/reports' },
    ],
    admin: [
        { label: 'Dashboard', icon: '📊', path: '/dashboard' },
        { label: 'Orders', icon: '📋', path: '/orders' },
        { label: 'Parties', icon: '🏪', path: '/store/retailers' },
        { label: 'Users', icon: '👤', path: '/admin/users' },
        { label: 'Tracking', icon: '📍', path: '/admin/tracking' },
        { label: 'Attendance', icon: '🕒', path: '/admin/attendance' },
        { label: 'Reports', icon: '📊', path: '/reports' },
    ],
    super_admin: [
        { label: 'Dashboard', icon: '📊', path: '/dashboard' },
        { label: 'Orders', icon: '📋', path: '/orders' },
        { label: 'Parties', icon: '🏪', path: '/store/retailers' },
        { label: 'Users', icon: '👤', path: '/admin/users' },
        { label: 'Tracking', icon: '📍', path: '/admin/tracking' },
        { label: 'Attendance', icon: '🕒', path: '/admin/attendance' },
        { label: 'Reports', icon: '📊', path: '/reports' },
    ],
};

export default function BottomNav() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const { pathname } = useLocation();

    const items = NAV_CONFIG[user?.role] || [];

    return (
        <nav className="bottom-nav">
            {items.map((item) => (
                <button
                    key={item.path}
                    className={`nav-item ${pathname.startsWith(item.path) && item.path !== '/' ? 'active' : ''}`}
                    onClick={() => navigate(item.path)}
                >
                    <span className="text-xl leading-none">{item.icon}</span>
                    <span className="text-[10px] mt-0.5">{item.label}</span>
                </button>
            ))}
            <button className="nav-item text-red-500" onClick={logout}>
                <span className="text-xl leading-none">🚪</span>
                <span className="text-[10px] mt-0.5">Logout</span>
            </button>
        </nav>
    );
}
