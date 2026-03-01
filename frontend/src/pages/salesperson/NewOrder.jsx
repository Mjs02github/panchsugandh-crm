import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api';
import BottomNav from '../../components/BottomNav';

export default function NewOrder() {
    const navigate = useNavigate();
    const [retailers, setRetailers] = useState([]);
    const [products, setProducts] = useState([]);
    const [form, setForm] = useState({
        retailer_id: '',
        order_date: new Date().toISOString().slice(0, 10),
        items: [{ product_id: '', qty_ordered: 1, unit_price: '' }],
        discount: 0,
        notes: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        api.get('/retailers').then(r => setRetailers(r.data));
        api.get('/products').then(r => setProducts(r.data));
    }, []);

    const [selectedArea, setSelectedArea] = useState('');

    // Derived values
    const uniqueAreas = Array.from(new Set(retailers.map(r => r.area_name))).filter(Boolean).sort();
    const filteredRetailers = selectedArea
        ? retailers.filter(r => r.area_name === selectedArea)
        : retailers;

    const addItem = () =>
        setForm(f => ({ ...f, items: [...f.items, { product_id: '', qty_ordered: 1, unit_price: '' }] }));

    const removeItem = (i) =>
        setForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }));

    const updateItem = (i, field, value) =>
        setForm(f => {
            const items = [...f.items];
            items[i] = { ...items[i], [field]: value };
            if (field === 'product_id') {
                const p = products.find(p => String(p.id) === String(value));
                if (p) items[i].unit_price = p.sale_price;
            }
            return { ...f, items };
        });

    const totalAmount = form.items.reduce((s, it) => {
        const p = products.find(p => String(p.id) === String(it.product_id));
        const price = parseFloat(it.unit_price) || (p?.sale_price || 0);
        const gst = p?.gst_rate || 0;
        return s + (price * parseInt(it.qty_ordered || 1)) * (1 + gst / 100);
    }, 0) - parseFloat(form.discount || 0);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (!form.retailer_id) return setError('Please select a retailer.');
        const validItems = form.items.filter(it => it.product_id && it.qty_ordered > 0);
        if (!validItems.length) return setError('Please add at least one item.');
        setLoading(true);
        try {
            const { data } = await api.post('/orders', { ...form, items: validItems });
            setSuccess(`Order ${data.order_number} created! Total: ₹${data.total_amount}`);
            setTimeout(() => navigate('/orders'), 2000);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to create order.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="pb-24">
            <div className="page-header">
                <button onClick={() => navigate(-1)} className="text-gray-500 text-xl">←</button>
                <h1 className="text-lg font-semibold flex-1">New Sales Order</h1>
            </div>

            <form onSubmit={handleSubmit} className="px-4 py-4 space-y-4">
                {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">{error}</div>}
                {success && <div className="p-3 bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl">{success}</div>}

                {/* Area Filter */}
                <div className="flex gap-2">
                    <div className="flex-1">
                        <label className="label">Filter by Area</label>
                        <select className="input" value={selectedArea} onChange={e => {
                            setSelectedArea(e.target.value);
                            setForm(f => ({ ...f, retailer_id: '' })); // Reset selected retailer when area changes
                        }}>
                            <option value="">All Areas</option>
                            {uniqueAreas.map(a => <option key={a} value={a}>{a}</option>)}
                        </select>
                    </div>
                </div>

                {/* Retailer */}
                <div>
                    <label className="label">Retailer / Party *</label>
                    <select className="input" value={form.retailer_id} onChange={e => setForm(f => ({ ...f, retailer_id: e.target.value }))} required>
                        <option value="">Select retailer…</option>
                        {filteredRetailers.map(r => (
                            <option key={r.id} value={r.id}>{r.firm_name} {!selectedArea ? `— ${r.area_name || 'No area'}` : ''}</option>
                        ))}
                    </select>
                </div>

                {/* Date */}
                <div>
                    <label className="label">Order Date *</label>
                    <input type="date" className="input" value={form.order_date} onChange={e => setForm(f => ({ ...f, order_date: e.target.value }))} required />
                </div>

                {/* Items */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <label className="label mb-0">Order Items *</label>
                        <button type="button" onClick={addItem} className="text-brand-600 text-sm font-medium">+ Add Item</button>
                    </div>
                    <div className="space-y-3">
                        {form.items.map((item, i) => (
                            <div key={i} className="card space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-medium text-gray-500">Item {i + 1}</span>
                                    {form.items.length > 1 && (
                                        <button type="button" onClick={() => removeItem(i)} className="text-red-500 text-xs">Remove</button>
                                    )}
                                </div>
                                <select className="input" value={item.product_id} onChange={e => updateItem(i, 'product_id', e.target.value)} required>
                                    <option value="">Select product…</option>
                                    {products.map(p => (
                                        <option key={p.id} value={p.id}>{p.name} ({p.unit}) — ₹{p.sale_price}</option>
                                    ))}
                                </select>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="label text-xs">Qty</label>
                                        <input type="number" min="1" className="input" value={item.qty_ordered}
                                            onChange={e => updateItem(i, 'qty_ordered', e.target.value)} required />
                                    </div>
                                    <div>
                                        <label className="label text-xs">Rate (₹)</label>
                                        <input type="number" step="0.01" className="input" value={item.unit_price}
                                            onChange={e => updateItem(i, 'unit_price', e.target.value)} />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Discount & Notes */}
                <div>
                    <label className="label">Discount (₹)</label>
                    <input type="number" step="0.01" min="0" className="input" value={form.discount}
                        onChange={e => setForm(f => ({ ...f, discount: e.target.value }))} />
                </div>
                <div>
                    <label className="label">Notes</label>
                    <textarea className="input" rows="2" value={form.notes}
                        onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional notes…" />
                </div>

                {/* Total */}
                <div className="card flex items-center justify-between bg-brand-50">
                    <span className="font-semibold text-gray-700">Estimated Total</span>
                    <span className="text-xl font-bold text-brand-700">₹{Math.max(0, totalAmount).toFixed(2)}</span>
                </div>

                <button type="submit" className="btn-primary" disabled={loading}>
                    {loading ? 'Submitting…' : 'Submit Order'}
                </button>
            </form>

            <BottomNav />
        </div>
    );
}
