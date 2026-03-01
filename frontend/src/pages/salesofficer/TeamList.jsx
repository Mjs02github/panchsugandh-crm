import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api';
import BottomNav from '../../components/BottomNav';

export default function TeamList() {
    const [members, setMembers] = useState([]);
    const [targets, setTargets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState(null); // salesperson for target setting
    const [targetForm, setTargetForm] = useState({ target_amount: '', target_month: '' });
    const [saving, setSaving] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        Promise.all([
            api.get('/users').then(r => r.data.filter(u => u.role === 'salesperson')),
            api.get('/targets').then(r => r.data),
        ]).then(([members, targets]) => {
            setMembers(members);
            setTargets(targets);
        }).finally(() => setLoading(false));
    }, []);

    const getTarget = (spId) => {
        const thisMonth = new Date().toISOString().slice(0, 7) + '-01';
        return targets.find(t => String(t.salesperson_id) === String(spId) && t.target_month === thisMonth);
    };

    const handleSetTarget = async (e) => {
        e.preventDefault(); setSaving(true);
        try {
            await api.post('/targets', {
                salesperson_id: selected.id,
                target_month: targetForm.target_month + '-01',
                target_amount: parseFloat(targetForm.target_amount),
            });
            setSelected(null);
            const r = await api.get('/targets');
            setTargets(r.data);
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to set target.');
        } finally { setSaving(false); }
    };

    const thisMonthLabel = new Date().toLocaleString('en-IN', { month: 'long', year: 'numeric' });
    const thisMonthISO = new Date().toISOString().slice(0, 7); // YYYY-MM

    return (
        <div className="pb-24">
            <div className="page-header">
                <h1 className="text-lg font-semibold">My Team</h1>
            </div>

            {/* Target setting modal */}
            {selected && (
                <div className="fixed inset-0 z-50 bg-black/40 flex items-end" onClick={() => setSelected(null)}>
                    <form onSubmit={handleSetTarget} onClick={e => e.stopPropagation()}
                        className="bg-white rounded-t-3xl w-full max-w-[480px] mx-auto p-5 space-y-4">
                        <h2 className="font-bold text-gray-800">Set Target — {selected.name}</h2>
                        <div>
                            <label className="label">Month</label>
                            <input type="month" className="input" value={targetForm.target_month}
                                onChange={e => setTargetForm(f => ({ ...f, target_month: e.target.value }))}
                                required min={thisMonthISO} />
                        </div>
                        <div>
                            <label className="label">Target Amount (₹)</label>
                            <input type="number" step="1000" min="0" className="input" value={targetForm.target_amount}
                                onChange={e => setTargetForm(f => ({ ...f, target_amount: e.target.value }))} required />
                        </div>
                        <button type="submit" className="btn-primary" disabled={saving}>
                            {saving ? 'Saving…' : '🎯 Set Target'}
                        </button>
                        <button type="button" className="btn-secondary" onClick={() => setSelected(null)}>Cancel</button>
                    </form>
                </div>
            )}

            <div className="px-4 py-3">
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-3">{thisMonthLabel} — Team Performance</p>
                {loading ? (
                    <div className="flex justify-center py-10">
                        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : members.length === 0 ? (
                    <div className="text-center py-10 text-gray-400">
                        <p className="text-5xl mb-3">👥</p>
                        <p>No salespersons assigned to you yet.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {members.map(m => {
                            const tgt = getTarget(m.id);
                            const achieved = tgt?.achieved_amount || 0;
                            const target = tgt?.target_amount || 0;
                            const pct = target > 0 ? Math.min(100, (achieved / target) * 100) : 0;
                            return (
                                <div key={m.id} className="card">
                                    <div className="flex items-start justify-between mb-2">
                                        <div>
                                            <p className="font-semibold text-gray-800">{m.name}</p>
                                            <p className="text-xs text-gray-500">📞 {m.phone || '—'}</p>
                                        </div>
                                        <div className="flex gap-2 items-center">
                                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${m.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                                                {m.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Target progress */}
                                    {tgt ? (
                                        <div>
                                            <div className="flex justify-between text-xs text-gray-500 mb-1">
                                                <span>Achievement: <strong className="text-gray-700">{pct.toFixed(1)}%</strong></span>
                                                <span>₹{achieved.toLocaleString('en-IN')} / ₹{target.toLocaleString('en-IN')}</span>
                                            </div>
                                            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                                <div className={`h-full rounded-full ${pct >= 100 ? 'bg-green-500' : pct >= 60 ? 'bg-brand-500' : 'bg-yellow-400'} transition-all`}
                                                    style={{ width: `${pct}%` }} />
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-xs text-gray-400 italic">No target set for this month</p>
                                    )}

                                    <div className="mt-2 pt-2 border-t border-gray-100 flex gap-2">
                                        <button onClick={() => { setSelected(m); setTargetForm({ target_amount: '', target_month: thisMonthISO }); }}
                                            className="flex-1 text-xs py-2 bg-brand-50 text-brand-700 border border-brand-200 rounded-lg font-medium">
                                            🎯 Set Target
                                        </button>
                                        <button onClick={() => navigate(`/orders?salesperson_id=${m.id}`)}
                                            className="flex-1 text-xs py-2 bg-gray-50 text-gray-700 border border-gray-200 rounded-lg font-medium">
                                            📋 View Orders
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
            <BottomNav />
        </div>
    );
}
