import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV_CONFIG = {
    salesperson: [
        { label: 'Home', icon: '🏠', path: '/dashboard' },
        { label: 'Orders', icon: '📋', path: '/orders' },
        { label: 'New', icon: '➕', path: '/orders/new' },
        { label: 'Payments', icon: '💰', path: '/payments' },
        { label: 'Parties', icon: '🏪', path: '/store/retailers' },
        { label: 'Reports', icon: '📊', path: '/reports' },
        { label: 'Chat', icon: '💬', path: '/chat', badge: true },
    ],
    bill_operator: [
        { label: 'Queue', icon: '📄', path: '/billing' },
        { label: 'Tax', icon: '🏦', path: '/admin/tax-panel' },
        { label: 'Parties', icon: '🏪', path: '/store/retailers' },
        { label: 'Chat', icon: '💬', path: '/chat', badge: true },
    ],
    delivery_incharge: [
        { label: 'Pending', icon: '🚚', path: '/delivery' },
        { label: 'Done', icon: '✅', path: '/delivery/history' },
        { label: 'Chat', icon: '💬', path: '/chat', badge: true },
    ],
    store_incharge: [
        { label: 'Store', icon: '🏠', path: '/store' },
        { label: 'Mfg Logs', icon: '🏭', path: '/manufacturing/logs' },
        { label: 'Approvals', icon: '⚖️', path: '/manufacturing/approvals' },
        { label: 'Materials', icon: '🏗️', path: '/store/raw-materials' },
        { label: 'Chat', icon: '💬', path: '/chat', badge: true },
    ],
    sales_officer: [
        { label: 'Team', icon: '👥', path: '/team' },
        { label: 'Orders', icon: '📋', path: '/orders' },
        { label: 'Reports', icon: '📊', path: '/reports' },
        { label: 'Chat', icon: '💬', path: '/chat', badge: true },
    ],
    procurement: [
        { label: 'Dashboard', icon: '🏠', path: '/procurement' },
        { label: 'Mfg Logs', icon: '🏭', path: '/manufacturing/logs' },
        { label: 'Planning', icon: '📋', path: '/procurement/planning' },
        { label: 'RM Stock', icon: '🏗️', path: '/store/raw-materials' },
        { label: 'Chat', icon: '💬', path: '/chat', badge: true },
    ],
    manufacturing_manager: [
        { label: 'Dashboard', icon: '🏭', path: '/manufacturing' },
        { label: 'RM Stock', icon: '🏗️', path: '/store/raw-materials' },
        { label: 'Chat', icon: '💬', path: '/chat', badge: true },
    ],
    admin: [
        { label: 'Admin', icon: '📊', path: '/dashboard' },
        { label: 'Notif', icon: '🔔', path: '/admin/notifications' },
        { label: 'Users', icon: '👤', path: '/admin/users' },
        { label: 'Approvals', icon: '⚖️', path: '/admin/approvals' },
        { label: 'Chat', icon: '💬', path: '/chat', badge: true },
    ],
    super_admin: [
        { label: 'Admin', icon: '📊', path: '/dashboard' },
        { label: 'Notif', icon: '🔔', path: '/admin/notifications' },
        { label: 'Users', icon: '👤', path: '/admin/users' },
        { label: 'Reports', icon: '📊', path: '/reports' },
        { label: 'Chat', icon: '💬', path: '/chat', badge: true },
    ],
};

export default function BottomNav() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const [chatUnread, setChatUnread] = useState(0);

    // Poll localStorage for unread count (updated by Chat.jsx)
    useEffect(() => {
        const read = () => setChatUnread(parseInt(localStorage.getItem('chat_unreadCount') || '0'));
        read();
        const t = setInterval(read, 5000);
        return () => clearInterval(t);
    }, []);

    const items = NAV_CONFIG[user?.role] || [];

    return (
        <nav className="bottom-nav">
            {items.map((item) => (
                <button
                    key={item.path}
                    className={`nav-item ${pathname.startsWith(item.path) && item.path !== '/' ? 'active' : ''}`}
                    onClick={() => navigate(item.path)}
                >
                    <span className="relative text-xl leading-none inline-block">
                        {item.icon}
                        {item.badge && chatUnread > 0 && !pathname.startsWith(item.path) && (
                            <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
                                {chatUnread > 99 ? '99+' : chatUnread}
                            </span>
                        )}
                    </span>
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
