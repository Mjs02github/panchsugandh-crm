import { useState, useEffect } from 'react';
import api from '../../api';
import { useAuth } from '../../context/AuthContext';

export default function SampleManagement() {
    const { user } = useAuth();
    const [requests, setRequests] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showRequestModal, setShowRequestModal] = useState(false);
    const [formData, setFormData] = useState({
        product_id: '',
        quantity: '',
        reason: '',
        request_date: new Date().toISOString().split('T')[0],
        notes: ''
    });

    const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

    useEffect(() => {
        fetchData();
    }, []);

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

    const handleRequest = async (e) => {
        e.preventDefault();
        try {
            await api.post('/store/samples', {
                ...formData,
                quantity: parseInt(formData.quantity)
            });
            setShowRequestModal(false);
            setFormData({
                product_id: '',
                quantity: '',
                reason: '',
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
                            <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Product</th>
                            <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Qty</th>
                            <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Requested By</th>
                            <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Reason</th>
                            <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                            <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {loading ? (
                            <tr><td colSpan="6" className="text-center py-8">Loading requests...</td></tr>
                        ) : requests.length === 0 ? (
                            <tr><td colSpan="6" className="text-center py-8 text-gray-400">No sample requests found.</td></tr>
                        ) : (
                            requests.map(r => (
                                <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <p className="font-medium text-gray-900">{r.product_name}</p>
                                        <p className="text-[10px] text-gray-400">Requested: {new Date(r.request_date).toLocaleDateString()}</p>
                                    </td>
                                    <td className="px-6 py-4 text-gray-900 font-bold">{r.quantity}</td>
                                    <td className="px-6 py-4 text-gray-600 text-sm">{r.requester_name}</td>
                                    <td className="px-6 py-4 text-gray-600 text-sm italic">"{r.reason || '-'}"</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${r.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                                                r.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                                                    'bg-yellow-100 text-yellow-700'
                                            }`}>
                                            {r.status}
                                        </span>
                                        {r.status === 'APPROVED' && (
                                            <p className="text-[9px] text-gray-400 mt-1">By {r.approver_name}</p>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        {r.status === 'PENDING' && isAdmin ? (
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => handleAction(r.id, 'approve')}
                                                    className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                                                >
                                                    Approve
                                                </button>
                                                <button
                                                    onClick={() => handleAction(r.id, 'reject')}
                                                    className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                                                >
                                                    Reject
                                                </button>
                                            </div>
                                        ) : (
                                            <span className="text-xs text-gray-300">No Actions</span>
                                        )}
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
                        <h2 className="text-xl font-bold mb-4">Request Free Sample Issue</h2>
                        <form onSubmit={handleRequest} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
                                <select
                                    required value={formData.product_id}
                                    onChange={e => setFormData({ ...formData, product_id: e.target.value })}
                                    className="w-full border p-2 rounded-lg"
                                >
                                    <option value="">-- Select Product --</option>
                                    {products.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                                    <input
                                        type="number" required value={formData.quantity}
                                        onChange={e => setFormData({ ...formData, quantity: e.target.value })}
                                        className="w-full border p-2 rounded-lg"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Request Date</label>
                                    <input
                                        type="date" required value={formData.request_date}
                                        onChange={e => setFormData({ ...formData, request_date: e.target.value })}
                                        className="w-full border p-2 rounded-lg"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Issue</label>
                                <input
                                    type="text" required value={formData.reason}
                                    onChange={e => setFormData({ ...formData, reason: e.target.value })}
                                    className="w-full border p-2 rounded-lg"
                                    placeholder="e.g. Sales Sample, Party Exhibition, Waste..."
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Additional Notes</label>
                                <textarea
                                    value={formData.notes}
                                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                    className="w-full border p-2 rounded-lg h-20"
                                ></textarea>
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setShowRequestModal(false)} className="flex-1 px-4 py-2 border rounded-lg">Cancel</button>
                                <button type="submit" className="flex-1 px-4 py-2 bg-brand-600 text-white rounded-lg">Submit Request</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
