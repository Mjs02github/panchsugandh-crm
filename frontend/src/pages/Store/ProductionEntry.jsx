import { useState, useEffect } from 'react';
import api from '../../api';

export default function ProductionEntry() {
    const [products, setProducts] = useState([]);
    const [capacity, setCapacity] = useState([]);
    const [existingBatches, setExistingBatches] = useState([]);
    const [isNewBatch, setIsNewBatch] = useState(true);
    const [loading, setLoading] = useState(true);
    const [formLoading, setFormLoading] = useState(false);

    const [formData, setFormData] = useState({
        product_id: '',
        quantity_produced: '',
        batch_number: '',
        mrp: '',
        packing_date: new Date().toISOString().split('T')[0],
        notes: ''
    });

    useEffect(() => {
        fetchData();
    }, []);

    // Fetch batches when product changes
    useEffect(() => {
        if (formData.product_id) {
            fetchBatches(formData.product_id);
        } else {
            setExistingBatches([]);
        }
    }, [formData.product_id]);

    const fetchData = async () => {
        try {
            const [pRes, cRes] = await Promise.all([
                api.get('/products'),
                api.get('/store/capacity')
            ]);
            setProducts(pRes.data);
            setCapacity(cRes.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchBatches = async (productId) => {
        try {
            const { data } = await api.get(`/store/inventory/product/${productId}/batches`);
            setExistingBatches(data);
        } catch (err) {
            console.error('Error fetching batches:', err);
        }
    };

    const handleBatchChange = (e) => {
        const val = e.target.value;
        if (val === 'NEW') {
            setIsNewBatch(true);
            setFormData({ ...formData, batch_number: '', mrp: '' });
        } else {
            const selected = existingBatches.find(b => b.batch_number === val);
            setIsNewBatch(false);
            setFormData({ 
                ...formData, 
                batch_number: val, 
                mrp: selected?.mrp || '' 
            });
        }
    };

    const handleProduction = async (e) => {
        e.preventDefault();
        setFormLoading(true);
        try {
            const { data } = await api.post('/store/production', {
                ...formData,
                quantity_produced: parseInt(formData.quantity_produced),
                mrp: parseFloat(formData.mrp) || 0
            });
            alert(data.message);
            setFormData({
                product_id: '',
                quantity_produced: '',
                batch_number: '',
                mrp: '',
                packing_date: new Date().toISOString().split('T')[0],
                notes: ''
            });
            setIsNewBatch(true);
            fetchData(); // Refresh capacity
        } catch (err) {
            alert(err.response?.data?.error || 'Error logging production');
        } finally {
            setFormLoading(false);
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <span className="p-2 bg-brand-50 text-brand-600 rounded-lg">🏭</span>
                        Production Entry
                    </h1>
                    <p className="text-gray-500 text-sm">Log finished goods production and check packing capacity.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Production Form */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                        <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
                            <span className="text-brand-600">📦</span> Log New Production Batch
                        </h2>
                        <form onSubmit={handleProduction} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Product Being Packed</label>
                                    <select
                                        required value={formData.product_id}
                                        onChange={e => setFormData({ ...formData, product_id: e.target.value })}
                                        className="w-full border border-gray-200 p-2.5 rounded-xl bg-gray-50 focus:ring-2 focus:ring-brand-500 outline-none"
                                    >
                                        <option value="">-- Select Product --</option>
                                        {products.map(p => (
                                            <option key={p.id} value={p.id}>{p.name} ({p.unit})</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Quantity Produced</label>
                                    <input
                                        type="number" required value={formData.quantity_produced}
                                        onChange={e => setFormData({ ...formData, quantity_produced: e.target.value })}
                                        className="w-full border border-gray-200 p-2.5 rounded-xl bg-gray-50 text-lg font-bold focus:ring-2 focus:ring-brand-500 outline-none"
                                        placeholder="0"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                                <div className="md:col-span-4">
                                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Batch selection</label>
                                    <select
                                        onChange={handleBatchChange}
                                        value={isNewBatch ? 'NEW' : formData.batch_number}
                                        disabled={!formData.product_id}
                                        className="w-full border border-gray-200 p-2.5 rounded-xl bg-gray-50 focus:ring-2 focus:ring-brand-500 outline-none"
                                    >
                                        <option value="NEW">+ Create New Batch</option>
                                        {existingBatches.map(b => (
                                            <option key={b.batch_number} value={b.batch_number}>
                                                Existing: {b.batch_number} (₹{b.mrp})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="md:col-span-4">
                                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">
                                        {isNewBatch ? 'New Batch Number' : 'Current Batch'}
                                    </label>
                                    <input
                                        type="text" 
                                        required
                                        value={formData.batch_number}
                                        readOnly={!isNewBatch}
                                        onChange={e => setFormData({ ...formData, batch_number: e.target.value })}
                                        className={`w-full border p-2.5 rounded-xl uppercase focus:ring-2 focus:ring-brand-500 outline-none ${!isNewBatch ? 'bg-gray-100' : 'bg-white border-brand-200'}`}
                                        placeholder="e.g. PS/2024/001"
                                    />
                                </div>

                                <div className="md:col-span-4">
                                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">MRP (Per Unit)</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₹</span>
                                        <input
                                            type="number" step="0.01" required value={formData.mrp}
                                            onChange={e => setFormData({ ...formData, mrp: e.target.value })}
                                            className="w-full border border-gray-200 p-2.5 pl-7 rounded-xl bg-gray-50 text-brand-700 font-bold focus:ring-2 focus:ring-brand-500 outline-none"
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Packing Date</label>
                                <input
                                    type="date" required value={formData.packing_date}
                                    onChange={e => setFormData({ ...formData, packing_date: e.target.value })}
                                    className="w-full border border-gray-200 p-2.5 rounded-xl bg-gray-50 focus:ring-2 focus:ring-brand-500 outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Additional Notes</label>
                                <textarea
                                    value={formData.notes}
                                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                    className="w-full border border-gray-200 p-2.5 rounded-xl bg-gray-50 h-24 focus:ring-2 focus:ring-brand-500 outline-none"
                                    placeholder="Any specific batch details..."
                                ></textarea>
                            </div>

                            <button
                                type="submit"
                                disabled={formLoading}
                                className="w-full py-4 bg-brand-600 text-white rounded-xl font-bold text-lg hover:bg-brand-700 transition-all shadow-lg shadow-brand-100 disabled:opacity-50"
                            >
                                {formLoading ? 'Processing...' : 'Confirm Production & Update Inventory'}
                            </button>
                            <p className="text-center text-[10px] text-gray-400">
                                This will automatically deduct relevant raw materials based on the BOM recipe.
                            </p>
                        </form>
                    </div>
                </div>

                {/* Capacity Dashboard */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 sticky top-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-lg font-bold flex items-center gap-2">
                                <span className="text-brand-600">🚀</span> Current Capacity
                            </h2>
                            <button onClick={fetchData} className="text-xs text-brand-600 hover:underline">Refresh</button>
                        </div>

                        {loading ? (
                            <div className="animate-pulse space-y-4">
                                {[1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-100 rounded-xl" />)}
                            </div>
                        ) : capacity.length === 0 ? (
                            <div className="text-center py-12">
                                <p className="text-gray-400 italic text-sm">Define BOM to see capacity</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {capacity.map(c => (
                                    <div key={c.product_id} className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                                        <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Can make</p>
                                        <div className="flex justify-between items-end">
                                            <p className="text-2xl font-black text-brand-700">{c.possible_quantity}</p>
                                            <p className="text-sm font-bold text-gray-900 truncate ml-2 max-w-[150px]">{c.product_name}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="mt-8 p-4 bg-amber-50 rounded-xl border border-amber-100">
                            <h3 className="text-xs font-bold text-amber-800 uppercase flex items-center gap-1 mb-2">
                                💡 Tip
                            </h3>
                            <p className="text-[11px] text-amber-700 leading-relaxed">
                                Capacity is calculated based on the ingredient with the lowest available stock (bottleneck).
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
