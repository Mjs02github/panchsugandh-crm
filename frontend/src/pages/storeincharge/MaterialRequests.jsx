import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';

export default function MaterialRequests() {
    const { user } = useAuth();
    const [requests, setRequests] = useState([]);
    const [rawMaterials, setRawMaterials] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    
    const [formData, setFormData] = useState({
        item_name: '',
        material_id: '',
        quantity: '',
        unit: 'kg',
        priority: 'MEDIUM',
        notes: ''
    });

    const loadData = async () => {
        setLoading(true);
        try {
            const [reqRes, rmRes] = await Promise.all([
                api.get(`/procurement/requests?role=store_incharge&userId=${user.id}`),
                api.get('/store/raw-materials')
            ]);
            setRequests(reqRes.data);
            setRawMaterials(rmRes.data);
        } catch (error) {
            console.error('Failed to load data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await api.post('/procurement/requests', {
                ...formData,
                requested_by: user.id
            });
            setFormData({
                item_name: '',
                material_id: '',
                quantity: '',
                unit: 'kg',
                priority: 'MEDIUM',
                notes: ''
            });
            loadData();
            alert('Request submitted successfully!');
        } catch (error) {
            alert('Failed to submit request: ' + error.message);
        } finally {
            setSubmitting(false);
        }
    };

    // Auto-fill item_name and unit if material_id is selected
    const handleMaterialChange = (id) => {
        if (!id) {
            setFormData(prev => ({ ...prev, material_id: '', item_name: '' }));
            return;
        }
        const mat = rawMaterials.find(m => String(m.id) === String(id));
        if (mat) {
            setFormData(prev => ({
                ...prev,
                material_id: id,
                item_name: mat.name,
                unit: mat.unit
            }));
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'PENDING': return 'bg-yellow-100 text-yellow-800';
            case 'APPROVED': return 'bg-blue-100 text-blue-800';
            case 'PURCHASED': return 'bg-purple-100 text-purple-800';
            case 'RECEIVED': return 'bg-green-100 text-green-800';
            case 'CANCELLED': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'URGENT': return 'text-red-600 font-bold';
            case 'HIGH': return 'text-orange-600 font-semibold';
            case 'MEDIUM': return 'text-blue-600';
            case 'LOW': return 'text-gray-500';
            default: return 'text-gray-600';
        }
    };

    return (
        <div className="space-y-6 pb-20">
            <div className="page-header px-4 md:px-0">
                <h1 className="text-xl font-bold text-gray-800">Material Procurement Channel</h1>
                <p className="text-sm text-gray-500">Request raw materials or new items from procurement</p>
            </div>

            {/* Request Form */}
            <div className="card mx-4 md:mx-0">
                <h2 className="text-lg font-semibold mb-4">Submit New Request</h2>
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="label">Select Existing Material</label>
                        <select 
                            className="input"
                            value={formData.material_id}
                            onChange={(e) => handleMaterialChange(e.target.value)}
                        >
                            <option value="">-- New Item (Not in list) --</option>
                            {rawMaterials.map(m => (
                                <option key={m.id} value={m.id}>{m.name} ({m.qty_on_hand} {m.unit} avail)</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="label">Item Name (Manual Entry if New)</label>
                        <input 
                            className="input"
                            required
                            placeholder="e.g. Packing Box 10kg, New Flavor Essence"
                            value={formData.item_name}
                            onChange={(e) => setFormData(prev => ({ ...prev, item_name: e.target.value }))}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="label">Quantity</label>
                            <input 
                                className="input"
                                type="number"
                                step="0.01"
                                required
                                value={formData.quantity}
                                onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
                            />
                        </div>
                        <div>
                            <label className="label">Unit</label>
                            <input 
                                className="input"
                                required
                                value={formData.unit}
                                onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="label">Priority</label>
                        <select 
                            className="input"
                            value={formData.priority}
                            onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
                        >
                            <option value="LOW">Low</option>
                            <option value="MEDIUM">Medium</option>
                            <option value="HIGH">High</option>
                            <option value="URGENT">Urgent ⚡</option>
                        </select>
                    </div>

                    <div className="md:col-span-2">
                        <label className="label">Notes / Reason</label>
                        <textarea 
                            className="input min-h-[80px]"
                            placeholder="Why is this needed? e.g. Stock ending in 2 days"
                            value={formData.notes}
                            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                        />
                    </div>

                    <div className="md:col-span-2">
                        <button 
                            type="submit" 
                            disabled={submitting}
                            className="btn-primary w-full py-3 text-lg"
                        >
                            {submitting ? 'Submitting...' : '🚀 Send Request to Procurement'}
                        </button>
                    </div>
                </form>
            </div>

            {/* Request History */}
            <div className="card mx-4 md:mx-0">
                <h2 className="text-lg font-semibold mb-4">Request History</h2>
                {loading ? (
                    <div className="text-center py-10">Loading history...</div>
                ) : requests.length === 0 ? (
                    <div className="text-center py-10 text-gray-500 bg-gray-50 rounded-xl border border-dashed">
                        No requests sent yet.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                                <tr>
                                    <th className="px-4 py-3">Item</th>
                                    <th className="px-4 py-3">Qty</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3">Priority</th>
                                    <th className="px-4 py-3">Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {requests.map(req => (
                                    <tr key={req.id} className="text-sm hover:bg-gray-50 transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="font-medium text-gray-900">{req.item_name}</div>
                                            {req.notes && <div className="text-xs text-gray-500 truncate max-w-[200px]">{req.notes}</div>}
                                        </td>
                                        <td className="px-4 py-3">{req.quantity} {req.unit}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${getStatusColor(req.status)}`}>
                                                {req.status}
                                            </span>
                                        </td>
                                        <td className={`px-4 py-3 text-xs ${getPriorityColor(req.priority)}`}>
                                            {req.priority}
                                        </td>
                                        <td className="px-4 py-3 text-xs text-gray-400">
                                            {new Date(req.created_at).toLocaleDateString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
