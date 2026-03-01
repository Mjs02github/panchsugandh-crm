import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import BottomNav from '../components/BottomNav';

const ROLE_LABELS = {
    super_admin: 'Super Admin',
    admin: 'Admin',
    sales_officer: 'Sales Officer',
    salesperson: 'Salesperson',
    bill_operator: 'Bill Operator',
    delivery_incharge: 'Delivery In-charge',
    store_incharge: 'Store In-charge',
};

function StatCard({ label, value, icon, color = 'brand' }) {
    const colors = {
        brand: 'from-brand-500 to-brand-600',
        blue: 'from-blue-500 to-blue-600',
        green: 'from-green-500 to-green-600',
        purple: 'from-purple-500 to-purple-600',
        yellow: 'from-yellow-400 to-yellow-500',
        red: 'from-red-500 to-red-600',
    };
    return (
        <div className={`rounded-2xl p-4 bg-gradient-to-br ${colors[color]} text-white shadow-md`}>
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-white/80 text-xs font-medium">{label}</p>
                    <p className="text-2xl font-bold mt-1">{value ?? '—'}</p>
                </div>
                <span className="text-3xl opacity-90">{icon}</span>
            </div>
        </div>
    );
}

export default function Dashboard() {
    const { user, logout } = useAuth();
    const [stats, setStats] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/dashboard/stats')
            .then(r => setStats(r.data.stats || {}))
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' });

    const renderStats = () => {
        const { role } = user;
        if (loading) return (
            <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );

        if (['super_admin', 'admin'].includes(role)) return (
            <div className="grid grid-cols-2 gap-3">
                <StatCard label="Today's Orders" value={stats.today_orders} icon="📋" color="brand" />
                <StatCard label="Today Revenue" value={`₹${(stats.today_revenue || 0).toLocaleString('en-IN')}`} icon="💰" color="green" />
                <StatCard label="MTD Revenue" value={`₹${(stats.mtd_revenue || 0).toLocaleString('en-IN')}`} icon="📈" color="blue" />
                <StatCard label="Pending Bills" value={stats.pending} icon="🟡" color="yellow" />
                <StatCard label="Billed" value={stats.billed} icon="🔵" color="purple" />
                <StatCard label="Delivered" value={stats.delivered} icon="✅" color="green" />
                <StatCard label="Total Retailers" value={stats.total_retailers} icon="🏪" color="brand" />
                <StatCard label="Active Users" value={stats.total_users} icon="👥" color="blue" />
            </div>
        );

        if (role === 'salesperson') return (
            <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                    <StatCard label="Today's Orders" value={stats.today_orders} icon="📋" color="brand" />
                    <StatCard label="Today Visits" value={stats.today_visits} icon="🗺️" color="blue" />
                </div>
                <StatCard label="MTD Revenue" value={`₹${(stats.mtd_revenue || 0).toLocaleString('en-IN')}`} icon="💰" color="green" />
                {stats.target && (
                    <div className="card">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium text-gray-700">Monthly Target</span>
                            <span className="text-sm font-bold text-brand-600">
                                {(((stats.target.achieved_amount || 0) / Math.max(stats.target.target_amount, 1)) * 100).toFixed(1)}%
                            </span>
                        </div>
                        <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-brand-500 to-green-500 rounded-full transition-all"
                                style={{ width: `${Math.min(100, (stats.target.achieved_amount / Math.max(stats.target.target_amount, 1)) * 100)}%` }}
                            />
                        </div>
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                            <span>₹{(stats.target.achieved_amount || 0).toLocaleString('en-IN')}</span>
                            <span>₹{(stats.target.target_amount || 0).toLocaleString('en-IN')}</span>
                        </div>
                    </div>
                )}
            </div>
        );

        if (role === 'bill_operator') return (
            <StatCard label="Orders Awaiting Billing" value={stats.pending_billing} icon="📄" color="yellow" />
        );

        if (role === 'delivery_incharge') return (
            <StatCard label="Pending Deliveries" value={stats.pending_delivery} icon="🚚" color="blue" />
        );

        if (role === 'store_incharge') return (
            <div className="grid grid-cols-2 gap-3">
                <StatCard label="Total Retailers" value={stats.total_retailers} icon="🏪" color="brand" />
                <StatCard label="Low Stock Items" value={stats.low_stock_products} icon="⚠️" color="red" />
            </div>
        );

        if (role === 'sales_officer') return (
            <div className="grid grid-cols-2 gap-3">
                <StatCard label="Team Size" value={stats.team_size} icon="👥" color="brand" />
                <StatCard label="Team Orders" value={stats.total_orders} icon="📋" color="blue" />
                <div className="col-span-2">
                    <StatCard label="Team Revenue" value={`₹${(stats.team_revenue || 0).toLocaleString('en-IN')}`} icon="💰" color="green" />
                </div>
            </div>
        );

        return <p className="text-gray-500 text-center">No stats available.</p>;
    };

    return (
        <div className="pb-24">
            {/* Header */}
            <div className="bg-gradient-to-r from-brand-600 to-brand-700 px-4 pt-8 pb-6">
                <div className="flex items-center justify-between mb-1">
                    <div>
                        <p className="text-brand-200 text-xs">{ROLE_LABELS[user?.role]}</p>
                        <h1 className="text-white text-xl font-bold">Hello, {user?.name?.split(' ')[0]} 👋</h1>
                        <p className="text-brand-200 text-xs mt-0.5">{today}</p>
                    </div>
                    <button onClick={logout} className="text-white/80 hover:text-white text-sm px-3 py-1 border border-white/30 rounded-xl">
                        Logout
                    </button>
                </div>
            </div>

            <div className="px-4 -mt-2 pt-4 space-y-4">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Overview</h2>
                {renderStats()}
            </div>

            <BottomNav />
        </div>
    );
}
