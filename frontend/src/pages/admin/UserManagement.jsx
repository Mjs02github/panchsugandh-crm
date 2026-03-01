import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';
import BottomNav from '../../components/BottomNav';

// ── Role display helpers ──────────────────────────────────
const ROLE_DISPLAY = {
    super_admin: { label: 'Super Admin', badge: 'bg-purple-100 text-purple-800' },
    admin: { label: 'Admin', badge: 'bg-red-100 text-red-700' },
    sales_officer: { label: 'Sales Officer', badge: 'bg-blue-100 text-blue-700' },
    salesperson: { label: 'Salesperson', badge: 'bg-brand-100 text-brand-700' },
    bill_operator: { label: 'Bill Operator', badge: 'bg-yellow-100 text-yellow-700' },
    delivery_incharge: { label: 'Delivery In-charge', badge: 'bg-green-100 text-green-700' },
    store_incharge: { label: 'Store In-charge', badge: 'bg-teal-100 text-teal-700' },
};

const ROLE_ORDER = ['super_admin', 'admin', 'sales_officer', 'salesperson', 'bill_operator', 'delivery_incharge', 'store_incharge'];

function RoleBadge({ role }) {
    const r = ROLE_DISPLAY[role] || { label: role, badge: 'bg-gray-100 text-gray-600' };
    return <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${r.badge}`}>{r.label}</span>;
}

// ── Empty form factory ────────────────────────────────────
const emptyForm = () => ({
    name: '', email: '', phone: '', password: '', role_id: '', manager_id: '',
});

// ══════════════════════════════════════════════════════════
// Main Component
// ══════════════════════════════════════════════════════════
export default function UserManagement() {
    const { user: me } = useAuth();

    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);

    // Create form
    const [showCreate, setShowCreate] = useState(false);
    const [form, setForm] = useState(emptyForm());
    const [creating, setCreating] = useState(false);
    const [createErr, setCreateErr] = useState('');
    const [createOk, setCreateOk] = useState('');

    // Edit modal
    const [editUser, setEditUser] = useState(null); // full user object
    const [editForm, setEditForm] = useState({});
    const [editLoading, setEditLoading] = useState(false);
    const [editErr, setEditErr] = useState('');

    // Role filter tab
    const [tab, setTab] = useState('all');

    // ── Load ──────────────────────────────────────────────
    const load = () => {
        setLoading(true);
        Promise.all([
            api.get('/users').then(r => r.data),
            api.get('/users/roles/list').then(r => r.data),
        ]).then(([u, r]) => {
            setUsers(u);
            setRoles(r);
        }).finally(() => setLoading(false));
    };
    useEffect(() => { load(); }, []);

    // ── Computed ──────────────────────────────────────────
    const salesOfficers = users.filter(u => u.role === 'sales_officer');
    const selectedRole = roles.find(r => String(r.id) === String(form.role_id));

    const displayedUsers = tab === 'all'
        ? users
        : users.filter(u => u.role === tab);

    const uniqueRoles = ['all', ...ROLE_ORDER.filter(r => users.some(u => u.role === r))];

    // ── Create user ───────────────────────────────────────
    const handleCreate = async (e) => {
        e.preventDefault();
        setCreateErr(''); setCreating(true);
        try {
            await api.post('/users', form);
            setCreateOk('✅ User created successfully!');
            setForm(emptyForm());
            setShowCreate(false);
            load();
        } catch (err) {
            setCreateErr(err.response?.data?.error || 'Failed to create user.');
        } finally { setCreating(false); }
    };

    // ── Toggle active ─────────────────────────────────────
    const toggleActive = async (u) => {
        // Prevent deactivating own account
        if (u.id === me?.id) return alert('You cannot deactivate your own account.');
        // Only super_admin can deactivate other admins
        if (u.role === 'admin' && me?.role !== 'super_admin') return alert('Only Super Admin can deactivate Admin accounts.');
        try {
            await api.patch(`/users/${u.id}`, { is_active: !u.is_active });
            load();
        } catch { }
    };

    // ── Open edit modal ───────────────────────────────────
    const openEdit = (u) => {
        setEditUser(u);
        setEditForm({ name: u.name, phone: u.phone || '', role_id: '', manager_id: u.manager_id || '', new_password: '' });
        setEditErr('');
    };

    const handleEdit = async (e) => {
        e.preventDefault();
        setEditLoading(true); setEditErr('');
        const payload = {};
        if (editForm.name && editForm.name !== editUser.name) payload.name = editForm.name;
        if (editForm.phone !== undefined) payload.phone = editForm.phone;
        if (editForm.role_id) payload.role_id = editForm.role_id;
        if (editForm.manager_id !== undefined) payload.manager_id = editForm.manager_id || null;
        if (editForm.new_password) payload.password = editForm.new_password;

        if (!Object.keys(payload).length) {
            setEditErr('No changes made.');
            setEditLoading(false);
            return;
        }
        try {
            await api.patch(`/users/${editUser.id}`, payload);
            setEditUser(null);
            load();
        } catch (err) {
            setEditErr(err.response?.data?.error || 'Failed to update.');
        } finally { setEditLoading(false); }
    };

    // ── Role display name helper ──────────────────────────
    const roleName = (r) => (ROLE_DISPLAY[r]?.label || r);

    return (
        <div className="pb-24">
            {/* Header */}
            <div className="page-header">
                <h1 className="text-lg font-semibold flex-1">User Management</h1>
                <span className="text-xs text-gray-500">{users.length} users</span>
                <button onClick={() => { setShowCreate(!showCreate); setCreateErr(''); setCreateOk(''); }}
                    className="text-sm bg-brand-600 text-white px-3 py-1.5 rounded-xl font-medium ml-2">
                    {showCreate ? '✕' : '+ Add User'}
                </button>
            </div>

            {/* ── Create User Form ── */}
            {showCreate && (
                <form onSubmit={handleCreate} className="mx-4 mt-3 card space-y-3 border-brand-200">
                    <h2 className="font-bold text-gray-800">Create New User</h2>
                    {createErr && <p className="text-red-600 text-sm p-2 bg-red-50 rounded-lg">{createErr}</p>}
                    {createOk && <p className="text-green-600 text-sm p-2 bg-green-50 rounded-lg">{createOk}</p>}

                    <div>
                        <label className="label">Full Name *</label>
                        <input className="input" value={form.name}
                            onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="label">Email *</label>
                            <input className="input" type="email" value={form.email}
                                onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
                        </div>
                        <div>
                            <label className="label">Phone</label>
                            <input className="input" type="tel" value={form.phone}
                                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                        </div>
                    </div>
                    <div>
                        <label className="label">Password *</label>
                        <input className="input" type="password" value={form.password}
                            onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required minLength="6" />
                    </div>
                    <div>
                        <label className="label">Role *</label>
                        <select className="input" value={form.role_id}
                            onChange={e => setForm(f => ({ ...f, role_id: e.target.value }))} required>
                            <option value="">Select role…</option>
                            {roles.map(r => (
                                <option key={r.id} value={r.id}>
                                    {roleName(r.name)}
                                </option>
                            ))}
                        </select>
                        {/* Access hint */}
                        {selectedRole && (
                            <p className="text-xs text-gray-400 mt-1">
                                {selectedRole.name === 'salesperson' && '📋 Can enter orders & payments'}
                                {selectedRole.name === 'bill_operator' && '📄 Can bill pending orders'}
                                {selectedRole.name === 'delivery_incharge' && '🚚 Can mark deliveries (remark required)'}
                                {selectedRole.name === 'store_incharge' && '🏪 Can manage retailers, areas, products'}
                                {selectedRole.name === 'sales_officer' && '👥 Manages assigned salespersons'}
                                {selectedRole.name === 'admin' && '⚙️ Full access (no super admin controls)'}
                                {selectedRole.name === 'super_admin' && '🔑 Full system access'}
                            </p>
                        )}
                    </div>

                    {/* Manager dropdown only for salesperson */}
                    {selectedRole?.name === 'salesperson' && (
                        <div>
                            <label className="label">Assign to Sales Officer</label>
                            <select className="input" value={form.manager_id}
                                onChange={e => setForm(f => ({ ...f, manager_id: e.target.value }))}>
                                <option value="">No Sales Officer (standalone)</option>
                                {salesOfficers.map(so => (
                                    <option key={so.id} value={so.id}>{so.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <button type="submit" className="btn-primary" disabled={creating}>
                        {creating ? 'Creating…' : '✅ Create User'}
                    </button>
                </form>
            )}

            {/* ── Role Tab Filter ── */}
            <div className="px-4 pt-3 pb-1 overflow-x-auto">
                <div className="flex gap-2 min-w-max">
                    {uniqueRoles.map(r => (
                        <button key={r} onClick={() => setTab(r)}
                            className={`text-xs px-3 py-1.5 rounded-full font-medium border transition-all whitespace-nowrap ${tab === r
                                    ? 'bg-brand-600 text-white border-brand-600'
                                    : 'border-gray-200 text-gray-600 bg-white'
                                }`}>
                            {r === 'all' ? `All (${users.length})` : `${roleName(r)} (${users.filter(u => u.role === r).length})`}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── User List ── */}
            <div className="px-4 py-2 space-y-2">
                {loading ? (
                    <div className="flex justify-center py-10">
                        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : displayedUsers.length === 0 ? (
                    <div className="text-center py-10 text-gray-400">No users found</div>
                ) : displayedUsers.map(u => (
                    <div key={u.id} className={`card ${!u.is_active ? 'opacity-50' : ''}`}>
                        <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                                    <p className="font-semibold text-gray-800 truncate">{u.name}</p>
                                    <RoleBadge role={u.role} />
                                    {!u.is_active && <span className="text-[10px] text-red-500 font-medium">INACTIVE</span>}
                                    {u.id === me?.id && <span className="text-[10px] text-brand-600 font-medium">(You)</span>}
                                </div>
                                <p className="text-xs text-gray-500 truncate">{u.email}</p>
                                {u.phone && <p className="text-xs text-gray-400">📞 {u.phone}</p>}
                                {u.manager_name && <p className="text-xs text-gray-400">→ {u.manager_name}</p>}
                            </div>

                            {/* Action buttons */}
                            <div className="flex flex-col gap-1.5 shrink-0">
                                <button onClick={() => openEdit(u)}
                                    className="text-xs px-2.5 py-1.5 border border-brand-200 text-brand-700 bg-brand-50 rounded-lg font-medium">
                                    ✏️ Edit
                                </button>
                                {u.id !== me?.id && (
                                    <button onClick={() => toggleActive(u)}
                                        className={`text-xs px-2.5 py-1.5 border rounded-lg font-medium transition-all ${u.is_active
                                                ? 'border-red-200 text-red-600 bg-red-50'
                                                : 'border-green-200 text-green-600 bg-green-50'
                                            }`}>
                                        {u.is_active ? 'Deactivate' : 'Activate'}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Edit Modal ── */}
            {editUser && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-end" onClick={() => setEditUser(null)}>
                    <form onSubmit={handleEdit} onClick={e => e.stopPropagation()}
                        className="bg-white rounded-t-3xl w-full max-w-[480px] mx-auto px-5 pt-5 pb-8 space-y-4 max-h-[90dvh] overflow-y-auto">

                        {/* Handle bar */}
                        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-1" />

                        <div className="flex items-start justify-between">
                            <div>
                                <h2 className="font-bold text-gray-800 text-base">Edit User</h2>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <p className="text-sm text-gray-500">{editUser.name}</p>
                                    <RoleBadge role={editUser.role} />
                                </div>
                            </div>
                            <button type="button" onClick={() => setEditUser(null)} className="text-gray-400 text-xl">✕</button>
                        </div>

                        {editErr && <p className="text-red-600 text-sm p-2 bg-red-50 rounded-lg">{editErr}</p>}

                        <div>
                            <label className="label">Full Name</label>
                            <input className="input" value={editForm.name}
                                onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
                        </div>
                        <div>
                            <label className="label">Phone</label>
                            <input className="input" type="tel" value={editForm.phone}
                                onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} />
                        </div>

                        {/* Role change — only super_admin can change roles of admins */}
                        {(me?.role === 'super_admin' || editUser.role !== 'admin') && (
                            <div>
                                <label className="label">Change Role</label>
                                <select className="input" value={editForm.role_id}
                                    onChange={e => setEditForm(f => ({ ...f, role_id: e.target.value }))}>
                                    <option value="">Keep current: {roleName(editUser.role)}</option>
                                    {roles.map(r => (
                                        <option key={r.id} value={r.id}>{roleName(r.name)}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Manager assignment for salesperson */}
                        {(editUser.role === 'salesperson' || editForm.role_id) && (
                            <div>
                                <label className="label">Sales Officer (Manager)</label>
                                <select className="input" value={editForm.manager_id}
                                    onChange={e => setEditForm(f => ({ ...f, manager_id: e.target.value }))}>
                                    <option value="">No Sales Officer</option>
                                    {salesOfficers.map(so => (
                                        <option key={so.id} value={so.id}>{so.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Password reset */}
                        <div>
                            <label className="label">Reset Password</label>
                            <input className="input" type="password" value={editForm.new_password || ''}
                                onChange={e => setEditForm(f => ({ ...f, new_password: e.target.value }))}
                                placeholder="Leave blank to keep current" minLength="6" />
                            {editForm.new_password && editForm.new_password.length < 6 && (
                                <p className="text-xs text-red-500 mt-0.5">Minimum 6 characters</p>
                            )}
                        </div>

                        <div className="flex gap-2 pt-2">
                            <button type="submit" className="flex-1 py-3 bg-brand-600 text-white rounded-xl font-semibold text-sm"
                                disabled={editLoading}>
                                {editLoading ? 'Saving…' : '✅ Save Changes'}
                            </button>
                            <button type="button" onClick={() => setEditUser(null)}
                                className="flex-1 py-3 border border-gray-300 text-gray-600 rounded-xl font-semibold text-sm">
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <BottomNav />
        </div>
    );
}
