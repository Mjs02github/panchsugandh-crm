import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api';
import BottomNav from '../../components/BottomNav';

export default function PaymentEntry() {
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);
    const [form, setForm] = useState({
        order_id: '', retailer_id: '', collection_date: new Date().toISOString().slice(0, 10),
        amount: '', mode: 'CASH', reference_no: '', remarks: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        api.get('/orders', { params: { status: 'BILLED' } }).then(r => setOrders(r.data));
    }, []);

    const selectOrder = (orderId) => {
        const o = orders.find(o => String(o.id) === String(orderId));
        setForm(f => ({ ...f, order_id: orderId, retailer_id: o?.retailer_id || '' }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (!form.order_id) return setError('Please select an order.');
        if (!form.amount || parseFloat(form.amount) <= 0) return setError('Please enter a valid amount.');
        setLoading(true);
        try {
            await api.post('/payments', form);
            setSuccess('Payment recorded successfully!');
            setTimeout(() => navigate('/orders'), 2000);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to record payment.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="pb-24">
            <div className="page-header">
                <button onClick={() => navigate(-1)} className="text-gray-500 text-xl">←</button>
                <h1 className="text-lg font-semibold">Record Payment</h1>
            </div>

            <form onSubmit={handleSubmit} className="px-4 py-4 space-y-4">
                {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">{error}</div>}
                {success && <div className="p-3 bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl">{success}</div>}

                <div>
                    <label className="label">Select Order (Billed)</label>
                    <select className="input" value={form.order_id} onChange={e => selectOrder(e.target.value)} required>
                        <option value="">Choose order…</option>
                        {orders.map(o => (
                            <option key={o.id} value={o.id}>
                                {o.order_number} — {o.retailer_name} (₹{parseFloat(o.total_amount).toLocaleString('en-IN')})
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="label">Collection Date</label>
                    <input type="date" className="input" value={form.collection_date}
                        onChange={e => setForm(f => ({ ...f, collection_date: e.target.value }))} required />
                </div>

                <div>
                    <label className="label">Amount Collected (₹) *</label>
                    <input type="number" step="0.01" min="1" className="input" value={form.amount}
                        onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" required />
                </div>

                <div>
                    <label className="label">Payment Mode *</label>
                    <div className="grid grid-cols-3 gap-2">
                        {['CASH', 'CHEQUE', 'UPI', 'NEFT', 'CREDIT'].map(m => (
                            <button key={m} type="button"
                                className={`py-2.5 rounded-xl text-sm font-medium border-2 transition-all ${form.mode === m
                                        ? 'border-brand-600 bg-brand-50 text-brand-700'
                                        : 'border-gray-200 text-gray-600'
                                    }`}
                                onClick={() => setForm(f => ({ ...f, mode: m }))}>
                                {m}
                            </button>
                        ))}
                    </div>
                </div>

                {['CHEQUE', 'UPI', 'NEFT'].includes(form.mode) && (
                    <div>
                        <label className="label">Reference / Cheque No.</label>
                        <input type="text" className="input" value={form.reference_no}
                            onChange={e => setForm(f => ({ ...f, reference_no: e.target.value }))}
                            placeholder="Enter reference number" />
                    </div>
                )}

                <div>
                    <label className="label">Remarks</label>
                    <textarea className="input" rows="2" value={form.remarks}
                        onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))} placeholder="Optional remarks…" />
                </div>

                <button type="submit" className="btn-primary" disabled={loading}>
                    {loading ? 'Saving…' : 'Save Payment'}
                </button>
            </form>
            <BottomNav />
        </div>
    );
}
