import { useState, useEffect } from 'react';
import api from '../../api';
import BottomNav from '../../components/BottomNav';

export default function BillingQueue() {
    const [orders, setOrders] = useState([]);
    const [selected, setSelected] = useState(null);
    const [billNum, setBillNum] = useState('');
    const [billDate, setBillDate] = useState(new Date().toISOString().slice(0, 10));
    const [loading, setLoading] = useState(true);
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

    const handleBill = async (orderId) => {
        if (!billNum.trim()) return setError('Bill number is required.');
        setSubmitting(true);
        setError('');
        try {
            await api.patch(`/orders/${orderId}/bill`, { bill_number: billNum, bill_date: billDate });
            setSuccess('Order marked as BILLED!');
            setSelected(null);
            setBillNum('');
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
                                <p className="text-xs font-mono text-gray-400">{o.order_number} • {o.order_date}</p>
                            </div>
                            <p className="font-bold text-brand-700">₹{parseFloat(o.total_amount).toLocaleString('en-IN')}</p>
                        </div>

                        {selected === o.id ? (
                            <div className="mt-3 space-y-3 border-t border-gray-100 pt-3">
                                <div>
                                    <label className="label text-xs">Bill Number *</label>
                                    <input type="text" className="input" value={billNum}
                                        onChange={e => setBillNum(e.target.value)} placeholder="e.g. INV-2026-001" />
                                </div>
                                <div>
                                    <label className="label text-xs">Bill Date</label>
                                    <input type="date" className="input" value={billDate}
                                        onChange={e => setBillDate(e.target.value)} />
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => handleBill(o.id)} disabled={submitting}
                                        className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold">
                                        {submitting ? 'Saving…' : '✅ Confirm Bill'}
                                    </button>
                                    <button onClick={() => setSelected(null)}
                                        className="flex-1 py-2.5 border border-gray-300 text-gray-600 rounded-xl text-sm font-semibold">
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <button onClick={() => { setSelected(o.id); setSuccess(''); setError(''); }}
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
