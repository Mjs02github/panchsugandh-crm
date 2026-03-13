import React, { useState, useEffect } from 'react';
import api from '../../api';
import { Bell, Send, Clock, UserCheck, Trash2, CheckCircle2, History } from 'lucide-react';

const ROLES = [
    { value: 'ALL', label: 'All Staff' },
    { value: 'salesperson', label: 'Salespersons' },
    { value: 'sales_officer', label: 'Sales Officers' },
    { value: 'bill_operator', label: 'Bill Operators' },
    { value: 'delivery_incharge', label: 'Delivery In-charge' },
    { value: 'store_incharge', label: 'Store In-charge' },
    { value: 'procurement', label: 'Procurement' },
    { value: 'manufacturing_manager', label: 'Manufacturing' },
    { value: 'admin', label: 'Admins' },
];

export default function AdminNotificationPanel() {
    const [formData, setFormData] = useState({
        role: 'ALL',
        title: '',
        message: '',
        scheduled_at: '',
    });
    const [broadcasts, setBroadcasts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);

    useEffect(() => {
        fetchBroadcasts();
    }, []);

    const fetchBroadcasts = async () => {
        try {
            const res = await api.get('/notifications/broadcasts');
            setBroadcasts(res.data);
        } catch (err) {
            console.error('Failed to fetch broadcasts:', err);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);
        try {
            await api.post('/notifications/broadcast', formData);
            setMessage({ type: 'success', text: formData.scheduled_at ? 'Notification scheduled successfully!' : 'Notification broadcasted successfully!' });
            setFormData({ role: 'ALL', title: '', message: '', scheduled_at: '' });
            fetchBroadcasts();
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to send notification.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-20">
            {/* Header */}
            <div className="flex flex-col gap-1">
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <Bell className="text-brand-600" /> Notification Panel
                </h1>
                <p className="text-sm text-gray-500">Send motivational messages or urgent alerts to your team.</p>
            </div>

            {/* Broadcast Form */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 bg-brand-50 border-b border-brand-100 flex items-center gap-2">
                    <Send size={18} className="text-brand-600" />
                    <h2 className="font-bold text-brand-900">New Broadcast</h2>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {message && (
                        <div className={`p-3 rounded-lg text-sm flex items-center gap-2 ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                            {message.type === 'success' ? <CheckCircle2 size={16} /> : <X size={16} />}
                            {message.text}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1">
                                <UserCheck size={12} /> Target Role
                            </label>
                            <select
                                value={formData.role}
                                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                className="w-full bg-gray-50 border-gray-200 rounded-xl text-sm focus:ring-brand-500 focus:border-brand-500"
                                required
                            >
                                {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1">
                                <Clock size={12} /> Schedule Time (Optional)
                            </label>
                            <input
                                type="datetime-local"
                                value={formData.scheduled_at}
                                onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
                                className="w-full bg-gray-50 border-gray-200 rounded-xl text-sm focus:ring-brand-500 focus:border-brand-500"
                            />
                            <p className="text-[10px] text-gray-400">Leave blank to send immediately.</p>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500 uppercase">Title</label>
                        <input
                            type="text"
                            placeholder="e.g. Monthly Achievement! 🏆"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            className="w-full bg-gray-50 border-gray-200 rounded-xl text-sm focus:ring-brand-500 focus:border-brand-500"
                            required
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500 uppercase">Message</label>
                        <textarea
                            rows="3"
                            placeholder="Type your message here..."
                            value={formData.message}
                            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                            className="w-full bg-gray-50 border-gray-200 rounded-xl text-sm focus:ring-brand-500 focus:border-brand-500"
                            required
                        ></textarea>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold shadow-lg shadow-brand-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {loading ? 'Processing...' : (formData.scheduled_at ? 'Schedule Notification' : 'Send Immediate Broadcast')}
                    </button>
                </form>
            </div>

            {/* Past Broadcasts */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <History size={18} className="text-gray-400" />
                        <h2 className="font-bold text-gray-800">History & Schedule</h2>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50/50 text-[10px] uppercase tracking-wider text-gray-400 font-bold">
                                <th className="px-6 py-3">Scheduled For</th>
                                <th className="px-6 py-3">Target</th>
                                <th className="px-6 py-3">Content</th>
                                <th className="px-6 py-3">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {broadcasts.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="px-6 py-10 text-center text-gray-400">No broadcasts found.</td>
                                </tr>
                            ) : (
                                broadcasts.map((b) => (
                                    <tr key={b.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-xs font-semibold text-gray-700">
                                                {new Date(b.scheduled_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-xs">
                                            <span className="px-2 py-0.5 bg-gray-100 rounded text-gray-600 font-medium">
                                                {b.target_role === 'ALL' ? 'All Roles' : b.target_role.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 min-w-[200px]">
                                            <div className="text-xs font-bold text-gray-800">{b.title}</div>
                                            <div className="text-[10px] text-gray-500 truncate max-w-[200px]">{b.message}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {b.is_sent ? (
                                                <span className="flex items-center gap-1 text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full w-fit">
                                                    <CheckCircle2 size={10} /> SENT
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1 text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full w-fit">
                                                    <Clock size={10} /> PENDING
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
