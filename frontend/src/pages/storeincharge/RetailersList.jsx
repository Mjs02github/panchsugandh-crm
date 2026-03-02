import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';
import BottomNav from '../../components/BottomNav';
import indiaStates from '../../utils/indiaStates.json';

const CAN_EDIT = ['store_incharge', 'admin', 'super_admin'];

export default function RetailersList() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const canEdit = CAN_EDIT.includes(user?.role);

    const [retailers, setRetailers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterState, setFilterState] = useState('');
    const [filterDistrict, setFilterDistrict] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [areas, setAreas] = useState([]);
    const [form, setForm] = useState({
        firm_name: '', owner_name: '', phone: '', alt_phone: '',
        address: '', state: '', district: '', area_id: '', gst_number: '', credit_limit: '',
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const formStateObj = indiaStates.find(s => s.state === form.state);
    const formDistrictOptions = formStateObj ? formStateObj.districts : [];

    const filterStateObj = indiaStates.find(s => s.state === filterState);
    const filterDistrictOptions = filterStateObj ? filterStateObj.districts : [];

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

    const resetForm = () => setForm({
        firm_name: '', owner_name: '', phone: '', alt_phone: '',
        address: '', state: '', district: '', area_id: '', gst_number: '', credit_limit: '',
    });

    const handleSave = async (e) => {
        e.preventDefault();
        setError(''); setSaving(true);
        try {
            const payload = { ...form, address: [form.address, form.district, form.state].filter(Boolean).join(', ') };
            await api.post('/retailers', payload);
            setSuccess('✅ Party added successfully!');
            setShowForm(false);
            resetForm();
            load(search);
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to save.');
        } finally { setSaving(false); }
    };

    const filteredRetailers = retailers.filter(r => {
        const matchesState = !filterState || (r.address || '').includes(filterState);
        const matchesDistrict = !filterDistrict || (r.address || '').includes(filterDistrict);
        return matchesState && matchesDistrict;
    });

    return (
        <div className="pb-24">
            {/* Header */}
            <div className="page-header">
                <h1 className="text-lg font-semibold flex-1">
                    {canEdit ? 'Retailers / Parties' : 'Parties'}
                </h1>
                <span className="text-xs text-gray-400 mr-2">{retailers.length} listed</span>
                <button onClick={() => { setShowForm(!showForm); setError(''); }}
                    className="text-sm bg-brand-600 text-white px-3 py-1.5 rounded-xl font-medium">
                    {showForm ? '✕ Close' : '+ Add Party'}
                </button>
            </div>

            {/* Success toast */}
            {success && (
                <div className="mx-4 mt-2 p-3 bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl">
                    {success}
                </div>
            )}

            {/* Search and Filters */}
            <div className="px-4 pt-3 pb-2 space-y-2">
                <input type="search" className="input" placeholder="Search by name, owner, phone…"
                    value={search} onChange={e => setSearch(e.target.value)} />
                <div className="grid grid-cols-2 gap-2">
                    <select className="input text-sm" value={filterState} onChange={e => { setFilterState(e.target.value); setFilterDistrict(''); }}>
                        <option value="">All States</option>
                        {indiaStates.map(s => <option key={s.state} value={s.state}>{s.state}</option>)}
                    </select>
                    <select className="input text-sm" value={filterDistrict} onChange={e => setFilterDistrict(e.target.value)} disabled={!filterState}>
                        <option value="">All Districts</option>
                        {filterDistrictOptions.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                </div>
            </div>

            {/* ── Add Form ── */}
            {showForm && (
                <form onSubmit={handleSave} className="mx-4 mb-3 card space-y-3 border-brand-200">
                    <h2 className="font-semibold text-gray-700">New Party / Retailer</h2>
                    {error && <p className="text-red-600 text-sm p-2 bg-red-50 rounded-lg">{error}</p>}

                    <div>
                        <label className="label">Firm / Shop Name *</label>
                        <input className="input" value={form.firm_name}
                            onChange={e => setForm(f => ({ ...f, firm_name: e.target.value }))} required />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="label">Owner Name</label>
                            <input className="input" value={form.owner_name}
                                onChange={e => setForm(f => ({ ...f, owner_name: e.target.value }))} />
                        </div>
                        <div>
                            <label className="label">Phone</label>
                            <input className="input" type="tel" value={form.phone}
                                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="label">Alt. Phone</label>
                            <input className="input" type="tel" value={form.alt_phone}
                                onChange={e => setForm(f => ({ ...f, alt_phone: e.target.value }))} />
                        </div>
                        <div>
                            <label className="label">Area / Location *</label>
                            <input className="input" list="areas-list" value={form.area_id}
                                placeholder="Type new area or select..."
                                onChange={e => setForm(f => ({ ...f, area_id: e.target.value }))} required />
                            <datalist id="areas-list">
                                {areas.map(a => <option key={a.id} value={a.name} />)}
                            </datalist>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="label">State *</label>
                            <select className="input" value={form.state}
                                onChange={e => setForm(f => ({ ...f, state: e.target.value, district: '' }))} required>
                                <option value="">Select State…</option>
                                {indiaStates.map(s => <option key={s.state} value={s.state}>{s.state}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="label">District *</label>
                            <select className="input" value={form.district}
                                onChange={e => setForm(f => ({ ...f, district: e.target.value }))} required disabled={!form.state}>
                                <option value="">Select District…</option>
                                {formDistrictOptions.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="label">Street Address</label>
                        <textarea className="input" rows="2" value={form.address}
                            onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="label">GST No.</label>
                            <input className="input" value={form.gst_number}
                                onChange={e => setForm(f => ({ ...f, gst_number: e.target.value }))} />
                        </div>
                        {canEdit && (
                            <div>
                                <label className="label">Credit Limit (₹)</label>
                                <input className="input" type="number" min="0" value={form.credit_limit}
                                    onChange={e => setForm(f => ({ ...f, credit_limit: e.target.value }))} />
                            </div>
                        )}
                    </div>

                    <button type="submit" className="btn-primary" disabled={saving}>
                        {saving ? 'Saving…' : '✅ Add Party'}
                    </button>
                </form>
            )}

            {/* ── Retailers List ── */}
            <div className="px-4 space-y-2.5">
                {loading ? (
                    <div className="flex justify-center py-10">
                        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : filteredRetailers.length === 0 ? (
                    <div className="text-center py-10 text-gray-400">
                        <div className="text-5xl mb-3">🏪</div>
                        <p>No parties found.</p>
                        <p className="text-xs mt-1">Tap "+ Add Party" to create one.</p>
                    </div>
                ) : filteredRetailers.map(r => (
                    <div key={r.id} className="card">
                        <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                                <p className="font-semibold text-gray-800 truncate">{r.firm_name}</p>
                                <p className="text-xs text-gray-500">
                                    {r.owner_name || '—'} · {r.area_name || 'No area'}
                                </p>
                                {r.phone && <p className="text-xs text-gray-400 mt-0.5">📞 {r.phone}</p>}
                            </div>
                            <div className="text-right shrink-0">
                                <p className="text-[10px] text-gray-400">Outstanding</p>
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
