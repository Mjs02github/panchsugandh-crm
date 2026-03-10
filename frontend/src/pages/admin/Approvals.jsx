import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  ArrowRight, 
  Info,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

const Approvals = () => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState(null);
    const [expandedIds, setExpandedIds] = useState([]);
    const [remark, setRemark] = useState('');

    useEffect(() => {
        fetchRequests();
    }, []);

    const fetchRequests = async () => {
        try {
            const res = await axios.get('/api/retailers/edit-requests?status=PENDING');
            setRequests(res.data);
        } catch (err) {
            console.error('Error fetching requests:', err);
        } finally {
            setLoading(false);
        }
    };

    const toggleExpand = (id) => {
        setExpandedIds(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleProcess = async (id, status) => {
        if (!window.confirm(`Are you sure you want to ${status.toLowerCase()} this request?`)) return;
        
        setProcessingId(id);
        try {
            await axios.post(`/api/retailers/edit-requests/${id}/process`, {
                status,
                admin_remark: remark
            });
            setRemark('');
            fetchRequests();
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to process request');
        } finally {
            setProcessingId(null);
        }
    };

    const formatLabel = (key) => {
        return key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    if (loading) return (
        <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
    );

    return (
        <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-800">Pending Approvals</h1>
                <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-sm font-medium">
                    {requests.length} Requests
                </span>
            </div>

            {requests.length === 0 ? (
                <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-gray-100">
                    <CheckCircle className="mx-auto h-12 w-12 text-green-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900">All caught up!</h3>
                    <p className="text-gray-500">No pending party edit requests to review.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {requests.map(req => {
                        const proposed = typeof req.proposed_data === 'string' ? JSON.parse(req.proposed_data) : req.proposed_data;
                        const isExpanded = expandedIds.includes(req.id);

                        return (
                            <div key={req.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                {/* Header */}
                                <div 
                                    className="p-4 flex flex-wrap items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
                                    onClick={() => toggleExpand(req.id)}
                                >
                                    <div className="flex items-center space-x-4">
                                        <div className="p-2 bg-indigo-50 rounded-lg">
                                            <Info className="h-5 w-5 text-indigo-600" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-gray-900">{req.firm_name}</h3>
                                            <p className="text-xs text-gray-500 flex items-center">
                                                <Clock className="h-3 w-3 mr-1" />
                                                Requested by {req.requester_name} • {new Date(req.created_at).toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-4">
                                        <div className="hidden sm:flex space-x-1">
                                            {Object.keys(proposed).map((key, i) => (
                                                <span key={i} className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                                                    {formatLabel(key)}
                                                </span>
                                            ))}
                                        </div>
                                        {isExpanded ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
                                    </div>
                                </div>

                                {/* Body */}
                                {isExpanded && (
                                    <div className="border-t border-gray-100 p-4 bg-gray-50/50">
                                        <div className="grid grid-cols-1 gap-4 mb-6">
                                            {Object.entries(proposed).map(([key, val]) => (
                                                <div key={key} className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm flex items-center justify-between">
                                                    <span className="text-sm font-medium text-gray-600">{formatLabel(key)}</span>
                                                    <div className="flex items-center text-sm">
                                                        <span className="text-gray-400 italic">Proposed Change:</span>
                                                        <ArrowRight className="h-4 w-4 mx-2 text-indigo-400" />
                                                        <span className="font-bold text-indigo-600">{String(val) || '(Empty)'}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="flex flex-col sm:flex-row items-end sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
                                            <div className="flex-1 w-full text-right sm:text-left">
                                                <label className="text-xs font-medium text-gray-500 mb-1 block">Quick Remark (Optional)</label>
                                                <input 
                                                    type="text"
                                                    placeholder="e.g. Verified with client"
                                                    className="w-full text-sm border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                                                    value={remark}
                                                    onChange={(e) => setRemark(e.target.value)}
                                                />
                                            </div>
                                            <div className="flex space-x-3 shrink-0">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleProcess(req.id, 'REJECTED'); }}
                                                    disabled={processingId === req.id}
                                                    className="flex items-center px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 font-medium transition-colors disabled:opacity-50"
                                                >
                                                    <XCircle className="h-4 w-4 mr-2" />
                                                    Reject
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleProcess(req.id, 'APPROVED'); }}
                                                    disabled={processingId === req.id}
                                                    className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium shadow-sm transition-colors disabled:opacity-50"
                                                >
                                                    <CheckCircle className="h-4 w-4 mr-2" />
                                                    {processingId === req.id ? 'Processing...' : 'Approve'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default Approvals;
