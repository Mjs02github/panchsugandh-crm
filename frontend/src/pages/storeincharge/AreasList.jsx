import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api';
import BottomNav from '../../components/BottomNav';

export default function AreasList() {
    const [areas, setAreas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ name: '', city: '', state: '' });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const load = () => {
        setLoading(true);
        api.get('/areas').then(r => setAreas(r.data)).finally(() => setLoading(false));
    };
    useEffect(() => { load(); }, []);

    const handleSave = async (e) => {
        e.preventDefault();
        setError(''); setSaving(true);
        try {
            await api.post('/areas', form);
            setSuccess('Area added!');
            setForm({ name: '', city: '', state: '' });
            setShowForm(false);
            load();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to save.');
        } finally { setSaving(false); }
    };

    return (
        <div className="pb-24">
            <div className="page-header">
                <h1 className="text-lg font-semibold flex-1">Areas</h1>
                <button onClick={() => { setShowForm(!showForm); setError(''); setSuccess(''); }}
                    className="text-sm bg-brand-600 text-white px-3 py-1.5 rounded-xl font-medium">
                    {showForm ? '✕ Close' : '+ Add Area'}
                </button>
            </div>

            {showForm && (
                <form onSubmit={handleSave} className="mx-4 mt-3 card space-y-3 border-brand-200">
                    <h2 className="font-semibold text-gray-700">New Area</h2>
                    {error && <p className="text-red-600 text-sm">{error}</p>}
                    {success && <p className="text-green-600 text-sm">{success}</p>}
                    <div>
                        <label className="label">Area Name *</label>
                        <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="label">City</label>
                            <input className="input" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
                        </div>
                        <div>
                            <label className="label">State</label>
                            <input className="input" value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))} />
                        </div>
                    </div>
                    <button type="submit" className="btn-primary" disabled={saving}>
                        {saving ? 'Saving…' : 'Save Area'}
                    </button>
                </form>
            )}

            <div className="px-4 py-3 space-y-2">
                {loading ? (
                    <div className="flex justify-center py-10">
                        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : areas.length === 0 ? (
                    <div className="text-center py-10 text-gray-400">
                        <div className="text-5xl mb-3">📍</div>
                        <p>No areas defined yet</p>
                    </div>
                ) : areas.map(a => (
                    <div key={a.id} className="card flex items-center justify-between">
                        <div>
                            <p className="font-semibold text-gray-800">{a.name}</p>
                            <p className="text-xs text-gray-500">{[a.city, a.state].filter(Boolean).join(', ') || 'No city/state'}</p>
                        </div>
                        <span className="text-2xl">📍</span>
                    </div>
                ))}
            </div>
            <BottomNav />
        </div>
    );
}
