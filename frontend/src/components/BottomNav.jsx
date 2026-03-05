import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV_CONFIG = {
    salesperson: [
        { label: 'Orders', icon: '📋', path: '/orders' },
        { label: 'New Order', icon: '➕', path: '/orders/new' },
        { label: 'Payments', icon: '💰', path: '/payments' },
        { label: 'Parties', icon: '🏪', path: '/store/retailers' },
        { label: 'Reports', icon: '📊', path: '/reports' },
        { label: 'Chat', icon: '💬', path: '/chat' },
    ],
    bill_operator: [
        { label: 'Queue', icon: '📄', path: '/billing' },
        { label: 'Parties', icon: '🏪', path: '/store/retailers' },
        { label: 'Products', icon: '📦', path: '/store/products' },
        { label: 'Chat', icon: '💬', path: '/chat' },
    ],
    delivery_incharge: [
        { label: 'Pending', icon: '🚚', path: '/delivery' },
        { label: 'Done', icon: '✅', path: '/delivery/history' },
        { label: 'Chat', icon: '💬', path: '/chat' },
    ],
    store_incharge: [
        { label: 'Orders', icon: '📋', path: '/store/orders' },
        { label: 'Retailers', icon: '🏪', path: '/store/retailers' },
        { label: 'Products', icon: '📦', path: '/store/products' },
        { label: 'Chat', icon: '💬', path: '/chat' },
    ],
    sales_officer: [
        { label: 'Team', icon: '👥', path: '/team' },
        { label: 'Orders', icon: '📋', path: '/orders' },
        { label: 'Reports', icon: '📊', path: '/reports' },
        { label: 'Chat', icon: '💬', path: '/chat' },
    ],
    admin: [
        { label: 'Dashboard', icon: '📊', path: '/dashboard' },
        { label: 'Orders', icon: '📋', path: '/orders' },
        { label: 'Users', icon: '👤', path: '/admin/users' },
        { label: 'Tracking', icon: '📍', path: '/admin/tracking' },
        { label: 'Reports', icon: '📊', path: '/reports' },
        { label: 'Chat', icon: '💬', path: '/chat' },
    ],
    super_admin: [
        { label: 'Dashboard', icon: '📊', path: '/dashboard' },
        { label: 'Orders', icon: '📋', path: '/orders' },
        { label: 'Users', icon: '👤', path: '/admin/users' },
        { label: 'Tracking', icon: '📍', path: '/admin/tracking' },
        { label: 'Reports', icon: '📊', path: '/reports' },
        { label: 'Chat', icon: '💬', path: '/chat' },
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
