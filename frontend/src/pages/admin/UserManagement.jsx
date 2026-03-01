import { useState, useEffect } from 'react';
import api from '../../api';
import BottomNav from '../../components/BottomNav';

export default function UserManagement() {
    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({
        name: '', email: '', phone: '', password: '', role_id: '', manager_id: '',
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const load = () => {
        setLoading(true);
        api.get('/users').then(r => setUsers(r.data)).finally(() => setLoading(false));
    };
    useEffect(() => {
        load();
        api.get('/users/roles/list').then(r => setRoles(r.data));
    }, []);

    const handleSave = async (e) => {
        e.preventDefault(); setError(''); setSaving(true);
        try {
            await api.post('/users', form);
            setSuccess('User created!');
            setShowForm(false);
            setForm({ name: '', email: '', phone: '', password: '', role_id: '', manager_id: '' });
            load();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to create user.');
        } finally { setSaving(false); }
    };

    const toggleActive = async (user) => {
        try {
            await api.patch(`/users/${user.id}`, { is_active: !user.is_active });
            load();
        } catch { }
    };

    const ROLE_COLORS = {
        super_admin: 'bg-purple-100 text-purple-700',
        admin: 'bg-red-100 text-red-700',
        sales_officer: 'bg-blue-100 text-blue-700',
        salesperson: 'bg-brand-100 text-brand-700',
        bill_operator: 'bg-yellow-100 text-yellow-700',
        delivery_incharge: 'bg-green-100 text-green-700',
        store_incharge: 'bg-teal-100 text-teal-700',
    };

    // Get Sales Officers for manager dropdown
    const salesOfficers = users.filter(u => u.role === 'sales_officer');
    const selectedRole = roles.find(r => String(r.id) === String(form.role_id));

    return (
        <div className="pb-24">
            <div className="page-header">
                <h1 className="text-lg font-semibold flex-1">User Management</h1>
                <button onClick={() => { setShowForm(!showForm); setError(''); setSuccess(''); }}
                    className="text-sm bg-brand-600 text-white px-3 py-1.5 rounded-xl font-medium">
                    {showForm ? '✕' : '+ Add User'}
                </button>
            </div>

            {showForm && (
                <form onSubmit={handleSave} className="mx-4 mt-3 card space-y-3">
                    <h2 className="font-semibold text-gray-700">Create New User</h2>
                    {error && <p className="text-red-600 text-sm">{error}</p>}
                    {success && <p className="text-green-600 text-sm">{success}</p>}
                    <div>
                        <label className="label">Full Name *</label>
                        <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
                    </div>
                    <div>
                        <label className="label">Email *</label>
                        <input className="input" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="label">Phone</label>
                            <input className="input" type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                        </div>
                        <div>
                            <label className="label">Password *</label>
                            <input className="input" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />
                        </div>
                    </div>
                    <div>
                        <label className="label">Role *</label>
                        <select className="input" value={form.role_id} onChange={e => setForm(f => ({ ...f, role_id: e.target.value }))} required>
                            <option value="">Select role…</option>
                            {roles.map(r => <option key={r.id} value={r.id}>{r.name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>)}
                        </select>
                    </div>
                    {/* Show manager dropdown only for salesperson role */}
                    {selectedRole?.name === 'salesperson' && salesOfficers.length > 0 && (
                        <div>
                            <label className="label">Assign to Sales Officer</label>
                            <select className="input" value={form.manager_id} onChange={e => setForm(f => ({ ...f, manager_id: e.target.value }))}>
                                <option value="">No manager</option>
                                {salesOfficers.map(so => <option key={so.id} value={so.id}>{so.name}</option>)}
                            </select>
                        </div>
                    )}
                    <button type="submit" className="btn-primary" disabled={saving}>
                        {saving ? 'Creating…' : 'Create User'}
                    </button>
                </form>
            )}

            {/* User list grouped by role */}
            <div className="px-4 py-3 space-y-2">
                {loading ? (
                    <div className="flex justify-center py-10">
                        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : users.map(u => (
                    <div key={u.id} className={`card flex items-center justify-between gap-3 ${!u.is_active ? 'opacity-50' : ''}`}>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-semibold text-gray-800 truncate">{u.name}</p>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[u.role] || 'bg-gray-100 text-gray-600'}`}>
                                    {u.role?.replace(/_/g, ' ')}
                                </span>
                            </div>
                            <p className="text-xs text-gray-500 truncate">{u.email}</p>
                            {u.manager_name && <p className="text-xs text-gray-400">→ {u.manager_name}</p>}
                        </div>
                        <button onClick={() => toggleActive(u)}
                            className={`shrink-0 text-xs px-3 py-1.5 rounded-xl font-medium border transition-all ${u.is_active
                                    ? 'border-red-200 text-red-600 bg-red-50'
                                    : 'border-green-200 text-green-600 bg-green-50'
                                }`}>
                            {u.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                    </div>
                ))}
            </div>
            <BottomNav />
        </div>
    );
}
