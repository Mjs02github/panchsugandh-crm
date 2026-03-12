import { useState, useEffect } from 'react';
import api from '../../api';
import { Factory, Plus, History, Package, Calendar, User, FileText, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function ManufacturingDashboard() {
    const { user } = useAuth();
    const [logs, setLogs] = useState([]);
    const [materials, setMaterials] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [formLoading, setFormLoading] = useState(false);
    const [formData, setFormData] = useState({
        material_id: '',
        quantity: '',
        batch_number: '',
        production_date: new Date().toISOString().split('T')[0],
        notes: ''
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            const [logsRes, materialsRes] = await Promise.all([
                api.get('/manufacturing/logs'),
                api.get('/store/raw-materials')
            ]);
            setLogs(logsRes.data);
            setMaterials(materialsRes.data);
        } catch (error) {
            console.error('Error fetching data:', error);
            alert('Failed to load materials or logs. Please check your connection or permissions.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormLoading(true);
        try {
            await api.post('/manufacturing/record', formData);
            setShowModal(false);
            setFormData({
                material_id: '',
                quantity: '',
                batch_number: '',
                production_date: new Date().toISOString().split('T')[0],
                notes: ''
            });
            fetchData();
            alert('Production recorded successfully!');
        } catch (error) {
            alert('Error recording production: ' + (error.response?.data?.error || error.message));
        } finally {
            setFormLoading(false);
        }
    };

    return (
        <div className="p-4 sm:p-6 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <Factory className="text-brand-600" />
                        Manufacturing Dashboard
                    </h1>
                    <p className="text-gray-500 text-sm">Track internally produced raw materials</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 transition shadow-lg shadow-brand-100 font-bold"
                >
                    <Plus size={20} />
                    Record Production
                </button>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                            <History size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Total Records</p>
                            <p className="text-2xl font-bold text-gray-900">{logs.length}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-green-50 text-green-600 rounded-xl">
                            <Package size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Materials Tracked</p>
                            <p className="text-2xl font-bold text-gray-900">{materials.length}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center flex flex-col justify-center">
                    <p className="text-sm font-medium text-brand-600">Factory In-House Production</p>
                    <p className="text-xs text-gray-400">Updates inventory automatically</p>
                </div>
            </div>

            {/* Logs Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                    <h2 className="font-bold text-gray-800 flex items-center gap-2">
                        <History size={18} className="text-gray-400" />
                        Recent Production Logs
                    </h2>
                </div>
                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="p-20 text-center flex flex-col items-center">
                            <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                            <p className="text-gray-400">Loading records...</p>
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="p-20 text-center text-gray-400 italic">
                            No production records found.
                        </div>
                    ) : (
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                <tr>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4">Material</th>
                                    <th className="px-6 py-4">Quantity</th>
                                    <th className="px-6 py-4">Batch No</th>
                                    <th className="px-6 py-4">Recorded By</th>
                                    <th className="px-6 py-4">Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {logs.map(log => (
                                    <tr key={log.id} className="hover:bg-gray-50/50 transition">
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                                                log.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                                                log.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                                                'bg-amber-100 text-amber-700'
                                            }`}>
                                                {log.status}
                                            </span>
                                            {log.remark && log.status === 'REJECTED' && (
                                                <p className="text-[10px] text-red-400 mt-1 italic">{log.remark}</p>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="font-bold text-gray-800">{log.material_name}</p>
                                            {log.notes && <p className="text-xs text-gray-400 italic truncate max-w-xs">{log.notes}</p>}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="font-bold text-brand-600">{log.quantity}</span>
                                        </td>
                                        <td className="px-6 py-4 font-mono text-xs text-gray-600">
                                            {log.batch_number || 'N/A'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-[10px] font-bold text-gray-500">
                                                    {log.creator_name?.charAt(0)}
                                                </div>
                                                <span className="text-sm text-gray-600">{log.creator_name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-xs text-gray-500">
                                            {new Date(log.production_date).toLocaleDateString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Record Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="bg-gradient-to-r from-brand-600 to-brand-500 p-6 text-white">
                            <h3 className="text-xl font-bold">Record RM Production</h3>
                            <p className="text-brand-100 text-sm">Log factory-produced items to inventory</p>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Select Raw Material</label>
                                <select
                                    required
                                    value={formData.material_id}
                                    onChange={e => setFormData({ ...formData, material_id: e.target.value })}
                                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none"
                                >
                                    <option value="">Choose material...</option>
                                    {materials.filter(m => Number(m.is_internal_mfg) === 1).length > 0 ? (
                                        materials.filter(m => Number(m.is_internal_mfg) === 1).map(m => (
                                            <option key={m.id} value={m.id}>{m.name} ({m.qty_on_hand} {m.unit} on hand)</option>
                                        ))
                                    ) : (
                                        <option disabled>No factory items authorized by Store</option>
                                    )}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Quantity</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        required
                                        value={formData.quantity}
                                        onChange={e => setFormData({ ...formData, quantity: e.target.value })}
                                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none"
                                        placeholder="0.00"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Production Date</label>
                                    <input
                                        type="date"
                                        required
                                        value={formData.production_date}
                                        onChange={e => setFormData({ ...formData, production_date: e.target.value })}
                                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none text-sm"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Batch Number (Optional)</label>
                                <input
                                    type="text"
                                    value={formData.batch_number}
                                    onChange={e => setFormData({ ...formData, batch_number: e.target.value })}
                                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none"
                                    placeholder="e.g. BATCH-2024-001"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Notes / Remarks</label>
                                <textarea
                                    rows="3"
                                    value={formData.notes}
                                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none"
                                    placeholder="Enter any production details..."
                                />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 py-3 border border-gray-200 text-gray-500 font-bold rounded-xl hover:bg-gray-50 transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={formLoading}
                                    className="flex-1 py-3 bg-brand-600 text-white font-bold rounded-xl hover:bg-brand-700 transition disabled:opacity-50"
                                >
                                    {formLoading ? 'Saving...' : 'Save Record'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
