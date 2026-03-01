import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV_CONFIG = {
    salesperson: [
        { label: 'Orders', icon: '📋', path: '/orders' },
        { label: 'New Order', icon: '➕', path: '/orders/new' },
        { label: 'Payments', icon: '💰', path: '/payments' },
        { label: 'Visits', icon: '🗺️', path: '/visits' },
    ],
    bill_operator: [
        { label: 'Queue', icon: '📄', path: '/billing' },
        { label: 'History', icon: '✅', path: '/billing/done' },
    ],
    delivery_incharge: [
        { label: 'Pending', icon: '🚚', path: '/delivery' },
        { label: 'Done', icon: '✅', path: '/delivery/history' },
    ],
    store_incharge: [
        { label: 'Retailers', icon: '🏪', path: '/store/retailers' },
        { label: 'Areas', icon: '📍', path: '/store/areas' },
        { label: 'Products', icon: '📦', path: '/store/products' },
    ],
    sales_officer: [
        { label: 'Team', icon: '👥', path: '/team' },
        { label: 'Orders', icon: '📋', path: '/orders' },
        { label: 'Targets', icon: '🎯', path: '/targets' },
    ],
    admin: [
        { label: 'Dashboard', icon: '📊', path: '/dashboard' },
        { label: 'Orders', icon: '📋', path: '/orders' },
        { label: 'Users', icon: '👤', path: '/admin/users' },
        { label: 'Reports', icon: '📈', path: '/reports' },
    ],
    super_admin: [
        { label: 'Dashboard', icon: '📊', path: '/dashboard' },
        { label: 'Orders', icon: '📋', path: '/orders' },
        { label: 'Users', icon: '👤', path: '/admin/users' },
        { label: 'Reports', icon: '📈', path: '/reports' },
    ],
};

export default function BottomNav() {
    const { user } = useAuth();
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
                    <span>{item.label}</span>
                </button>
            ))}
        </nav>
    );
}
