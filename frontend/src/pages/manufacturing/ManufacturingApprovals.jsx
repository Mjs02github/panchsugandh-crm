import { useState, useEffect } from 'react';
import api from '../../api';
import { Factory, History, Check, X, AlertCircle, Clock } from 'lucide-react';

export default function ManufacturingApprovals() {
    const [pendingLogs, setPendingLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [remarkModal, setRemarkModal] = useState({ show: false, logId: null, action: '' });
    const [remark, setRemark] = useState('');

    const fetchPending = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/manufacturing/logs');
            // Filter for PENDING logs
            setPendingLogs(data.filter(log => log.status === 'PENDING'));
        } catch (error) {
            console.error('Error fetching pending production:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPending();
    }, []);

    const handleAction = async () => {
        if (!remark && remarkModal.action === 'REJECTED') {
            alert('Please provide a remark for rejection');
            return;
        }

        setProcessing(true);
        try {
            await api.patch(`/manufacturing/logs/${remarkModal.logId}/status`, {
                status: remarkModal.action,
                remark
            });
            setRemarkModal({ show: false, logId: null, action: '' });
            setRemark('');
            fetchPending();
            alert(`Record ${remarkModal.action.toLowerCase()} successfully!`);
        } catch (error) {
            alert('Error updating record: ' + (error.response?.data?.error || error.message));
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="p-4 sm:p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <Factory className="text-indigo-600" />
                        Manufacturing Approvals
                    </h1>
                    <p className="text-gray-500 text-sm">Review factory production records before stock update</p>
                </div>
            </div>

            {loading ? (
                <div className="p-20 text-center flex flex-col items-center bg-white rounded-2xl shadow-sm border border-gray-100">
                    <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="text-gray-400">Loading pending approvals...</p>
                </div>
            ) : pendingLogs.length === 0 ? (
                <div className="bg-white rounded-2xl p-20 text-center shadow-sm border border-gray-100 italic text-gray-400">
                    <Clock size={48} className="mx-auto mb-4 opacity-20" />
                    No production records awaiting approval.
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {pendingLogs.map(log => (
                        <div key={log.id} className="bg-white p-6 rounded-2xl shadow-sm border border-indigo-100 hover:border-indigo-300 transition-all flex flex-col justify-between">
                            <div className="space-y-4">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="font-bold text-gray-900 text-lg">{log.material_name}</h3>
                                        <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                                            <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-bold">BATCH: {log.batch_number || 'N/A'}</span>
                                            <span>•</span>
                                            <span>{new Date(log.production_date).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                    <div className="bg-brand-50 p-2 rounded-xl text-brand-600 font-bold text-xl">
                                        {log.quantity}
                                    </div>
                                </div>

                                <div className="bg-gray-50 p-4 rounded-xl space-y-2">
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                        <User size={14} className="text-gray-400" />
                                        <span>Recorded by: <b>{log.creator_name}</b></span>
                                    </div>
                                    {log.notes && (
                                        <div className="flex items-start gap-2 text-sm text-gray-600">
                                            <History size={14} className="text-gray-400 mt-1 shrink-0" />
                                            <p className="italic">"{log.notes}"</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={() => setRemarkModal({ show: true, logId: log.id, action: 'REJECTED' })}
                                    className="flex-1 flex items-center justify-center gap-2 py-3 border border-red-200 text-red-600 font-bold rounded-xl hover:bg-red-50 transition"
                                >
                                    <X size={18} />
                                    Reject
                                </button>
                                <button
                                    onClick={() => setRemarkModal({ show: true, logId: log.id, action: 'APPROVED' })}
                                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition"
                                >
                                    <Check size={18} />
                                    Approve
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Remark Modal */}
            {remarkModal.show && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className={`p-6 text-white ${remarkModal.action === 'APPROVED' ? 'bg-green-600' : 'bg-red-600'}`}>
                            <h3 className="text-xl font-bold">{remarkModal.action === 'APPROVED' ? 'Approve Production' : 'Reject Production'}</h3>
                            <p className="text-white/80 text-sm">Add a remark or internal note</p>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Remark / Reason</label>
                                <textarea
                                    autoFocus
                                    rows="3"
                                    value={remark}
                                    onChange={e => setRemark(e.target.value)}
                                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                    placeholder={remarkModal.action === 'APPROVED' ? 'Optional: Verify batch details...' : 'Required: Why is this being rejected?'}
                                />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setRemarkModal({ show: false, logId: null, action: '' })}
                                    className="flex-1 py-3 border border-gray-200 text-gray-500 font-bold rounded-xl hover:bg-gray-50 transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    disabled={processing}
                                    onClick={handleAction}
                                    className={`flex-1 py-3 text-white font-bold rounded-xl transition disabled:opacity-50 ${remarkModal.action === 'APPROVED' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
                                >
                                    {processing ? 'Processing...' : 'Confirm ' + (remarkModal.action === 'APPROVED' ? 'Approval' : 'Rejection')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
