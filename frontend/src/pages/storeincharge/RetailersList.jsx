import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api';
import BottomNav from '../../components/BottomNav';

export default function RetailersList() {
    const navigate = useNavigate();
    const [retailers, setRetailers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [areas, setAreas] = useState([]);
    const [form, setForm] = useState({
        firm_name: '', owner_name: '', phone: '', alt_phone: '',
        address: '', area_id: '', gst_number: '', credit_limit: '',
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const load = (q = '') => {
        setLoading(true);
        api.get('/retailers', { params: q ? { search: q } : {} })
            .then(r => setRetailers(r.data))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        load();
        api.get('/areas').then(r => setAreas(r.data));
    }, []);

    useEffect(() => {
        const t = setTimeout(() => load(search), 400);
        return () => clearTimeout(t);
    }, [search]);

    const handleSave = async (e) => {
        e.preventDefault();
        setError(''); setSaving(true);
        try {
            await api.post('/retailers', form);
            setSuccess('Retailer added!');
            setShowForm(false);
            setForm({ firm_name: '', owner_name: '', phone: '', alt_phone: '', address: '', area_id: '', gst_number: '', credit_limit: '' });
            load(search);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to save.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="pb-24">
            <div className="page-header">
                <h1 className="text-lg font-semibold flex-1">Retailers / Parties</h1>
                <button onClick={() => { setShowForm(!showForm); setError(''); }}
                    className="text-sm bg-brand-600 text-white px-3 py-1.5 rounded-xl font-medium">
                    {showForm ? '✕ Close' : '+ Add'}
                </button>
            </div>

            {/* Search */}
            <div className="px-4 pt-3 pb-2">
                <input type="search" className="input" placeholder="Search by name, owner, phone…"
                    value={search} onChange={e => setSearch(e.target.value)} />
            </div>

            {/* Add Form */}
            {showForm && (
                <form onSubmit={handleSave} className="mx-4 mb-3 card space-y-3 border-brand-200">
                    <h2 className="font-semibold text-gray-700">New Retailer</h2>
                    {error && <p className="text-red-600 text-sm">{error}</p>}
                    {success && <p className="text-green-600 text-sm">{success}</p>}
                    <div>
                        <label className="label">Firm Name *</label>
                        <input className="input" value={form.firm_name} onChange={e => setForm(f => ({ ...f, firm_name: e.target.value }))} required />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="label">Owner Name</label>
                            <input className="input" value={form.owner_name} onChange={e => setForm(f => ({ ...f, owner_name: e.target.value }))} />
                        </div>
                        <div>
                            <label className="label">Phone</label>
                            <input className="input" type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="label">Alt. Phone</label>
                            <input className="input" type="tel" value={form.alt_phone} onChange={e => setForm(f => ({ ...f, alt_phone: e.target.value }))} />
                        </div>
                        <div>
                            <label className="label">GST No.</label>
                            <input className="input" value={form.gst_number} onChange={e => setForm(f => ({ ...f, gst_number: e.target.value }))} />
                        </div>
                    </div>
                    <div>
                        <label className="label">Area</label>
                        <select className="input" value={form.area_id} onChange={e => setForm(f => ({ ...f, area_id: e.target.value }))}>
                            <option value="">Select area…</option>
                            {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="label">Address</label>
                        <textarea className="input" rows="2" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
                    </div>
                    <div>
                        <label className="label">Credit Limit (₹)</label>
                        <input className="input" type="number" value={form.credit_limit} onChange={e => setForm(f => ({ ...f, credit_limit: e.target.value }))} />
                    </div>
                    <button type="submit" className="btn-primary" disabled={saving}>
                        {saving ? 'Saving…' : 'Save Retailer'}
                    </button>
                </form>
            )}

            {/* List */}
            <div className="px-4 space-y-3">
                {loading ? (
                    <div className="flex justify-center py-10">
                        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : retailers.length === 0 ? (
                    <div className="text-center py-10 text-gray-400">
                        <div className="text-5xl mb-3">🏪</div>
                        <p>No retailers found</p>
                    </div>
                ) : retailers.map(r => (
                    <div key={r.id} className="card" onClick={() => navigate(`/store/retailers/${r.id}`)}>
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="font-semibold text-gray-800">{r.firm_name}</p>
                                <p className="text-xs text-gray-500">{r.owner_name || '—'} • {r.area_name || 'No area'}</p>
                                <p className="text-xs text-gray-400 mt-0.5">📞 {r.phone || '—'}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-gray-500">Outstanding</p>
                                <p className={`font-bold text-sm ${parseFloat(r.outstanding) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                    ₹{parseFloat(r.outstanding || 0).toLocaleString('en-IN')}
                                </p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            <BottomNav />
        </div>
    );
}
