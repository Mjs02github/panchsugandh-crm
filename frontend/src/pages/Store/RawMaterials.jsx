import { useState, useEffect } from 'react';
import api from '../../api';

export default function RawMaterials() {
    const [materials, setMaterials] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showInwardModal, setShowInwardModal] = useState(false);
    const [selectedMaterial, setSelectedMaterial] = useState(null);
    const [formData, setFormData] = useState({ name: '', sku: '', unit: 'PCS', min_stock: 0 });
    const [inwardData, setInwardData] = useState({ quantity: '', entry_number: '', batch_number: '', received_date: new Date().toISOString().split('T')[0], supplier_info: '' });

    useEffect(() => {
        fetchMaterials();
    }, []);

    const fetchMaterials = async () => {
        try {
            const { data } = await api.get('/store/raw-materials');
            setMaterials(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddMaterial = async (e) => {
        e.preventDefault();
        try {
            await api.post('/store/raw-materials', formData);
            setShowAddModal(false);
            fetchMaterials();
            setFormData({ name: '', sku: '', unit: 'PCS', min_stock: 0 });
        } catch (err) {
            alert(err.response?.data?.error || 'Error adding material');
        }
    };

    const handleInward = async (e) => {
        e.preventDefault();
        try {
            await api.post('/store/raw-materials/inward', {
                ...inwardData,
                material_id: selectedMaterial.id,
                quantity: parseFloat(inwardData.quantity)
            });
            setShowInwardModal(false);
            fetchMaterials();
            setInwardData({ quantity: '', entry_number: '', batch_number: '', received_date: new Date().toISOString().split('T')[0], supplier_info: '' });
        } catch (err) {
            alert(err.response?.data?.error || 'Error recording inward stock');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">Raw Material Inventory</h1>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="bg-brand-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-brand-700 transition-colors"
                >
                    + New Material
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center p-12">Loading...</div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Material Name</th>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">SKU</th>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Unit</th>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Stock</th>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Min Stock</th>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {materials.map(m => (
                                <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-gray-900">{m.name}</td>
                                    <td className="px-6 py-4 text-gray-500">{m.sku || '-'}</td>
                                    <td className="px-6 py-4 text-gray-500">{m.unit}</td>
                                    <td className={`px-6 py-4 font-bold ${m.qty_on_hand <= m.min_stock ? 'text-red-600' : 'text-green-600'}`}>
                                        {parseFloat(m.qty_on_hand).toFixed(3)}
                                    </td>
                                    <td className="px-6 py-4 text-gray-500">{m.min_stock}</td>
                                    <td className="px-6 py-4">
                                        <button
                                            onClick={() => { setSelectedMaterial(m); setShowInwardModal(true); }}
                                            className="text-brand-600 font-medium hover:underline"
                                        >
                                            Inward Stock
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Add Material Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
                        <h2 className="text-xl font-bold mb-4">Add New Raw Material</h2>
                        <form onSubmit={handleAddMaterial} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Material Name</label>
                                <input
                                    type="text" required value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full border p-2 rounded-lg" placeholder="e.g., Plastic JAR 200g"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">SKU (Optional)</label>
                                    <input
                                        type="text" value={formData.sku}
                                        onChange={e => setFormData({ ...formData, sku: e.target.value })}
                                        className="w-full border p-2 rounded-lg"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                                    <select
                                        value={formData.unit}
                                        onChange={e => setFormData({ ...formData, unit: e.target.value })}
                                        className="w-full border p-2 rounded-lg"
                                    >
                                        <option value="PCS">PCS</option>
                                        <option value="KG">KG</option>
                                        <option value="GM">GM</option>
                                        <option value="PKT">PKT</option>
                                        <option value="BOX">BOX</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Min Stock Alert Level</label>
                                <input
                                    type="number" required value={formData.min_stock}
                                    onChange={e => setFormData({ ...formData, min_stock: e.target.value })}
                                    className="w-full border p-2 rounded-lg"
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50">Cancel</button>
                                <button type="submit" className="flex-1 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700">Save Material</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Inward Modal */}
            {showInwardModal && selectedMaterial && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
                        <h2 className="text-xl font-bold mb-1">Inward Stock</h2>
                        <p className="text-gray-500 mb-4">{selectedMaterial.name}</p>
                        <form onSubmit={handleInward} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Quantity ({selectedMaterial.unit})</label>
                                    <input
                                        type="number" step="0.001" required value={inwardData.quantity}
                                        onChange={e => setInwardData({ ...inwardData, quantity: e.target.value })}
                                        className="w-full border p-2 rounded-lg text-lg font-bold"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                                    <input
                                        type="date" required value={inwardData.received_date}
                                        onChange={e => setInwardData({ ...inwardData, received_date: e.target.value })}
                                        className="w-full border p-2 rounded-lg"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Bill / Entry No.</label>
                                    <input
                                        type="text" value={inwardData.entry_number}
                                        onChange={e => setInwardData({ ...inwardData, entry_number: e.target.value })}
                                        className="w-full border p-2 rounded-lg"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Batch No.</label>
                                    <input
                                        type="text" value={inwardData.batch_number}
                                        onChange={e => setInwardData({ ...inwardData, batch_number: e.target.value })}
                                        className="w-full border p-2 rounded-lg"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Supplier Info</label>
                                <input
                                    type="text" value={inwardData.supplier_info}
                                    onChange={e => setInwardData({ ...inwardData, supplier_info: e.target.value })}
                                    className="w-full border p-2 rounded-lg"
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setShowInwardModal(false)} className="flex-1 px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50">Cancel</button>
                                <button type="submit" className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">Add Stock</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
