import { useState, useEffect } from 'react';
import api from '../../api';
import BottomNav from '../../components/BottomNav';

export default function ProductsList() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editStock, setEditStock] = useState(null); // { id, qty }
    const [form, setForm] = useState({
        name: '', sku: '', category: '', unit: 'PCS', mrp: '', sale_price: '',
        hsn_code: '', gst_rate: '0', description: '', initial_stock: '0',
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const CATEGORIES = ['Dhoop', 'Agarbatti', 'Pooja Items', 'Sambrani', 'Guggal', 'Other'];

    const load = (q = '') => {
        setLoading(true);
        api.get('/products', { params: q ? { search: q } : {} })
            .then(r => setProducts(r.data))
            .finally(() => setLoading(false));
    };
    useEffect(() => { load(); }, []);
    useEffect(() => {
        const t = setTimeout(() => load(search), 400);
        return () => clearTimeout(t);
    }, [search]);

    const handleSave = async (e) => {
        e.preventDefault(); setError(''); setSaving(true);
        try {
            await api.post('/products', form);
            setSuccess('Product added!');
            setShowForm(false);
            setForm({ name: '', sku: '', category: '', unit: 'PCS', mrp: '', sale_price: '', hsn_code: '', gst_rate: '0', description: '', initial_stock: '0' });
            load(search);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to save.');
        } finally { setSaving(false); }
    };

    const updateStock = async (productId) => {
        try {
            await api.patch(`/products/${productId}/stock`, { qty_on_hand: parseInt(editStock.qty) });
            setEditStock(null);
            load(search);
        } catch { }
    };

    return (
        <div className="pb-24">
            <div className="page-header">
                <h1 className="text-lg font-semibold flex-1">Products & Inventory</h1>
                <button onClick={() => { setShowForm(!showForm); setError(''); }}
                    className="text-sm bg-brand-600 text-white px-3 py-1.5 rounded-xl font-medium">
                    {showForm ? '✕' : '+ Add'}
                </button>
            </div>

            <div className="px-4 pt-3 pb-2">
                <input type="search" className="input" placeholder="Search products…"
                    value={search} onChange={e => setSearch(e.target.value)} />
            </div>

            {showForm && (
                <form onSubmit={handleSave} className="mx-4 mb-3 card space-y-3">
                    <h2 className="font-semibold text-gray-700">New Product</h2>
                    {error && <p className="text-red-600 text-sm">{error}</p>}
                    {success && <p className="text-green-600 text-sm">{success}</p>}
                    <div>
                        <label className="label">Product Name *</label>
                        <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="label">SKU</label>
                            <input className="input" value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} />
                        </div>
                        <div>
                            <label className="label">Unit</label>
                            <select className="input" value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}>
                                {['PCS', 'BOX', 'KG', 'DOZEN', 'PACK', 'SET'].map(u => <option key={u}>{u}</option>)}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="label">Category</label>
                        <select className="input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                            <option value="">Select…</option>
                            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="label">MRP (₹)</label>
                            <input className="input" type="number" step="0.01" value={form.mrp} onChange={e => setForm(f => ({ ...f, mrp: e.target.value }))} />
                        </div>
                        <div>
                            <label className="label">Sale Price (₹) *</label>
                            <input className="input" type="number" step="0.01" value={form.sale_price} onChange={e => setForm(f => ({ ...f, sale_price: e.target.value }))} required />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="label">GST %</label>
                            <select className="input" value={form.gst_rate} onChange={e => setForm(f => ({ ...f, gst_rate: e.target.value }))}>
                                {['0', '5', '12', '18', '28'].map(g => <option key={g} value={g}>{g}%</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="label">HSN Code</label>
                            <input className="input" value={form.hsn_code} onChange={e => setForm(f => ({ ...f, hsn_code: e.target.value }))} />
                        </div>
                    </div>
                    <div>
                        <label className="label">Opening Stock (qty)</label>
                        <input className="input" type="number" min="0" value={form.initial_stock} onChange={e => setForm(f => ({ ...f, initial_stock: e.target.value }))} />
                    </div>
                    <button type="submit" className="btn-primary" disabled={saving}>
                        {saving ? 'Saving…' : 'Save Product'}
                    </button>
                </form>
            )}

            <div className="px-4 space-y-3">
                {loading ? (
                    <div className="flex justify-center py-10">
                        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : products.map(p => (
                    <div key={p.id} className="card">
                        <div className="flex items-start justify-between mb-1">
                            <div>
                                <p className="font-semibold text-gray-800">{p.name}</p>
                                <p className="text-xs text-gray-500">{p.category || '—'} • {p.unit} • SKU: {p.sku || '—'}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-bold text-brand-700">₹{p.sale_price}</p>
                                <p className="text-xs text-gray-400">MRP ₹{p.mrp}</p>
                            </div>
                        </div>
                        {/* Stock row */}
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500">Stock:</span>
                                <span className={`font-bold text-sm ${p.qty_on_hand < 10 ? 'text-red-600' : 'text-green-600'}`}>
                                    {p.qty_on_hand} {p.unit}
                                </span>
                                {p.qty_on_hand < 10 && <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">Low</span>}
                            </div>
                            {editStock?.id === p.id ? (
                                <div className="flex items-center gap-1">
                                    <input type="number" className="input w-20 py-1 text-sm" value={editStock.qty}
                                        onChange={e => setEditStock(s => ({ ...s, qty: e.target.value }))} />
                                    <button onClick={() => updateStock(p.id)} className="text-xs bg-green-600 text-white px-2 py-1 rounded-lg">✓</button>
                                    <button onClick={() => setEditStock(null)} className="text-xs border border-gray-300 px-2 py-1 rounded-lg">✕</button>
                                </div>
                            ) : (
                                <button onClick={() => setEditStock({ id: p.id, qty: p.qty_on_hand })}
                                    className="text-xs text-brand-600 border border-brand-300 px-2.5 py-1 rounded-lg font-medium">
                                    Edit Stock
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
            <BottomNav />
        </div>
    );
}
