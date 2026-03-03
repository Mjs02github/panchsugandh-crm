import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api';
import BottomNav from '../../components/BottomNav';

export default function BillingQueue() {
    const [orders, setOrders] = useState([]);
    const [selected, setSelected] = useState(null);
    const [billNum, setBillNum] = useState('');
    const [billDate, setBillDate] = useState(new Date().toISOString().slice(0, 10));
    const [finalAmount, setFinalAmount] = useState('');
    const [orderItems, setOrderItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const load = () => {
        setLoading(true);
        api.get('/orders', { params: { status: 'PENDING' } })
            .then(r => setOrders(r.data))
            .finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, []);

    const handleSelectOrder = async (order) => {
        setSelected(order.id);
        setSuccess('');
        setError('');
        setFinalAmount(order.total_amount);
        setBillNum('');
        setOrderItems([]);

        setLoadingDetails(true);
        try {
            const res = await api.get(`/orders/${order.id}`);
            setOrderItems(res.data.items || []);
        } catch (err) {
            setError('Failed to load order items.');
        } finally {
            setLoadingDetails(false);
        }
    };

    const handleBill = async (orderId) => {
        if (!billNum.trim()) return setError('Bill number is required.');
        setSubmitting(true);
        setError('');
        try {
            await api.patch(`/orders/${orderId}/bill`, { bill_number: billNum, bill_date: billDate, final_amount: finalAmount });
            setSuccess('Order marked as BILLED!');
            setSelected(null);
            setBillNum('');
            setOrderItems([]);
            load();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to update.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="pb-24">
            <div className="page-header">
                <h1 className="text-lg font-semibold">Billing Queue</h1>
                <span className="text-xs bg-yellow-100 text-yellow-800 px-2.5 py-1 rounded-full font-medium">
                    {orders.length} pending
                </span>
            </div>

            <div className="px-4 py-3 space-y-3">
                {success && <div className="p-3 bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl">{success}</div>}
                {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">{error}</div>}

                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : orders.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                        <div className="text-5xl mb-3">✅</div>
                        <p>No orders pending billing</p>
                    </div>
                ) : orders.map(o => (
                    <div key={o.id} className="card">
                        <div className="flex items-start justify-between mb-2">
                            <div>
                                <p className="font-semibold text-gray-800">{o.retailer_name}</p>
                                <p className="text-xs text-gray-500">{o.area_name} • {o.salesperson_name}</p>
                                <p className="text-xs font-mono text-gray-400 mt-0.5">{o.order_number} • {o.order_date}</p>
                            </div>
                            <div className="text-right flex flex-col items-end">
                                <p className="font-bold text-brand-700">₹{parseFloat(o.total_amount).toLocaleString('en-IN')}</p>
                                <Link to={`/orders/${o.id}`} className="text-xs text-brand-600 font-medium underline mt-1 whitespace-nowrap">View Details</Link>
                            </div>
                        </div>

                        {selected === o.id ? (
                            <div className="mt-3 space-y-3 border-t border-gray-100 pt-3">
                                {/* Ordered Items Display */}
                                <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
                                    <h3 className="text-xs font-bold text-gray-700 mb-2">Ordered Items</h3>
                                    {loadingDetails ? (
                                        <p className="text-xs text-gray-400">Loading items...</p>
                                    ) : orderItems.length > 0 ? (
                                        <div className="space-y-1.5">
                                            {orderItems.map((item, i) => (
                                                <div key={i} className="flex justify-between text-xs">
                                                    <span className="text-gray-800 flex-1 truncate pr-2">
                                                        {item.qty_ordered}x {item.product_name}
                                                    </span>
                                                    <span className="text-gray-600 font-medium">₹{parseFloat(item.line_amount).toLocaleString('en-IN')}</span>
                                                </div>
                                            ))}
                                            <div className="flex justify-between text-xs font-bold text-gray-800 pt-1.5 border-t border-gray-200 mt-1.5">
                                                <span>Total</span>
                                                <span>₹{parseFloat(o.total_amount).toLocaleString('en-IN')}</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-xs text-red-500">Failed to load items or no items found.</p>
                                    )}
                                </div>

                                <div>
                                    <label className="label text-xs">Final Billed Amount (₹) *</label>
                                    <input type="number" step="0.01" className="input font-bold text-brand-700" value={finalAmount}
                                        onChange={e => setFinalAmount(e.target.value)} required />
                                    <p className="text-[10px] text-gray-400 mt-1">This amount overrides the salesman estimate for payment collections.</p>
                                </div>
                                <div>
                                    <label className="label text-xs">Bill Number *</label>
                                    <input type="text" className="input" value={billNum}
                                        onChange={e => setBillNum(e.target.value)} placeholder="e.g. INV-2026-001" required />
                                </div>
                                <div>
                                    <label className="label text-xs">Bill Date</label>
                                    <input type="date" className="input" value={billDate}
                                        onChange={e => setBillDate(e.target.value)} />
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => handleBill(o.id)} disabled={submitting || loadingDetails}
                                        className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50">
                                        {submitting ? 'Saving…' : '✅ Confirm Bill'}
                                    </button>
                                    <button onClick={() => setSelected(null)}
                                        className="flex-1 py-2.5 border border-gray-300 text-gray-600 rounded-xl text-sm font-semibold">
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <button onClick={() => handleSelectOrder(o)}
                                className="mt-2 w-full py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold">
                                Mark as Billed
                            </button>
                        )}
                    </div>
                ))}
            </div>
            <BottomNav />
        </div>
    );
}
