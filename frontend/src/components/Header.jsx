import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';

const ROLE_LABELS = {
    super_admin: 'Super Admin',
    admin: 'Admin',
    sales_officer: 'Sales Officer',
    salesperson: 'Salesperson',
    bill_operator: 'Bill Operator',
    delivery_incharge: 'Delivery In-charge',
    store_incharge: 'Store In-charge',
};

export default function Header() {
    const { user, logout } = useAuth();
    if (!user) return null;

    return (
        <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 shadow-sm max-w-[480px] mx-auto">
            <div className="flex items-center justify-between px-4 py-2">

                {/* Logo & Company Name */}
                <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-brand-50 border border-brand-100 flex items-center justify-center shrink-0">
                        {/* Replace this with an actual logo image in public/assets/images */}
                        <img
                            src="assets/images/logo.jpeg"
                            alt="Logo"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                                e.target.onerror = null;
                                // Fallback icon if logo.jpeg is missing or fails to load
                                e.target.outerHTML = '<div class="text-brand-600 font-bold text-xl">P</div>';
                            }}
                        />
                    </div>
                    <div className="flex flex-col">
                        <span className="font-bold text-gray-800 leading-tight">Panchsugandh</span>
                        <span className="text-[10px] uppercase tracking-wider text-brand-600 font-semibold">{ROLE_LABELS[user.role] || 'Staff'}</span>
                    </div>
                </div>

                {/* Profile & Notifications */}
                <div className="flex items-center gap-3">
                    <NotificationBell />
                    <div className="flex flex-col items-end border-l pl-3 border-gray-100">
                        <span className="text-sm font-semibold text-gray-700">{user.name?.split(' ')[0]}</span>
                        <button
                            onClick={logout}
                            className="text-[10px] text-gray-500 hover:text-red-600 font-medium transition-colors"
                        >
                            Logout →
                        </button>
                    </div>
                </div>
            </div>
        </header>
    );
}
