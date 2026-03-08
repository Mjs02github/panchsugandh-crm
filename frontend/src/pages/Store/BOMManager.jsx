import { useState, useEffect } from 'react';
import api from '../../api';

export default function BOMManager() {
    const [products, setProducts] = useState([]);
    const [rawMaterials, setRawMaterials] = useState([]);
    const [selectedProduct, setSelectedProduct] = useState('');
    const [currentBOM, setCurrentBOM] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [pRes, rmRes] = await Promise.all([
                api.get('/products'),
                api.get('/store/raw-materials')
            ]);
            setProducts(pRes.data);
            setRawMaterials(rmRes.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchBOM = async (productId) => {
        if (!productId) return;
        try {
            const { data } = await api.get(`/store/bom/${productId}`);
            setCurrentBOM(data.map(item => ({
                material_id: item.material_id,
                quantity_required: item.quantity_required
            })));
        } catch (err) {
            console.error(err);
        }
    };

    const handleProductChange = (e) => {
        const id = e.target.value;
        setSelectedProduct(id);
        if (id) fetchBOM(id);
        else setCurrentBOM([]);
    };

    const addMaterialToBOM = () => {
        setCurrentBOM([...currentBOM, { material_id: '', quantity_required: 0 }]);
    };

    const removeMaterial = (index) => {
        const updated = [...currentBOM];
        updated.splice(index, 1);
        setCurrentBOM(updated);
    };

    const updateBOMItem = (index, field, value) => {
        const updated = [...currentBOM];
        updated[index][field] = value;
        setCurrentBOM(updated);
    };

    const saveBOM = async () => {
        if (!selectedProduct) return;
        try {
            await api.post('/store/bom', {
                product_id: selectedProduct,
                materials: currentBOM.filter(m => m.material_id && m.quantity_required > 0)
            });
            alert('BOM saved successfully!');
        } catch (err) {
            alert('Error saving BOM');
        }
    };

    return (
        <div className="space-y-6 max-w-4xl">
            <div>
                <h1 className="text-2xl font-bold">Bill of Materials (BOM)</h1>
                <p className="text-gray-500">Define what raw materials are required to pack 1 unit of a product.</p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Product to Define BOM</label>
                <select
                    value={selectedProduct}
                    onChange={handleProductChange}
                    className="w-full border p-3 rounded-lg text-lg"
                >
                    <option value="">-- Choose Product --</option>
                    {products.map(p => (
                        <option key={p.id} value={p.id}>{p.name} ({p.unit})</option>
                    ))}
                </select>
            </div>

            {selectedProduct && (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-4">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-bold">Required Materials for 1 Unit</h2>
                        <button
                            onClick={addMaterialToBOM}
                            className="text-brand-600 font-medium hover:underline"
                        >
                            + Add Ingredient
                        </button>
                    </div>

                    {currentBOM.length === 0 ? (
                        <p className="text-center py-8 text-gray-400">No materials defined for this product yet.</p>
                    ) : (
                        <div className="space-y-3">
                            {currentBOM.map((item, index) => (
                                <div key={index} className="flex gap-4 items-end bg-gray-50 p-3 rounded-lg">
                                    <div className="flex-1">
                                        <label className="block text-xs text-gray-400 mb-1 uppercase tracking-wider">Raw Material</label>
                                        <select
                                            value={item.material_id}
                                            onChange={(e) => updateBOMItem(index, 'material_id', e.target.value)}
                                            className="w-full border p-2 rounded-lg bg-white"
                                        >
                                            <option value="">-- Component --</option>
                                            {rawMaterials.map(rm => (
                                                <option key={rm.id} value={rm.id}>{rm.name} ({rm.unit})</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="w-32">
                                        <label className="block text-xs text-gray-400 mb-1 uppercase tracking-wider">Qty Req.</label>
                                        <input
                                            type="number" step="0.0001"
                                            value={item.quantity_required}
                                            onChange={(e) => updateBOMItem(index, 'quantity_required', parseFloat(e.target.value))}
                                            className="w-full border p-2 rounded-lg bg-white"
                                        />
                                    </div>
                                    <button
                                        onClick={() => removeMaterial(index)}
                                        className="text-red-500 p-2 hover:bg-red-50 rounded-lg"
                                    >
                                        🗑️
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="pt-6">
                        <button
                            onClick={saveBOM}
                            className="w-full bg-brand-600 text-white py-3 rounded-xl font-bold hover:bg-brand-700 transition-shadow shadow-md shadow-brand-200"
                        >
                            Save BOM Recipe
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
