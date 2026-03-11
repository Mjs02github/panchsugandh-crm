import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';
import indiaStates from '../../utils/indiaStates.json';

const CAN_EDIT = ['store_incharge', 'admin', 'super_admin'];

export default function RetailersList() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const canEdit = CAN_EDIT.includes(user?.role);
    const isBillOperator = user?.role === 'bill_operator';
    const canRequestEdit = canEdit || isBillOperator;

    const [retailers, setRetailers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterState, setFilterState] = useState('');
    const [filterDistrict, setFilterDistrict] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [areas, setAreas] = useState([]);
    const [form, setForm] = useState({
        id: '', firm_name: '', owner_name: '', phone: '', alt_phone: '',
        address: '', state: '', district: '', area_id: '', is_new_area: false, gst_number: '', credit_limit: '',
    });
    const [saving, setSaving] = useState(false);
    const [fetchingGST, setFetchingGST] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleGSTLookup = async () => {
        if (!form.gst_number || form.gst_number.length !== 15) {
            setError('Please enter a valid 15-digit GST number first.');
            return;
        }
        setFetchingGST(true);
        setError('');
        try {
            const res = await api.get(`/retailers/gst-lookup/${form.gst_number.toUpperCase()}`);
            const data = res.data;
            setForm(f => ({
                ...f,
                firm_name: data.firm_name || f.firm_name,
                owner_name: data.owner_name || f.owner_name,
                address: data.address || f.address,
                state: data.state || f.state,
                district: data.district || f.district
            }));
            setSuccess('✅ Details fetched from GST records!');
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to fetch GST details.');
        } finally {
            setFetchingGST(false);
        }
    };

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
        id: '', firm_name: '', owner_name: '', phone: '', alt_phone: '',
        address: '', state: '', district: '', area_id: '', is_new_area: false, gst_number: '', credit_limit: '',
    });

    const getGPSLocation = async () => {
        try {
            if (window.Capacitor?.isNativePlatform()) {
                const { Geolocation } = await import('@capacitor/geolocation');
                const permStatus = await Geolocation.checkPermissions();
                if (permStatus.location !== 'granted') {
                    const request = await Geolocation.requestPermissions();
                    if (request.location !== 'granted') return { latitude: null, longitude: null };
                }
                const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 5000 });
                return { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
            } else if (navigator.geolocation) {
                const pos = await new Promise((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 });
                });
                return { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
            }
        } catch (err) {
            console.warn('GPS Error:', err);
        }
        return { latitude: null, longitude: null };
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setError(''); setSaving(true);
        try {
            const gps = await getGPSLocation();
            
            // Combine address parts into a single string for the database
            const fullAddress = [form.address, form.district, form.state].filter(Boolean).join(', ');

            const payload = {
                ...form,
                address: fullAddress,
                latitude: gps.latitude,
                longitude: gps.longitude
            };

            // Remove internal UI fields that don't belong in the Retailers table
            delete payload.id;
            delete payload.state;
            delete payload.district;
            delete payload.is_new_area;
            
            if (form.id) {
                // UPDATE
                if (isBillOperator && !canEdit) {
                    // Bill operator - submit request
                    await api.post('/retailers/edit-request', {
                        retailer_id: form.id,
                        proposed_data: payload
                    });
                    setSuccess('✅ Edit request submitted for admin approval!');
                } else {
                    // Admin/Store Incharge - direct update
                    await api.patch(`/retailers/${form.id}`, payload);
                    setSuccess('✅ Party updated successfully!');
                }
            } else {
                // CREATE
                await api.post('/retailers', payload);
                setSuccess(gps.latitude ? '✅ Party added successfully with GPS!' : '✅ Party added successfully!');
            }
            
            setShowForm(false);
            resetForm();
            load(search);
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to save.');
        } finally { setSaving(false); }
    };

    const handleUpdateGPS = async (r) => {
        if (!window.confirm(`Update GPS location for ${r.firm_name}? This will use your current location.`)) return;
        setSaving(true);
        try {
            const gps = await getGPSLocation();
            if (!gps.latitude) {
                setError('Failed to capture GPS. Please ensure location permissions are granted.');
                return;
            }
            await api.patch(`/retailers/${r.id}`, {
                latitude: gps.latitude,
                longitude: gps.longitude
            });
            setSuccess('📍 Retailer location updated successfully!');
            load(search);
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError('Failed to update GPS.');
        } finally {
            setSaving(false);
        }
    };

    const startEdit = (r) => {
        const addrParts = (r.address || '').split(', ');
        const state = addrParts.length >= 2 ? addrParts[addrParts.length - 1] : '';
        const district = addrParts.length >= 3 ? addrParts[addrParts.length - 2] : '';
        const street = addrParts.length >= 3 ? addrParts.slice(0, -2).join(', ') : r.address;

        setForm({
            id: r.id,
            firm_name: r.firm_name || '',
            owner_name: r.owner_name || '',
            phone: r.phone || '',
            alt_phone: r.alt_phone || '',
            address: street || '',
            state: state || '', 
            district: district || '',
            area_id: r.area_id || '',
            gst_number: r.gst_number || '',
            credit_limit: r.credit_limit || '',
            is_new_area: false
        });
        setShowForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const filteredRetailers = retailers.filter(r => {
        const addressLower = (r.address || '').toLowerCase();

        let matchesLoc = true;
        if (filterDistrict) {
            matchesLoc = !r.address || addressLower.includes(filterDistrict.toLowerCase());
        } else if (filterState) {
            matchesLoc = !r.address || addressLower.includes(filterState.toLowerCase());
        }

        return matchesLoc;
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

            {/* ── Add/Edit Form ── */}
            {showForm && (
                <form onSubmit={handleSave} className="mx-4 mb-3 card space-y-3 border-brand-200">
                    <h2 className="font-semibold text-gray-700">
                        {form.id ? 'Edit Party' : 'New Party / Retailer'}
                    </h2>
                    {isBillOperator && !canEdit && form.id && (
                        <div className="bg-amber-50 border border-amber-200 p-2 rounded-lg text-amber-700 text-xs flex items-start gap-2">
                            <span>ℹ️</span> Changes will be submitted for Admin approval.
                        </div>
                    )}
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
                            {form.is_new_area ? (
                                <div className="flex gap-2">
                                    <input className="input flex-1" value={form.area_id}
                                        placeholder="Enter new area name..."
                                        onChange={e => setForm(f => ({ ...f, area_id: e.target.value }))} required autoFocus />
                                    <button type="button" onClick={() => setForm(f => ({ ...f, is_new_area: false, area_id: '' }))}
                                        className="text-gray-500 px-2 text-xl font-bold">✕</button>
                                </div>
                            ) : (
                                <select className="input" value={form.area_id}
                                    onChange={e => {
                                        if (e.target.value === '__NEW__') setForm(f => ({ ...f, is_new_area: true, area_id: '' }));
                                        else setForm(f => ({ ...f, area_id: e.target.value }));
                                    }} required>
                                    <option value="">Select Area…</option>
                                    {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                    <option value="__NEW__" className="font-bold text-brand-600">+ Add New Area</option>
                                </select>
                            )}
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
                            <div className="flex gap-1">
                                <input className="input flex-1" value={form.gst_number}
                                    onChange={e => setForm(f => ({ ...f, gst_number: e.target.value.toUpperCase() }))} 
                                    placeholder="e.g. 07AACCU3842M1ZP" />
                                <button 
                                    type="button" 
                                    onClick={handleGSTLookup}
                                    disabled={fetchingGST}
                                    className="bg-brand-50 text-brand-600 px-2 py-1.5 rounded-lg text-xs font-bold border border-brand-200 hover:bg-brand-100 disabled:opacity-50"
                                >
                                    {fetchingGST ? '...' : '🔍 Fetch'}
                                </button>
                            </div>
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
                        {saving ? 'Saving…' : form.id ? '💾 Save Changes' : '✅ Add Party'}
                    </button>
                    {form.id && (
                        <button type="button" onClick={() => { setShowForm(false); resetForm(); }} className="w-full py-2 text-sm text-gray-500 font-medium">
                            Cancel
                        </button>
                    )}
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
                                <p className="font-semibold text-gray-800 truncate flex items-center gap-2">
                                    {r.firm_name}
                                    {(!r.latitude || !r.longitude) && (
                                        <span className="bg-red-50 text-red-600 text-[9px] px-1.5 py-0.5 rounded-full border border-red-100 font-bold whitespace-nowrap">
                                            📍 Location Missing
                                        </span>
                                    )}
                                </p>
                                <p className="text-xs text-gray-500">
                                    {r.owner_name || '—'} · {r.area_name || 'No area'}
                                </p>
                                {r.phone && <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                                    <span>📞</span> {r.phone}
                                    {r.latitude && r.longitude && (
                                        <span className="text-[9px] text-green-600 font-medium ml-2">📍 GPS Saved</span>
                                    )}
                                </p>}
                            </div>
                            <div className="text-right shrink-0 flex flex-col items-end gap-2">
                                <div>
                                    <p className="text-[10px] text-gray-400">Outstanding</p>
                                    <p className={`font-bold text-sm ${parseFloat(r.outstanding) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                        ₹{parseFloat(r.outstanding || 0).toLocaleString('en-IN')}
                                    </p>
                                </div>
                                <div className="flex gap-1.5">
                                    {(!r.latitude || !r.longitude) && ['salesperson', 'sales_officer'].includes(user?.role) && (
                                        <button 
                                            onClick={() => handleUpdateGPS(r)}
                                            className="text-[10px] bg-blue-50 text-blue-600 px-2 py-1 rounded border border-blue-100 font-bold"
                                        >
                                            📍 Set Loc
                                        </button>
                                    )}
                                    {canRequestEdit && (
                                        <button 
                                            onClick={() => startEdit(r)}
                                            className="text-[10px] bg-brand-50 text-brand-600 px-2 py-1 rounded border border-brand-100 font-bold"
                                        >
                                            ✏️ Edit
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

                    </div>
    );
}
