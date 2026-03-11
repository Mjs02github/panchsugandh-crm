import { useState, useEffect } from 'react';
import api from '../../api';
import { Truck, Users, Activity, Package, AlertTriangle, ArrowUpRight, History } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function ProcurementDashboard() {
    const [stats, setStats] = useState({
        totalVendors: 0,
        activeVendors: 0,
        potentialVendors: 0,
        lowStockRM: 0,
        recentPlans: []
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            const [vendorsRes, rmRes, plansRes] = await Promise.all([
                api.get('/procurement/vendors'),
                api.get('/store/raw-materials'),
                api.get('/procurement/plans')
            ]);

            const vendors = vendorsRes.data;
            const rm = rmRes.data;
            const plans = plansRes.data;

            setStats({
                totalVendors: vendors.length,
                activeVendors: vendors.filter(v => v.status === 'ACTIVE').length,
                potentialVendors: vendors.filter(v => v.status === 'POTENTIAL').length,
                lowStockRM: rm.filter(m => parseFloat(m.qty_on_hand) <= parseFloat(m.min_stock)).length,
                recentPlans: plans.slice(0, 5)
            });
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-10 text-center text-gray-400 italic">Initializing Dashboard...</div>;

    const cards = [
        { title: 'Total Vendors', value: stats.totalVendors, icon: <Users size={24} />, color: 'bg-blue-600', link: '/procurement/vendors' },
        { title: 'Active Suppliers', value: stats.activeVendors, icon: <Truck size={24} />, color: 'bg-green-600', link: '/procurement/vendors' },
        { title: 'Low Stock RM', value: stats.lowStockRM, icon: <AlertTriangle size={24} />, color: 'bg-red-600', link: '/store/raw-materials' },
        { title: 'Potential Vendors', value: stats.potentialVendors, icon: <Activity size={24} />, color: 'bg-orange-600', link: '/procurement/vendors' },
    ];

    return (
        <div className="p-4 sm:p-6 space-y-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Procurement Dashboard</h1>
                    <p className="text-gray-500 text-sm">Supply chain and material planning overview</p>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {cards.map((card, i) => (
                    <Link key={i} to={card.link} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-5 hover:shadow-md transition group">
                        <div className={`${card.color} p-3 rounded-xl text-white shadow-lg`}>
                            {card.icon}
                        </div>
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{card.title}</p>
                            <p className="text-2xl font-black text-gray-800 group-hover:text-indigo-600 transition">{card.value}</p>
                        </div>
                    </Link>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Actions */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 p-6 rounded-2xl shadow-xl text-white relative overflow-hidden">
                        <Package className="absolute right-[-20px] bottom-[-20px] opacity-10" size={160} />
                        <h2 className="text-xl font-bold mb-2">Material Planning</h2>
                        <p className="text-indigo-100 text-sm mb-6">Calculate raw material requirements for your next production target.</p>
                        <Link to="/procurement/planning" className="bg-white text-indigo-600 px-6 py-3 rounded-xl font-bold inline-flex items-center gap-2 hover:bg-indigo-50 transition shadow-lg">
                            Start Planning
                            <ArrowUpRight size={18} />
                        </Link>
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <h2 className="font-bold text-gray-800 mb-4">Quick Links</h2>
                        <div className="space-y-3">
                            <Link to="/procurement/vendors" className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 text-gray-600 group">
                                <span className="flex items-center gap-3">
                                    <Users size={18} className="text-indigo-500" />
                                    Vendor Directory
                                </span>
                                <ArrowUpRight size={16} className="opacity-0 group-hover:opacity-100 transition" />
                            </Link>
                            <Link to="/store/raw-materials" className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 text-gray-600 group">
                                <span className="flex items-center gap-3">
                                    <Package size={18} className="text-indigo-500" />
                                    Raw Material Stock
                                </span>
                                <ArrowUpRight size={16} className="opacity-0 group-hover:opacity-100 transition" />
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Recent Plans */}
                <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6 border-b border-gray-100 flex items-center gap-2">
                        <History size={20} className="text-indigo-600" />
                        <h2 className="font-bold text-gray-800">Recent Procurement Plans</h2>
                    </div>
                    <div className="divide-y divide-gray-50">
                        {stats.recentPlans.length === 0 ? (
                            <div className="p-10 text-center text-gray-400 italic">No plans calculated yet</div>
                        ) : stats.recentPlans.map(plan => (
                            <div key={plan.id} className="p-5 hover:bg-gray-50 transition group">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <p className="font-bold text-gray-800">Plan #{plan.id}</p>
                                        <p className="text-xs text-gray-400">{new Date(plan.created_at).toLocaleString()}</p>
                                    </div>
                                    <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">by {plan.creator_name}</span>
                                </div>
                                <div className="flex gap-2 flex-wrap">
                                    {JSON.parse(plan.target_data).map((t, idx) => (
                                        <span key={idx} className="text-[10px] font-bold bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full border border-indigo-100">
                                            {t.name} x{t.quantity}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
