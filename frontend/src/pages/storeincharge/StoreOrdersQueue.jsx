import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api';

export default function StoreOrdersQueue() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(null);
    const [activeTab, setActiveTab] = useState('BILLED');

    const fetchOrders = () => {
        setLoading(true);
        api.get('/orders')
            .then(res => setOrders(res.data.orders || []))
            .catch(err => console.error('Failed to load orders', err))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchOrders();
    }, []);

    const markReadyToShip = async (id) => {
        if (!window.confirm('Mark this order as Ready to Ship?')) return;
        setActionLoading(id);
        try {
            await api.patch(`/orders/${id}/ready_to_ship`);
            fetchOrders();
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to update status');
        } finally {
            setActionLoading(null);
        }
    };

    const displayOrders = orders.filter(o => o.status === activeTab);

    return (
        <div className="pb-24">
            <header className="page-header sticky top-[60px] bg-white shadow-sm z-10 px-4 py-3 border-b flex justify-between items-center">
                <div>
                    <h1 className="text-xl font-bold text-gray-800">Store Orders</h1>
                    <p className="text-xs text-gray-500">Prepare and pack orders for delivery</p>
                </div>
            </header>

            <div className="flex bg-white border-b px-2 pt-2 sticky top-[132px] z-10">
                {['BILLED', 'READY_TO_SHIP'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`flex-1 text-sm font-medium py-3 text-center border-b-2 transition-colors ${activeTab === tab ? 'border-brand-500 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        {tab === 'BILLED' ? 'To Pack' : 'Ready'} ({orders.filter(o => o.status === tab).length})
                    </button>
                ))}
            </div>

            <main className="p-4 space-y-4">
                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : displayOrders.length === 0 ? (
                    <div className="text-center py-12 text-gray-500 bg-white rounded-xl shadow-sm border border-gray-100">
                        <span className="text-4xl block mb-2">📦</span>
                        <p>No {activeTab} orders at the moment.</p>
                    </div>
                ) : (
                    displayOrders.map(order => (
                        <div key={order.id} className="card p-4 space-y-3">
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-gray-800">{order.retailer_name}</h3>
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider ${order.status === 'READY_TO_SHIP' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                                            }`}>
                                            {order.status.replace(/_/g, ' ')}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">{order.area_name}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-gray-500">{new Date(order.created_at).toLocaleDateString()}</p>
                                    <p className="font-bold text-brand-600 mt-0.5">₹{(order.total_amount || 0).toLocaleString('en-IN')}</p>
                                </div>
                            </div>

                            <div className="pt-2 border-t mt-2 flex justify-between items-center">
                                <Link to={`/orders/${order.id}`} className="text-sm font-medium text-brand-600 hover:text-brand-700 transition">
                                    View Details →
                                </Link>

                                {activeTab === 'BILLED' && (
                                    <button
                                        onClick={() => markReadyToShip(order.id)}
                                        disabled={actionLoading === order.id}
                                        className="btn-primary py-1.5 px-3 text-sm flex items-center gap-2"
                                    >
                                        {actionLoading === order.id ? (
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        ) : '📦 Mark Ready'}
                                    </button>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </main>
        </div>
    );
}
