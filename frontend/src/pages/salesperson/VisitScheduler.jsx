import { useState, useEffect } from 'react';
import api from '../../api';
import BottomNav from '../../components/BottomNav';

export default function VisitScheduler() {
    const [visits, setVisits] = useState([]);
    const [retailers, setRetailers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({
        retailer_id: '',
        visit_date: new Date().toISOString().slice(0, 10),
        purpose: '',
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [dateFilter, setDateFilter] = useState(new Date().toISOString().slice(0, 10));

    const PURPOSES = ['Order Collection', 'Payment Collection', 'Intro Visit', 'Follow-up', 'Complaint Resolution'];

    const load = () => {
        setLoading(true);
        api.get('/visits', { params: { date: dateFilter } })
            .then(r => setVisits(r.data))
            .finally(() => setLoading(false));
    };
    useEffect(() => { load(); api.get('/retailers').then(r => setRetailers(r.data)); }, []);
    useEffect(() => { load(); }, [dateFilter]);

    const handleSave = async (e) => {
        e.preventDefault(); setError(''); setSaving(true);
        try {
            await api.post('/visits', form);
            setSuccess('Visit scheduled!');
            setShowForm(false);
            setForm({ retailer_id: '', visit_date: new Date().toISOString().slice(0, 10), purpose: '' });
            load();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to schedule visit.');
        } finally { setSaving(false); }
    };

    const handleAction = async (visitId, action) => {
        try {
            await api.patch(`/visits/${visitId}`, { action });
            load();
        } catch { }
    };

    const STATUS_CONFIG = {
        SCHEDULED: { cls: 'bg-yellow-100 text-yellow-800', label: '🕐 Scheduled' },
        COMPLETED: { cls: 'bg-green-100 text-green-800', label: '✅ Completed' },
        SKIPPED: { cls: 'bg-red-100 text-red-800', label: '⏭ Skipped' },
    };

    return (
        <div className="pb-24">
            <div className="page-header">
                <h1 className="text-lg font-semibold flex-1">Visit Planner</h1>
                <button onClick={() => { setShowForm(!showForm); setError(''); }}
                    className="text-sm bg-brand-600 text-white px-3 py-1.5 rounded-xl font-medium">
                    {showForm ? '✕' : '+ Schedule'}
                </button>
            </div>

            {showForm && (
                <form onSubmit={handleSave} className="mx-4 mt-3 card space-y-3">
                    <h2 className="font-semibold text-gray-700">Schedule a Visit</h2>
                    {error && <p className="text-red-600 text-sm">{error}</p>}
                    {success && <p className="text-green-600 text-sm">{success}</p>}
                    <div>
                        <label className="label">Retailer *</label>
                        <select className="input" value={form.retailer_id} onChange={e => setForm(f => ({ ...f, retailer_id: e.target.value }))} required>
                            <option value="">Select retailer…</option>
                            {retailers.map(r => <option key={r.id} value={r.id}>{r.firm_name} — {r.area_name || 'No area'}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="label">Visit Date *</label>
                        <input type="date" className="input" value={form.visit_date}
                            onChange={e => setForm(f => ({ ...f, visit_date: e.target.value }))} required />
                    </div>
                    <div>
                        <label className="label">Purpose</label>
                        <div className="flex flex-wrap gap-2">
                            {PURPOSES.map(p => (
                                <button key={p} type="button"
                                    className={`text-xs px-3 py-1.5 rounded-full border transition-all ${form.purpose === p ? 'bg-brand-100 border-brand-400 text-brand-700' : 'border-gray-200 text-gray-600'
                                        }`}
                                    onClick={() => setForm(f => ({ ...f, purpose: p }))}>
                                    {p}
                                </button>
                            ))}
                        </div>
                    </div>
                    <button type="submit" className="btn-primary" disabled={saving}>
                        {saving ? 'Saving…' : 'Schedule Visit'}
                    </button>
                </form>
            )}

            {/* Date filter */}
            <div className="px-4 pt-3 pb-1 flex items-center gap-2">
                <label className="text-sm text-gray-500 font-medium whitespace-nowrap">Date:</label>
                <input type="date" className="input py-1.5 text-sm" value={dateFilter}
                    onChange={e => setDateFilter(e.target.value)} />
            </div>

            <div className="px-4 py-2 space-y-3">
                {loading ? (
                    <div className="flex justify-center py-10">
                        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : visits.length === 0 ? (
                    <div className="text-center py-10 text-gray-400">
                        <div className="text-5xl mb-3">🗺️</div>
                        <p>No visits for this date</p>
                    </div>
                ) : visits.map(v => {
                    const sc = STATUS_CONFIG[v.status] || STATUS_CONFIG.SCHEDULED;
                    return (
                        <div key={v.id} className="card">
                            <div className="flex items-start justify-between mb-1">
                                <div>
                                    <p className="font-semibold text-gray-800">{v.retailer_name}</p>
                                    <p className="text-xs text-gray-500">{v.area_name || 'No area'}</p>
                                    {v.purpose && <p className="text-xs text-brand-600 mt-0.5">🎯 {v.purpose}</p>}
                                </div>
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sc.cls}`}>{sc.label}</span>
                            </div>

                            {v.checked_in_at && (
                                <p className="text-xs text-gray-400">Checked in: {new Date(v.checked_in_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>
                            )}

                            {v.status === 'SCHEDULED' && (
                                <div className="flex gap-2 mt-2 pt-2 border-t border-gray-100">
                                    <button onClick={() => handleAction(v.id, 'checkin')}
                                        className="flex-1 py-2 bg-green-600 text-white rounded-xl text-xs font-semibold">
                                        ✅ Check In
                                    </button>
                                    <button onClick={() => handleAction(v.id, 'skip')}
                                        className="flex-1 py-2 border border-red-200 text-red-600 rounded-xl text-xs font-semibold">
                                        ⏭ Skip
                                    </button>
                                </div>
                            )}
                            {v.status === 'COMPLETED' && !v.checked_out_at && (
                                <button onClick={() => handleAction(v.id, 'checkout')}
                                    className="mt-2 w-full py-2 border border-gray-300 text-gray-600 rounded-xl text-xs font-semibold">
                                    🚪 Check Out
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>
            <BottomNav />
        </div>
    );
}
