import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';

export default function RequestManagement() {
    const { user } = useAuth();
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [updatingId, setUpdatingId] = useState(null);

    const loadRequests = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/procurement/requests?role=procurement');
            setRequests(data);
        } catch (error) {
            console.error('Failed to load requests:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadRequests(); }, []);

    const updateStatus = async (id, newStatus) => {
        setUpdatingId(id);
        const remark = window.prompt(`Enter any notes/remarks for status ${newStatus}:`, '');
        try {
            await api.patch(`/procurement/requests/${id}`, { 
                status: newStatus,
                notes: remark || undefined
            });
            loadRequests();
        } catch (error) {
            alert('Update failed: ' + error.message);
        } finally {
            setUpdatingId(null);
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
                <div className="flex-1">
                    <h1 className="text-xl font-bold text-gray-800">Incoming Material Requests</h1>
                    <p className="text-sm text-gray-500">From Store In-charge regarding missing or low stock items</p>
                </div>
                <button 
                    onClick={loadRequests}
                    className="p-2 bg-white border rounded-lg hover:bg-gray-50 active:scale-95 transition-all text-xs font-medium"
                >
                    🔄 Refresh
                </button>
            </div>

            <div className="card mx-4 md:mx-0">
                {loading ? (
                    <div className="text-center py-20 flex flex-col items-center">
                        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                        <p className="text-gray-500">Fetching latest requests...</p>
                    </div>
                ) : requests.length === 0 ? (
                    <div className="text-center py-20">
                        <div className="text-4xl mb-4 text-gray-300">🍃</div>
                        <p className="text-gray-500 italic">No pending material requests at the moment.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto overflow-visible">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                                <tr>
                                    <th className="px-4 py-3">Item Name</th>
                                    <th className="px-4 py-3">Req. By</th>
                                    <th className="px-4 py-3">Qty</th>
                                    <th className="px-4 py-3">Priority</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {requests.map(req => (
                                    <tr key={req.id} className="text-sm hover:bg-gray-50 transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="font-semibold text-gray-900">{req.item_name}</div>
                                            {req.official_material_name && (
                                                <div className="text-[10px] text-brand-600 uppercase tracking-tight">
                                                    Linked: {req.official_material_name}
                                                </div>
                                            )}
                                            {req.notes && (
                                                <div className="text-xs text-gray-500 mt-1 max-w-[250px] italic">
                                                    "{req.notes}"
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="font-medium text-gray-800">{req.requester_name}</div>
                                            <div className="text-[10px] text-gray-400">
                                                {new Date(req.created_at).toLocaleString()}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 font-medium whitespace-nowrap">
                                            {req.quantity} {req.unit}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`text-[10px] px-2 py-1 rounded-full border border-current bg-white ${getPriorityColor(req.priority)}`}>
                                                {req.priority}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${getStatusColor(req.status)} whitespace-nowrap`}>
                                                {req.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-wrap gap-1 min-w-[120px]">
                                                {req.status === 'PENDING' && (
                                                    <button 
                                                        onClick={() => updateStatus(req.id, 'APPROVED')}
                                                        className="text-[10px] p-1.5 bg-blue-50 text-blue-700 rounded hover:bg-blue-100 font-bold"
                                                    >
                                                        Approve
                                                    </button>
                                                )}
                                                {(req.status === 'PENDING' || req.status === 'APPROVED') && (
                                                    <button 
                                                        onClick={() => updateStatus(req.id, 'PURCHASED')}
                                                        className="text-[10px] p-1.5 bg-purple-50 text-purple-700 rounded hover:bg-purple-100 font-bold"
                                                    >
                                                        Purchased
                                                    </button>
                                                )}
                                                {req.status === 'PURCHASED' && (
                                                    <button 
                                                        onClick={() => updateStatus(req.id, 'RECEIVED')}
                                                        className="text-[10px] p-1.5 bg-green-50 text-green-700 rounded hover:bg-green-100 font-bold"
                                                    >
                                                        Received
                                                    </button>
                                                )}
                                                {req.status !== 'RECEIVED' && req.status !== 'CANCELLED' && (
                                                    <button 
                                                        onClick={() => updateStatus(req.id, 'CANCELLED')}
                                                        className="text-[10px] p-1.5 bg-red-50 text-red-700 rounded hover:bg-red-100 font-bold"
                                                    >
                                                        Cancel
                                                    </button>
                                                )}
                                            </div>
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
