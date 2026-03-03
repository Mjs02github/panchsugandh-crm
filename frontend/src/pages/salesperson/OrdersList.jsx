import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';
import BottomNav from '../../components/BottomNav';

function StatusBadge({ status }) {
    const cls = {
        PENDING: 'status-pending',
        BILLED: 'status-billed',
        DELIVERED: 'status-delivered',
        CANCELLED: 'status-cancelled',
    };
    return <span className={cls[status] || 'status-pending'}>{status}</span>;
}

export default function OrdersList() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');

    const isSalesperson = user?.role === 'salesperson';

    const load = (status = '') => {
        setLoading(true);
        api.get('/orders', { params: status ? { status } : {} })
            .then(r => setOrders(r.data))
            .catch(() => { })
            .finally(() => setLoading(false));
    };

    useEffect(() => { load(filter); }, [filter]);

    return (
        <div className="pb-24">
            <div className="page-header">
                <h1 className="text-lg font-semibold flex-1">{isSalesperson ? 'My Orders' : 'All Orders'}</h1>
                <select className="text-sm border border-gray-200 rounded-lg px-2 py-1 text-gray-600"
                    value={filter} onChange={e => setFilter(e.target.value)}>
                    <option value="">All Status</option>
                    <option value="PENDING">Pending</option>
                    <option value="BILLED">Billed</option>
                    <option value="DELIVERED">Delivered</option>
                </select>
            </div>

            <div className="px-4 py-3 space-y-3">
                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : orders.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                        <div className="text-5xl mb-3">📋</div>
                        <p>No orders found</p>
                    </div>
                ) : orders.map(o => (
                    <div key={o.id} className="card" onClick={() => navigate(`/orders/${o.id}`)}>
                        <div className="flex items-start justify-between mb-2">
                            <div>
                                <p className="font-semibold text-gray-800 text-sm">{o.retailer_name}</p>
                                <p className="text-xs text-gray-500">{o.area_name || 'No area'}</p>
                            </div>
                            <StatusBadge status={o.status} />
                        </div>
                        <div className="flex items-end justify-between mt-2">
                            <div>
                                <p className="text-xs text-gray-500 font-mono">{o.order_number}</p>
                                <p className="text-xs text-gray-400">{o.order_date}</p>
                                {!isSalesperson && <p className="text-[10px] text-gray-400 mt-0.5">By {o.salesperson_name}</p>}
                            </div>
                            <div className="text-right flex flex-col items-end">
                                <p className="text-lg font-bold text-brand-700 leading-none">₹{parseFloat(o.total_amount).toLocaleString('en-IN')}</p>
                                <Link to={`/orders/${o.id}`} className="text-xs text-brand-600 font-medium underline mt-1" onClick={e => e.stopPropagation()}>View Details</Link>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            <BottomNav />
        </div>
    );
}
