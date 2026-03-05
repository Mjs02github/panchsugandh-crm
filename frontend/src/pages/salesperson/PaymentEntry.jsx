import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api';
import BottomNav from '../../components/BottomNav';

export default function PaymentEntry() {
    const navigate = useNavigate();
    const [balances, setBalances] = useState([]);
    const [selectedArea, setSelectedArea] = useState('');
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState({
        order_id: '', retailer_id: '', collection_date: new Date().toISOString().slice(0, 10),
        amount: '', mode: 'CASH', reference_no: '', remarks: '',
    });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const loadBalances = () => {
        setLoading(true);
        api.get('/payments/retailer-balances')
            .then(r => setBalances(r.data))
            .catch(() => setBalances([]))
            .finally(() => setLoading(false));
    };

    useEffect(() => { loadBalances(); }, []);

    const uniqueAreas = [...new Set(balances.map(b => b.area_name).filter(Boolean))].sort();
    const filtered = selectedArea ? balances.filter(b => b.area_name === selectedArea) : balances;

    const selectOrder = (orderId) => {
        const b = balances.find(b => String(b.order_id) === String(orderId));
        setForm(f => ({
            ...f,
            order_id: orderId,
            retailer_id: b?.retailer_id || '',
            amount: b ? String(parseFloat(b.outstanding_amount).toFixed(2)) : '',
        }));
    };

    const selectedBalance = balances.find(b => String(b.order_id) === String(form.order_id));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (!form.order_id) return setError('Please select an order.');
        if (!form.amount || parseFloat(form.amount) <= 0) return setError('Please enter a valid amount.');
        setSubmitting(true);
        try {
            await api.post('/payments', form);
            setSuccess('✅ Payment recorded successfully!');
            setForm(f => ({ ...f, order_id: '', retailer_id: '', amount: '' }));
            loadBalances();
            setTimeout(() => setSuccess(''), 4000);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to record payment.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="pb-24">
            <div className="page-header">
                <button onClick={() => navigate(-1)} className="text-gray-500 text-xl">←</button>
                <h1 className="text-lg font-semibold flex-1">Payment Collection</h1>
                <span className="text-xs bg-red-100 text-red-700 px-2.5 py-1 rounded-full font-semibold">
                    {filtered.length} pending
                </span>
            </div>

            <form onSubmit={handleSubmit} className="px-4 py-4 space-y-4">
                {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">{error}</div>}
                {success && <div className="p-3 bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl">{success}</div>}

                {/* Area Filter */}
                <div>
                    <label className="label">Filter by Area</label>
                    <select className="input" value={selectedArea} onChange={e => {
                        setSelectedArea(e.target.value);
                        setForm(f => ({ ...f, order_id: '', retailer_id: '', amount: '' }));
                    }}>
                        <option value="">All Areas</option>
                        {uniqueAreas.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                </div>

                {/* Order Selector */}
                <div>
                    <label className="label">Select Billed Order *</label>
                    {loading ? (
                        <p className="text-sm text-gray-400 py-2">Loading outstanding orders…</p>
                    ) : filtered.length === 0 ? (
                        <div className="p-4 text-center text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                            <p className="text-2xl mb-1">🎉</p>
                            <p className="text-sm font-medium">No outstanding payments!</p>
                            <p className="text-xs mt-1">All billed orders are fully collected.</p>
                        </div>
                    ) : (
                        <select className="input" value={form.order_id} onChange={e => selectOrder(e.target.value)} required>
                            <option value="">Choose order…</option>
                            {filtered.map(b => (
                                <option key={b.order_id} value={b.order_id}>
                                    {b.order_number} — {b.retailer_name} — Due: ₹{parseFloat(b.outstanding_amount).toLocaleString('en-IN')}
                                </option>
                            ))}
                        </select>
                    )}
                </div>

                {/* Outstanding Balance Card */}
                {selectedBalance && (
                    <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-2xl p-4 space-y-2">
                        <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">Balance Summary</p>
                        <p className="font-bold text-gray-800">{selectedBalance.retailer_name}</p>
                        <p className="text-xs text-gray-500 font-mono">{selectedBalance.order_number} {selectedBalance.bill_number ? `• Bill: ${selectedBalance.bill_number}` : ''}</p>
                        <div className="grid grid-cols-3 gap-2 mt-2">
                            <div className="text-center">
                                <p className="text-[10px] text-gray-400">Billed</p>
                                <p className="text-sm font-bold text-gray-700">₹{parseFloat(selectedBalance.billed_amount).toLocaleString('en-IN')}</p>
                            </div>
                            <div className="text-center">
                                <p className="text-[10px] text-gray-400">Collected</p>
                                <p className="text-sm font-bold text-green-600">₹{parseFloat(selectedBalance.paid_amount).toLocaleString('en-IN')}</p>
                            </div>
                            <div className="text-center">
                                <p className="text-[10px] text-gray-400">Outstanding</p>
                                <p className="text-sm font-bold text-red-600">₹{parseFloat(selectedBalance.outstanding_amount).toLocaleString('en-IN')}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Amount */}
                <div>
                    <label className="label">Amount Collected (₹) *</label>
                    <input type="number" step="0.01" min="0.01" className="input text-xl font-bold text-brand-700"
                        value={form.amount}
                        onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                        placeholder="0.00" required />
                    {selectedBalance && parseFloat(form.amount) > parseFloat(selectedBalance.outstanding_amount) && (
                        <p className="text-xs text-orange-500 mt-1">⚠️ Amount exceeds outstanding balance</p>
                    )}
                </div>

                {/* Collection Date */}
                <div>
                    <label className="label">Collection Date</label>
                    <input type="date" className="input" value={form.collection_date}
                        onChange={e => setForm(f => ({ ...f, collection_date: e.target.value }))} required />
                </div>

                {/* Payment Mode */}
                <div>
                    <label className="label">Payment Mode *</label>
                    <div className="grid grid-cols-3 gap-2">
                        {['CASH', 'CHEQUE', 'UPI', 'NEFT', 'CREDIT'].map(m => (
                            <button key={m} type="button"
                                className={`py-2.5 rounded-xl text-sm font-medium border-2 transition-all ${form.mode === m
                                    ? 'border-brand-600 bg-brand-50 text-brand-700'
                                    : 'border-gray-200 text-gray-600'}`}
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
                        onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))}
                        placeholder="Optional remarks…" />
                </div>

                <button type="submit" className="btn-primary" disabled={submitting || !form.order_id}>
                    {submitting ? 'Saving…' : '💾 Save Payment'}
                </button>
            </form>
            <BottomNav />
        </div>
    );
}
