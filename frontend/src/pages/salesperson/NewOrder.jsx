import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api';
import BottomNav from '../../components/BottomNav';
import indiaStates from '../../utils/indiaStates.json';

export default function NewOrder() {
    const navigate = useNavigate();
    const [retailers, setRetailers] = useState([]);
    const [products, setProducts] = useState([]);
    const [areas, setAreas] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedState, setSelectedState] = useState('');
    const [selectedDistrict, setSelectedDistrict] = useState('');
    const [selectedArea, setSelectedArea] = useState('');
    const [form, setForm] = useState({
        retailer_id: '',
        order_date: new Date().toISOString().slice(0, 10),
        items: [{ product_id: '', qty_ordered: 1, discount_pct: 0 }],
        notes: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        api.get('/retailers?limit=1000').then(r => setRetailers(r.data));
        api.get('/products').then(r => setProducts(r.data));
        api.get('/areas').then(r => setAreas(r.data));
    }, []);

    const selectedStateObj = indiaStates.find(s => s.state === selectedState);
    const districtOptions = selectedStateObj ? selectedStateObj.districts : [];

    // Derived values
    const filteredRetailers = retailers.filter(r => {
        const matchesSearch = (r.firm_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (r.area_name || '').toLowerCase().includes(searchQuery.toLowerCase());
        const addressLower = (r.address || '').toLowerCase();

        // Hierarchical filtering: Area is most specific. If selected, ignore strict State/District string matching
        // which could fail if the old retailer doesn't have district/state saved in their address string.
        let matchesLoc = true;
        if (selectedArea) {
            matchesLoc = String(r.area_id) === String(selectedArea);
        } else if (selectedDistrict) {
            matchesLoc = !r.address || addressLower.includes(selectedDistrict.toLowerCase());
        } else if (selectedState) {
            matchesLoc = !r.address || addressLower.includes(selectedState.toLowerCase());
        }

        return matchesSearch && matchesLoc;
    }).slice(0, 50); // Limit to 50 for performance

    // Helper to extract ID from datalist selection format like "Firm Name (Area) - ID: 12"
    const handleRetailerSelect = (val) => {
        setSearchQuery(val);
        const match = val.match(/- ID: (\d+)$/);
        if (match) {
            setForm(f => ({ ...f, retailer_id: match[1] }));
            setError('');
        } else {
            setForm(f => ({ ...f, retailer_id: '' }));
        }
    };

    const addItem = () =>
        setForm(f => ({ ...f, items: [...f.items, { product_id: '', qty_ordered: 1, discount_pct: 0 }] }));

    const removeItem = (i) =>
        setForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }));

    const updateItem = (i, field, value) =>
        setForm(f => {
            const items = [...f.items];
            items[i] = { ...items[i], [field]: value };
            return { ...f, items };
        });

    // Pricing helpers
    const getProductById = (id) => products.find(p => String(p.id) === String(id));
    const calcBaseRate = (p) => p ? parseFloat(p.mrp || 0) / (1 + (parseFloat(p.gst_rate || 0) / 100)) : 0;
    const calcBilledRate = (p, disc) => calcBaseRate(p) * (1 - parseFloat(disc || 0) / 100);
    const calcLineAmount = (p, qty, disc) => calcBilledRate(p, disc) * parseInt(qty || 1);

    const totalAmount = form.items.reduce((s, it) => {
        const p = getProductById(it.product_id);
        return s + calcLineAmount(p, it.qty_ordered, it.discount_pct);
    }, 0);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (!form.retailer_id) return setError('Please select a retailer.');
        const validItems = form.items.filter(it => it.product_id && it.qty_ordered > 0);
        if (!validItems.length) return setError('Please add at least one item.');
        setLoading(true);
        try {
            // Send discount_pct per item; backend computes unit_price from MRP
            const payload = {
                retailer_id: form.retailer_id,
                order_date: form.order_date,
                notes: form.notes,
                items: validItems.map(it => {
                    const p = getProductById(it.product_id);
                    return {
                        product_id: it.product_id,
                        qty_ordered: it.qty_ordered,
                        unit_price: calcBaseRate(p).toFixed(2),
                        discount_pct: parseFloat(it.discount_pct || 0),
                    };
                }),
            };
            const { data } = await api.post('/orders', payload);
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

                {/* Location Filters */}
                <div className="card space-y-2 mb-4">
                    <label className="label">Filter by Location</label>
                    <div className="grid grid-cols-2 gap-2">
                        <select className="input" value={selectedState} onChange={e => { setSelectedState(e.target.value); setSelectedDistrict(''); }}>
                            <option value="">All States</option>
                            {indiaStates.map(s => <option key={s.state} value={s.state}>{s.state}</option>)}
                        </select>
                        <select className="input" value={selectedDistrict} onChange={e => setSelectedDistrict(e.target.value)} disabled={!selectedState}>
                            <option value="">All Districts</option>
                            {districtOptions.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                        <select className="input col-span-2" value={selectedArea} onChange={e => setSelectedArea(e.target.value)}>
                            <option value="">All Areas</option>
                            {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                        </select>
                    </div>
                </div>

                {/* Retailer Search */}
                <div className="card space-y-2">
                    <label className="label">Search Party / Retailer *</label>
                    <input className="input border-brand-200" list="retailers-list"
                        placeholder="Type firm name or area..."
                        value={searchQuery}
                        onChange={e => handleRetailerSelect(e.target.value)} required />
                    <datalist id="retailers-list">
                        {filteredRetailers.map(r => (
                            <option key={r.id} value={`${r.firm_name} (${r.area_name || 'No area'}) - ID: ${r.id}`} />
                        ))}
                    </datalist>
                    {searchQuery && !form.retailer_id && (
                        <p className="text-xs text-brand-600">Please select a valid party from the dropdown list.</p>
                    )}
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
                                {(() => {
                                    const p = getProductById(item.product_id);
                                    const baseRate = calcBaseRate(p);
                                    const billedRate = calcBilledRate(p, item.discount_pct);
                                    const lineAmt = calcLineAmount(p, item.qty_ordered, item.discount_pct);
                                    return (
                                        <div className="space-y-2">
                                            <div className="grid grid-cols-2 gap-2">
                                                <div>
                                                    <label className="label text-xs">Qty</label>
                                                    <input type="number" min="1" className="input" value={item.qty_ordered}
                                                        onChange={e => updateItem(i, 'qty_ordered', e.target.value)} required />
                                                </div>
                                                <div>
                                                    <label className="label text-xs">Discount %</label>
                                                    <input type="number" min="0" max="100" step="0.5" className="input"
                                                        placeholder="0"
                                                        value={item.discount_pct}
                                                        onChange={e => updateItem(i, 'discount_pct', e.target.value)} />
                                                </div>
                                            </div>
                                            {p && (
                                                <div className="grid grid-cols-3 gap-1 text-xs bg-gray-50 rounded-lg p-2">
                                                    <div className="text-center">
                                                        <div className="text-gray-400">MRP</div>
                                                        <div className="font-semibold">₹{parseFloat(p.mrp || 0).toFixed(2)}</div>
                                                    </div>
                                                    <div className="text-center">
                                                        <div className="text-gray-400">Base Rate</div>
                                                        <div className="font-semibold">₹{baseRate.toFixed(2)}</div>
                                                    </div>
                                                    <div className="text-center">
                                                        <div className="text-gray-400">Billed Rate</div>
                                                        <div className="font-bold text-brand-700">₹{billedRate.toFixed(2)}</div>
                                                    </div>
                                                </div>
                                            )}
                                            {p && <div className="text-right text-xs font-bold text-gray-700">Line Total: ₹{lineAmt.toFixed(2)}</div>}
                                        </div>
                                    );
                                })()}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Discount & Notes */}
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
