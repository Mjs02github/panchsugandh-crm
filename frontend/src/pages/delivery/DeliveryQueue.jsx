import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api';
import BottomNav from '../../components/BottomNav';

export default function DeliveryQueue() {
    const [orders, setOrders] = useState([]);
    const [selected, setSelected] = useState(null);
    const [remark, setRemark] = useState('');
    const [delivDate, setDelivDate] = useState(new Date().toISOString().slice(0, 10));
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const REMARK_PRESETS = [
        'Handed to owner',
        'Handed to staff',
        'Left at shop',
        'Shop closed - will retry',
        'Partial delivery',
    ];

    const load = () => {
        setLoading(true);
        api.get('/delivery')
            .then(r => setOrders(r.data))
            .finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, []);

    const handleDeliver = async (orderId) => {
        setError('');
        // Mandatory remark validation
        if (!remark.trim()) {
            return setError('⚠️ Delivery remark is required. Please describe the delivery outcome.');
        }
        setSubmitting(true);
        try {
            await api.patch(`/orders/${orderId}/deliver`, {
                delivery_remark: remark.trim(),
                delivery_date: delivDate,
            });
            setSuccess('Delivery marked as COMPLETED!');
            setSelected(null);
            setRemark('');
            load();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to update delivery.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="pb-24">
            <div className="page-header">
                <h1 className="text-lg font-semibold">Delivery Queue</h1>
                <span className="text-xs bg-blue-100 text-blue-800 px-2.5 py-1 rounded-full font-medium">
                    {orders.length} billed
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
                        <div className="text-5xl mb-3">🚚</div>
                        <p>No pending deliveries</p>
                    </div>
                ) : orders.map(o => (
                    <div key={o.id} className="card">
                        <div className="flex items-start justify-between mb-1">
                            <div>
                                <p className="font-semibold text-gray-800">{o.retailer_name}</p>
                                <p className="text-xs text-gray-500">{o.area_name}</p>
                                <p className="text-xs text-gray-400 mt-0.5">{o.retailer_address}</p>
                            </div>
                            <div className="text-right flex flex-col items-end">
                                <p className="font-bold text-brand-700 text-sm">₹{parseFloat(o.total_amount).toLocaleString('en-IN')}</p>
                                <p className="text-xs text-gray-400">{o.bill_number}</p>
                                <Link to={`/orders/${o.id}`} className="text-xs text-brand-600 font-medium underline mt-1">View Details</Link>
                            </div>
                        </div>
                        <div className="text-xs text-gray-500 flex items-center gap-2 mt-1 mb-2">
                            <span>📞 {o.retailer_phone}</span>
                            <span>•</span>
                            <span>By {o.salesperson_name}</span>
                        </div>

                        {selected === o.id ? (
                            <div className="border-t border-gray-100 pt-3 space-y-3">
                                <div>
                                    <label className="label text-xs">
                                        Delivery Date
                                    </label>
                                    <input type="date" className="input" value={delivDate}
                                        onChange={e => setDelivDate(e.target.value)} />
                                </div>

                                {/* Quick presets */}
                                <div>
                                    <label className="label text-xs">
                                        Delivery Remark <span className="text-red-500">* Required</span>
                                    </label>
                                    <div className="flex flex-wrap gap-1.5 mb-2">
                                        {REMARK_PRESETS.map(p => (
                                            <button key={p} type="button"
                                                className={`text-xs px-2.5 py-1 rounded-full border transition-all ${remark === p ? 'bg-brand-100 border-brand-400 text-brand-700' : 'border-gray-200 text-gray-600'
                                                    }`}
                                                onClick={() => setRemark(p)}>
                                                {p}
                                            </button>
                                        ))}
                                    </div>
                                    <textarea className="input" rows="2" value={remark}
                                        onChange={e => setRemark(e.target.value)}
                                        placeholder="Or type a custom remark… (Required)" />
                                </div>

                                <div className="flex gap-2">
                                    <button onClick={() => handleDeliver(o.id)} disabled={submitting}
                                        className="flex-1 py-2.5 bg-green-600 text-white rounded-xl text-sm font-semibold">
                                        {submitting ? 'Saving…' : '✅ Mark Delivered'}
                                    </button>
                                    <button onClick={() => { setSelected(null); setRemark(''); setError(''); }}
                                        className="flex-1 py-2.5 border border-gray-300 text-gray-600 rounded-xl text-sm font-semibold">
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <button onClick={() => { setSelected(o.id); setSuccess(''); setError(''); }}
                                className="mt-2 w-full py-2.5 bg-green-600 text-white rounded-xl text-sm font-semibold">
                                🚚 Mark Delivery
                            </button>
                        )}
                    </div>
                ))}
            </div>
            <BottomNav />
        </div>
    );
}
