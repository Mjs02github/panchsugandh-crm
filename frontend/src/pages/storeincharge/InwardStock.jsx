import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api';

export default function InwardStock() {
    const navigate = useNavigate();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Inward Form State
    const [form, setForm] = useState({
        productId: '',
        quantity: '',
        supplier: '',
        notes: ''
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        api.get('/products')
            .then(res => setProducts(res.data || []))
            .catch(err => console.error("Failed to fetch products", err))
            .finally(() => setLoading(false));
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!form.productId || !form.quantity || form.quantity <= 0) {
            setError('Please select a product and enter a valid quantity.');
            return;
        }

        setSaving(true);
        try {
            await api.post('/products/inward', {
                product_id: form.productId,
                quantity: parseInt(form.quantity),
                supplier: form.supplier,
                notes: form.notes
            });

            setSuccess('Stock successfully inwarded!');
            setForm({ productId: '', quantity: '', supplier: '', notes: '' });

            // Refresh product list to show new stock
            const res = await api.get('/products');
            setProducts(res.data || []);

            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to inward stock.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="pb-24">
            <header className="page-header border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="w-8 h-8 flex items-center justify-center bg-white border border-gray-200 rounded-full shadow-sm">
                        <span className="text-gray-600 block leading-none relative -top-[1px]">←</span>
                    </button>
                    <h1 className="text-lg font-semibold text-gray-800">Inward Stock</h1>
                </div>
            </header>

            <main className="p-4">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                    <h2 className="text-base font-bold text-gray-800 mb-1">Record New Inventory</h2>
                    <p className="text-xs text-gray-500 mb-5">Add received stock to your existing inventory.</p>

                    {error && <div className="p-3 mb-4 bg-red-50 text-red-700 text-sm rounded-xl border border-red-100">{error}</div>}
                    {success && <div className="p-3 mb-4 bg-green-50 text-green-700 text-sm rounded-xl border border-green-100 flex items-center gap-2"><span>✅</span> {success}</div>}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="label">Select Product *</label>
                            <select
                                className="input"
                                value={form.productId}
                                onChange={e => setForm(f => ({ ...f, productId: e.target.value }))}
                                required
                            >
                                <option value="">-- Choose Product --</option>
                                {products.map(p => (
                                    <option key={p.id} value={p.id}>
                                        {p.name} (Current: {p.qty_on_hand} {p.unit})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="label">Quantity Received *</label>
                            <input
                                type="number"
                                min="1"
                                className="input text-lg font-bold text-brand-700"
                                value={form.quantity}
                                onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
                                placeholder="e.g. 50"
                                required
                            />
                        </div>

                        <div>
                            <label className="label">Supplier / Vendor Name</label>
                            <input
                                type="text"
                                className="input"
                                value={form.supplier}
                                onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))}
                                placeholder="Optional"
                            />
                        </div>

                        <div>
                            <label className="label">Batch Notes / Remarks</label>
                            <textarea
                                className="input min-h-[80px]"
                                value={form.notes}
                                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                                placeholder="Optional"
                            />
                        </div>

                        <button
                            type="submit"
                            className="btn-primary w-full py-3.5 text-base mt-2 flex items-center justify-center gap-2"
                            disabled={saving || loading}
                        >
                            {saving ? (
                                <div className="w-5 h-5 border-2 border-white border-t-transparent flex items-center justify-center rounded-full animate-spin" />
                            ) : (
                                <><span>📥</span> Confirm Inward</>
                            )}
                        </button>
                    </form>
                </div>
            </main>
        </div>
    );
}
