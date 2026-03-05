import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api';
import BottomNav from '../../components/BottomNav';

export default function StoreOrdersQueue() {
    const [orders, setOrders] = useState([]);
    const [deliveryUsers, setDeliveryUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(null);
    const [activeTab, setActiveTab] = useState('BILLED');
    const [assigningOrder, setAssigningOrder] = useState(null);
    const [selectedDeliveryPerson, setSelectedDeliveryPerson] = useState('');

    const fetchOrders = () => {
        setLoading(true);
        api.get('/orders')
            .then(res => setOrders(res.data.orders || []))
            .catch(err => console.error('Failed to load orders', err))
            .finally(() => setLoading(false));
    };

    const fetchDeliveryUsers = () => {
        api.get('/users').then(res => {
            const drivers = res.data.filter(u => u.role === 'delivery_incharge');
            setDeliveryUsers(drivers);
            if (drivers.length > 0) setSelectedDeliveryPerson(drivers[0].id);
        }).catch(err => console.error("Could not fetch delivery users", err));
    };

    useEffect(() => {
        fetchOrders();
        fetchDeliveryUsers();
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

    const handleAssignDelivery = async () => {
        if (!selectedDeliveryPerson) return alert("Select a delivery person first.");
        setActionLoading(assigningOrder);
        try {
            await api.post('/delivery/assign', {
                order_id: assigningOrder,
                delivery_person_id: selectedDeliveryPerson
            });
            alert("Order dispatched for delivery!");
            setAssigningOrder(null);
            fetchOrders();
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to assign delivery');
        } finally {
            setActionLoading(null);
        }
    }

    const displayOrders = orders.filter(o => o.status === activeTab);

    return (
        <div className="pb-24">
            <header className="page-header py-4 px-5 border-b shadow-sm flex justify-between items-center">
                <div>
                    <h1 className="text-xl font-bold text-gray-800">Store Orders</h1>
                    <p className="text-xs text-gray-500">Prepare and dispatch orders</p>
                </div>
            </header>

            <div className="flex bg-white border-b px-2 pt-2 sticky top-[0px] z-10 shadow-sm">
                {['BILLED', 'READY_TO_SHIP'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`flex-1 text-sm font-medium py-3 text-center border-b-2 transition-colors ${activeTab === tab ? 'border-brand-500 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        {tab === 'BILLED' ? 'To Pack' : 'Ready / Assign'} ({orders.filter(o => o.status === tab).length})
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
                                    <p className="text-[10px] text-gray-400 font-mono">#{order.order_number}</p>
                                    <p className="font-bold text-brand-600 mt-0.5">₹{(order.total_amount || 0).toLocaleString('en-IN')}</p>
                                </div>
                            </div>

                            {/* ASSIGNMENT UI FOR READY TO SHIP ORDERS */}
                            {activeTab === 'READY_TO_SHIP' && assigningOrder === order.id && (
                                <div className="p-3 bg-brand-50 rounded-xl border border-brand-100 mt-3 space-y-3">
                                    <label className="text-xs font-bold text-brand-800 uppercase tracking-wider">Select Delivery Person</label>
                                    <select
                                        className="input bg-white"
                                        value={selectedDeliveryPerson}
                                        onChange={(e) => setSelectedDeliveryPerson(e.target.value)}
                                    >
                                        <option value="">-- Choose Driver --</option>
                                        {deliveryUsers.map(u => (
                                            <option key={u.id} value={u.id}>{u.name}</option>
                                        ))}
                                    </select>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleAssignDelivery}
                                            disabled={actionLoading === order.id || !selectedDeliveryPerson}
                                            className="flex-1 bg-brand-600 text-white font-bold py-2 rounded-lg text-sm"
                                        >
                                            {actionLoading === order.id ? 'Assigning...' : 'Dispatch Now'}
                                        </button>
                                        <button
                                            onClick={() => setAssigningOrder(null)}
                                            className="px-4 bg-white border border-gray-300 text-gray-700 font-bold py-2 rounded-lg text-sm"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className="pt-3 border-t mt-2 flex justify-between items-center">
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

                                {activeTab === 'READY_TO_SHIP' && assigningOrder !== order.id && (
                                    <button
                                        onClick={() => setAssigningOrder(order.id)}
                                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 px-3 rounded-lg shadow-sm text-sm flex items-center gap-2 transition"
                                    >
                                        🚚 Assign Delivery
                                    </button>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </main>

            <BottomNav />
        </div>
    );
}
