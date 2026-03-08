import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

// Exact same navbar logic mapped to the Desktop sidebar to ensure no missing features!
const NAV_CONFIG = {
    salesperson: [
        { label: 'Orders', icon: '📋', path: '/orders' },
        { label: 'New Order', icon: '➕', path: '/orders/new' },
        { label: 'Payments', icon: '💰', path: '/payments' },
        { label: 'Parties', icon: '🏪', path: '/store/retailers' },
        { label: 'Reports', icon: '📊', path: '/reports' },
        { label: 'Chat', icon: '💬', path: '/chat', badge: true },
    ],
    bill_operator: [
        { label: 'Queue', icon: '📄', path: '/billing' },
        { label: 'Samples', icon: '🎁', path: '/store/samples' },
        { label: 'Parties', icon: '🏪', path: '/store/retailers' },
        { label: 'Products', icon: '📦', path: '/store/products' },
        { label: 'Chat', icon: '💬', path: '/chat', badge: true },
    ],
    delivery_incharge: [
        { label: 'Pending', icon: '🚚', path: '/delivery' },
        { label: 'Done', icon: '✅', path: '/delivery/history' },
        { label: 'Chat', icon: '💬', path: '/chat', badge: true },
    ],
    store_incharge: [
        { label: 'Store Home', icon: '🏠', path: '/store' },
        { label: 'Production', icon: '⚙️', path: '/store/production' },
        { label: 'Raw Materials', icon: '🏗️', path: '/store/raw-materials' },
        { label: 'BOM', icon: '📜', path: '/store/bom' },
        { label: 'Samples', icon: '🎁', path: '/store/samples' },
        { label: 'Products', icon: '📦', path: '/store/products' },
        { label: 'Orders', icon: '📋', path: '/store/orders' },
        { label: 'Chat', icon: '💬', path: '/chat', badge: true },
    ],
    sales_officer: [
        { label: 'Team', icon: '👥', path: '/team' },
        { label: 'Orders', icon: '📋', path: '/orders' },
        { label: 'Reports', icon: '📊', path: '/reports' },
        { label: 'Chat', icon: '💬', path: '/chat', badge: true },
    ],
    admin: [
        { label: 'Dashboard', icon: '📊', path: '/dashboard' },
        { label: 'Orders', icon: '📋', path: '/orders' },
        { label: 'Store Management', icon: '🏬', path: '/store' },
        { label: 'Users', icon: '👤', path: '/admin/users' },
        { label: 'Tracking', icon: '📍', path: '/admin/tracking' },
        { label: 'Reports', icon: '📊', path: '/reports' },
        { label: 'Chat', icon: '💬', path: '/chat', badge: true },
    ],
    super_admin: [
        { label: 'Dashboard', icon: '📊', path: '/dashboard' },
        { label: 'Orders', icon: '📋', path: '/orders' },
        { label: 'Store Management', icon: '🏬', path: '/store' },
        { label: 'Users', icon: '👤', path: '/admin/users' },
        { label: 'Tracking', icon: '📍', path: '/admin/tracking' },
        { label: 'Reports', icon: '📊', path: '/reports' },
        { label: 'Chat', icon: '💬', path: '/chat', badge: true },
    ],
};

export default function DesktopLayout({ children }) {
    const { user, logout } = useAuth();
    const location = useLocation();
    const [chatUnread, setChatUnread] = useState(0);

    // Poll localStorage for unread count
    useEffect(() => {
        const read = () => setChatUnread(parseInt(localStorage.getItem('chat_unreadCount') || '0'));
        read();
        const t = setInterval(read, 5000);
        return () => clearInterval(t);
    }, []);

    const navItems = NAV_CONFIG[user?.role] || [];

    return (
        <div className="flex h-screen bg-gray-50 overflow-hidden relative">

            {/* Sidebar */}
            <aside className="w-64 bg-white border-r border-gray-200 flex flex-col shrink-0">
                <div className="h-16 flex items-center px-6 border-b border-gray-200 gap-3">
                    <div className="w-8 h-8 rounded-lg overflow-hidden bg-brand-50 border border-brand-100 flex items-center justify-center shrink-0">
                        <img
                            src="assets/images/logo.jpeg"
                            alt="Logo"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                                e.target.onerror = null;
                                // Fallback icon if logo.jpeg is missing
                                e.target.outerHTML = '<div class="text-brand-600 font-bold text-sm">P</div>';
                            }}
                        />
                    </div>
                    <h1 className="text-lg font-bold text-gray-800 truncate">Panchsugandh</h1>
                </div>

                <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
                    {navItems.map((item) => {
                        const isActive = location.pathname.startsWith(item.path) && item.path !== '/';
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive
                                    ? 'bg-brand-50 text-brand-700'
                                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                                    }`}
                            >
                                <span className="text-lg relative">
                                    {item.icon}
                                    {item.badge && chatUnread > 0 && !isActive && (
                                        <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
                                            {chatUnread > 99 ? '99+' : chatUnread}
                                        </span>
                                    )}
                                </span>
                                {item.label}
                            </Link>
                        );
                    })}
                </div>

                <div className="p-4 border-t border-gray-200">
                    <div className="flex items-center gap-3 mb-4 px-2">
                        <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center font-bold shrink-0">
                            {user?.name?.charAt(0) || 'U'}
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
                            <p className="text-[10px] text-gray-500 uppercase tracking-wider truncate">{user?.role?.replace('_', ' ')}</p>
                        </div>
                    </div>
                    <button
                        onClick={logout}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                    >
                        <span>🚪</span> Logout
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto w-full relative">
                <div className="p-4 md:p-6 pb-24 h-full">
                    {children}
                </div>
            </main>
        </div>
    );
}
