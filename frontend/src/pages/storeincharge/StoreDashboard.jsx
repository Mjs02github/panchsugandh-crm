import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api';
import BottomNav from '../../components/BottomNav';

export default function StoreDashboard() {
    const [stats, setStats] = useState({ toPack: 0, lowStock: 0 });
    const [lowStockItems, setLowStockItems] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                // Fetch orders for To Pack count
                const ordersRes = await api.get('/orders');
                const toPackCount = (ordersRes.data.orders || []).filter(o => o.status === 'BILLED').length;

                // Fetch products for Low Stock count & alerts
                const productsRes = await api.get('/products');
                const products = productsRes.data || [];
                const lowStockList = products.filter(p => p.qty_on_hand < 10);

                setStats({
                    toPack: toPackCount,
                    lowStock: lowStockList.length
                });

                // Show up to 5 low stock items directly on dash
                setLowStockItems(lowStockList.slice(0, 5));
            } catch (err) {
                console.error("Dashboard fetch error", err);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    return (
        <div className="pb-24">
            <header className="page-header py-4 px-5 border-b shadow-sm">
                <h1 className="text-xl font-bold text-gray-800">Store Dashboard</h1>
                <p className="text-xs text-gray-500 mt-0.5">Welcome back! Here's your daily summary.</p>
            </header>

            <main className="p-4 space-y-5">
                {/* Stats Cards */}
                <div className="grid grid-cols-2 gap-3">
                    <Link to="/store/orders" className="bg-gradient-to-br from-brand-50 to-white p-4 rounded-2xl border border-brand-100 shadow-sm flex flex-col justify-between aspect-[4/3]">
                        <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center text-xl mb-2 shadow-inner">
                            📦
                        </div>
                        <div>
                            <p className="text-3xl font-black text-gray-800 tracking-tight leading-none mb-1">
                                {loading ? '-' : stats.toPack}
                            </p>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">To Pack</p>
                        </div>
                    </Link>

                    <Link to="/store/products" className="bg-gradient-to-br from-red-50 to-white p-4 rounded-2xl border border-red-100 shadow-sm flex flex-col justify-between aspect-[4/3]">
                        <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-xl mb-2 shadow-inner">
                            ⚠️
                        </div>
                        <div>
                            <p className="text-3xl font-black text-gray-800 tracking-tight leading-none mb-1">
                                {loading ? '-' : stats.lowStock}
                            </p>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Low Stock</p>
                        </div>
                    </Link>
                </div>

                {/* Low Stock Alerts */}
                {lowStockItems.length > 0 && (
                    <div className="bg-white rounded-2xl shadow-sm border border-red-100 overflow-hidden">
                        <div className="px-4 py-3 bg-red-50 border-b border-red-100 flex justify-between items-center">
                            <h2 className="text-sm font-bold text-red-800 flex items-center gap-1.5">
                                <span className="text-red-500">⭕</span> Re-Order Needed
                            </h2>
                            <Link to="/store/products" className="text-xs font-semibold text-red-600 hover:text-red-700">
                                View All →
                            </Link>
                        </div>
                        <div className="divide-y divide-gray-50">
                            {lowStockItems.map(item => (
                                <div key={item.id} className="p-4 flex items-center justify-between">
                                    <div>
                                        <p className="font-semibold text-gray-800 text-sm">{item.name}</p>
                                        <p className="text-[10px] text-gray-500 mt-0.5">{item.category} • SKU: {item.sku || 'N/A'}</p>
                                    </div>
                                    <div className="text-right">
                                        <span className="inline-block px-2.5 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-lg shadow-sm">
                                            {item.qty_on_hand} {item.unit}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Quick Actions */}
                <div className="mt-8">
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 px-1">Quick Actions</h3>
                    <div className="grid grid-cols-2 gap-3">
                        <Link to="/store/orders" className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl">🚚</div>
                            <span className="font-semibold text-sm text-gray-700">Pack Orders</span>
                        </Link>
                        <Link to="/store/inward" className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-green-50 text-green-600 flex items-center justify-center text-xl">📥</div>
                            <span className="font-semibold text-sm text-gray-700">Inward Stock</span>
                        </Link>
                    </div>
                </div>

            </main>
            <BottomNav />
        </div>
    );
}
