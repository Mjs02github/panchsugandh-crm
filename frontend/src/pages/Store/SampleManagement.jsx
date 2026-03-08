import { useState, useEffect } from 'react';
import api from '../../api';
import { useAuth } from '../../context/AuthContext';

export default function SampleManagement() {
    const { user } = useAuth();
    const [requests, setRequests] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showRequestModal, setShowRequestModal] = useState(false);
    const [availableBatches, setAvailableBatches] = useState([]);
    const [formData, setFormData] = useState({
        product_id: '',
        batch_number: '',
        mrp: '',
        quantity: '',
        reason: '',
        issued_to: '',
        request_date: new Date().toISOString().split('T')[0],
        notes: ''
    });

    const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

    useEffect(() => {
        fetchData();
    }, []);

    // Fetch batches when product changes
    useEffect(() => {
        if (formData.product_id) {
            fetchBatches(formData.product_id);
        } else {
            setAvailableBatches([]);
        }
    }, [formData.product_id]);

    const fetchData = async () => {
        try {
            const [rRes, pRes] = await Promise.all([
                api.get('/store/samples'),
                api.get('/products')
            ]);
            setRequests(rRes.data);
            setProducts(pRes.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchBatches = async (productId) => {
        try {
            const res = await api.get(`/store/inventory/product/${productId}/batches`);
            setAvailableBatches(res.data || []);
        } catch (err) {
            console.error("Error fetching batches", err);
        }
    };

    const handleRequest = async (e) => {
        e.preventDefault();
        try {
            await api.post('/store/samples', {
                ...formData,
                quantity: parseInt(formData.quantity),
                mrp: parseFloat(formData.mrp) || 0
            });
            setShowRequestModal(false);
            setFormData({
                product_id: '',
                batch_number: '',
                mrp: '',
                quantity: '',
                reason: '',
                issued_to: '',
                request_date: new Date().toISOString().split('T')[0],
                notes: ''
            });
            fetchData();
            alert('Sample request submitted for Admin approval.');
        } catch (err) {
            alert(err.response?.data?.error || 'Error submitting request');
        }
    };

    const handleAction = async (id, action) => {
        if (!window.confirm(`Are you sure you want to ${action} this request?`)) return;
        try {
            await api.patch(`/store/samples/${id}/${action}`);
            fetchData();
        } catch (err) {
            alert(err.response?.data?.error || `Error ${action}ing request`);
        }
    };

    const handlePrintSample = (sample) => {
        // We'll pass a special flag in the URL or state to indicate this is a sample invoice
        // For now, let's use a URL param that InvoiceTemplate can pick up
        const sampleData = encodeURIComponent(JSON.stringify({
            isSample: true,
            id: `SMP-${sample.id}`,
            party_name: sample.issued_to || "SAMPLE ISSUE",
            created_at: sample.approved_at || sample.created_at,
            items: [{
                product_name: sample.product_name,
                batch_number: sample.batch_number,
                mrp: sample.mrp,
                quantity: sample.quantity,
                rate: 0, // Zero value for samples
                amount: 0
            }],
            total_amount: 0,
            notes: `Reason: ${sample.reason}`
        }));
        window.open(`/invoice/print?data=${sampleData}`, '_blank');
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">Sample Issues & Requests</h1>
                    <p className="text-gray-500 text-sm">Free stock issuance tracking with Admin approval workflow.</p>
                </div>
                {user?.role === 'bill_operator' || isAdmin ? (
                    <button
                        onClick={() => setShowRequestModal(true)}
                        className="bg-brand-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-brand-700 transition-colors"
                    >
                        Request Sample
                    </button>
                ) : null}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Product & Batch</th>
                            <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Qty / MRP</th>
                            <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Recipient / Reason</th>
                            <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                            <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {loading ? (
                            <tr><td colSpan="5" className="text-center py-8">Loading requests...</td></tr>
                        ) : requests.length === 0 ? (
                            <tr><td colSpan="5" className="text-center py-8 text-gray-400">No sample requests found.</td></tr>
                        ) : (
                            requests.map(r => (
                                <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <p className="font-medium text-gray-900">{r.product_name}</p>
                                        <p className="text-[10px] text-brand-600 font-bold uppercase">Batch: {r.batch_number || 'DEFAULT'}</p>
                                        <p className="text-[10px] text-gray-400">Req By: {r.requester_name}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="text-gray-900 font-bold">{r.quantity} PCS</p>
                                        <p className="text-[10px] text-gray-400">MRP: ₹{r.mrp || 0}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="text-gray-900 font-medium text-sm">{r.issued_to || 'N/A'}</p>
                                        <p className="text-[11px] text-gray-500 italic">"{r.reason || '-'}"</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${r.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                                            r.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                                                'bg-yellow-100 text-yellow-700'
                                            }`}>
                                            {r.status}
                                        </span>
                                        {r.status === 'APPROVED' && (
                                            <p className="text-[9px] text-gray-400 mt-1">On {new Date(r.approved_at).toLocaleDateString()}</p>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            {r.status === 'APPROVED' && (
                                                <button
                                                    onClick={() => handlePrintSample(r)}
                                                    className="px-2 py-1 bg-brand-50 text-brand-600 border border-brand-200 text-[10px] font-bold rounded hover:bg-brand-100"
                                                >
                                                    Print Sample
                                                </button>
                                            )}
                                            {r.status === 'PENDING' && isAdmin ? (
                                                <>
                                                    <button
                                                        onClick={() => handleAction(r.id, 'approve')}
                                                        className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 font-bold"
                                                    >
                                                        Approve
                                                    </button>
                                                    <button
                                                        onClick={() => handleAction(r.id, 'reject')}
                                                        className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 font-bold"
                                                    >
                                                        Reject
                                                    </button>
                                                </>
                                            ) : (
                                                !r.status === 'APPROVED' && <span className="text-xs text-gray-300 italic">Historical</span>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Request Modal */}
            {showRequestModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-xl">
                        <header className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-gray-900 tracking-tight">Request Free Sample Issue</h2>
                            <button onClick={() => setShowRequestModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
                        </header>

                        <form onSubmit={handleRequest} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Product</label>
                                <select
                                    required value={formData.product_id}
                                    onChange={e => setFormData({ ...formData, product_id: e.target.value, batch_number: '', mrp: '' })}
                                    className="w-full border p-3 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none bg-gray-50"
                                >
                                    <option value="">-- Select Product --</option>
                                    {products.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Batch Number</label>
                                    <select
                                        required value={formData.batch_number}
                                        onChange={e => {
                                            const selectedBatch = availableBatches.find(b => b.batch_number === e.target.value);
                                            setFormData({
                                                ...formData,
                                                batch_number: e.target.value,
                                                mrp: selectedBatch?.mrp || ''
                                            });
                                        }}
                                        className="w-full border p-3 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none bg-gray-50 text-sm"
                                        disabled={!formData.product_id || availableBatches.length === 0}
                                    >
                                        <option value="">-- Select Batch --</option>
                                        {availableBatches.map(b => (
                                            <option key={b.batch_number} value={b.batch_number}>
                                                {b.batch_number} (Stock: {b.qty_on_hand})
                                            </option>
                                        ))}
                                    </select>
                                    {formData.product_id && availableBatches.length === 0 && (
                                        <p className="text-[10px] text-red-500 mt-1 font-bold">No stock available!</p>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">MRP (Auto)</label>
                                    <input
                                        type="number" readOnly value={formData.mrp}
                                        className="w-full border p-3 rounded-xl bg-gray-100 text-gray-500 cursor-not-allowed text-sm"
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Quantity</label>
                                    <input
                                        type="number" required value={formData.quantity}
                                        onChange={e => setFormData({ ...formData, quantity: e.target.value })}
                                        className="w-full border p-3 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none"
                                        placeholder="e.g. 5"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Request Date</label>
                                    <input
                                        type="date" required value={formData.request_date}
                                        onChange={e => setFormData({ ...formData, request_date: e.target.value })}
                                        className="w-full border p-3 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Issued To (Recipient Name)</label>
                                <input
                                    type="text" required value={formData.issued_to}
                                    onChange={e => setFormData({ ...formData, issued_to: e.target.value })}
                                    className="w-full border p-3 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none"
                                    placeholder="Party name or Person name"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Reason for Issue</label>
                                <input
                                    type="text" required value={formData.reason}
                                    onChange={e => setFormData({ ...formData, reason: e.target.value })}
                                    className="w-full border p-3 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none"
                                    placeholder="e.g. Sales Sample, Exhibition..."
                                />
                            </div>

                            <div className="flex gap-4 mt-8">
                                <button
                                    type="button"
                                    onClick={() => setShowRequestModal(false)}
                                    className="flex-1 px-4 py-3 border border-gray-200 text-gray-600 rounded-xl font-bold hover:bg-gray-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={!formData.batch_number}
                                    className={`flex-1 px-4 py-3 rounded-xl font-bold text-white transition-all shadow-lg ${!formData.batch_number ? 'bg-gray-300 cursor-not-allowed shadow-none' : 'bg-brand-600 hover:bg-brand-700 shadow-brand-100'
                                        }`}
                                >
                                    Submit Request
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
