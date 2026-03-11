import { useState, useEffect } from 'react';
import api from '../../api';
import { ClipboardList, Calculator, Save, AlertTriangle, CheckCircle, Trash2, ArrowRight, Package } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function MaterialPlanning() {
    const { user } = useAuth();
    const [products, setProducts] = useState([]);
    const [targets, setTargets] = useState([]); // [{productId, name, quantity}]
    const [results, setResults] = useState(null); // [{materialId, name, requiredQty, currentQty, shortfall}]
    const [loading, setLoading] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState('');
    const [targetQty, setTargetQty] = useState('');
    const [saveLoading, setSaveLoading] = useState(false);

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        try {
            const { data } = await api.get('/products');
            setProducts(data);
        } catch (error) {
            console.error('Error fetching products:', error);
        }
    };

    const addTarget = () => {
        if (!selectedProduct || !targetQty || targetQty <= 0) return;
        const product = products.find(p => p.id === parseInt(selectedProduct));
        if (!product) return;

        const existing = targets.find(t => t.productId === product.id);
        if (existing) {
            setTargets(targets.map(t => t.productId === product.id ? { ...t, quantity: t.quantity + parseInt(targetQty) } : t));
        } else {
            setTargets([...targets, { productId: product.id, name: product.name, quantity: parseInt(targetQty) }]);
        }
        setSelectedProduct('');
        setTargetQty('');
        setResults(null); // Clear results if targets change
    };

    const removeTarget = (id) => {
        setTargets(targets.filter(t => t.productId !== id));
        setResults(null);
    };

    const calculateRequirements = async () => {
        if (targets.length === 0) return;
        setLoading(true);
        try {
            const { data } = await api.post('/procurement/calculate-requirements', { targets });
            setResults(data);
        } catch (error) {
            alert('Error calculating: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const savePlan = async () => {
        if (!results || targets.length === 0) return;
        setSaveLoading(true);
        try {
            await api.post('/procurement/plans', {
                targetData: targets,
                resultData: results,
                createdBy: user.id
            });
            alert('Procurement plan saved successfully!');
        } catch (error) {
            alert('Error saving plan: ' + error.message);
        } finally {
            setSaveLoading(false);
        }
    };

    return (
        <div className="p-4 sm:p-6 space-y-6 max-w-5xl mx-auto">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => window.history.back()}
                        className="text-gray-500 hover:text-gray-700 bg-white border border-gray-200 p-2 rounded-lg"
                    >
                        ←
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                            <ClipboardList className="text-indigo-600" />
                            Material Planning
                        </h1>
                        <p className="text-gray-500 text-sm">Calculate Raw Material needs for production targets</p>
                    </div>
                </div>
            </div>

            {/* Sub-Nav */}
            <div className="flex gap-4 border-b border-gray-200 -mt-2 pb-0">
                <a href="#/procurement" className="px-1 py-2 text-sm text-gray-500 hover:text-indigo-600">Dashboard</a>
                <a href="#/procurement/vendors" className="px-1 py-2 text-sm text-gray-500 hover:text-indigo-600">Vendors</a>
                <a href="#/procurement/planning" className="px-1 py-2 text-sm font-bold text-indigo-600 border-b-2 border-indigo-600">Planning</a>
                <a href="#/procurement/requests" className="px-1 py-2 text-sm text-gray-500 hover:text-indigo-600">Store Req</a>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Planning Form */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6">
                    <h2 className="font-bold text-gray-700 flex items-center gap-2">
                        <ArrowRight size={18} className="text-indigo-500" />
                        Set Production Targets
                    </h2>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                        <div className="sm:col-span-3">
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Select Product (FG)</label>
                            <select 
                                value={selectedProduct} 
                                onChange={e => setSelectedProduct(e.target.value)}
                                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="">Select a product...</option>
                                {products.map(p => (
                                    <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                                ))}
                            </select>
                        </div>
                        <div className="sm:col-span-1">
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Target Qty</label>
                            <input 
                                type="number" 
                                value={targetQty} 
                                onChange={e => setTargetQty(e.target.value)}
                                placeholder="Units"
                                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <div className="sm:col-span-1 flex items-end">
                            <button 
                                onClick={addTarget}
                                className="w-full py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-bold"
                            >
                                Add
                            </button>
                        </div>
                    </div>

                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                        {targets.length === 0 ? (
                            <div className="text-center py-8 text-gray-400 italic bg-gray-50 rounded-lg border border-dashed">
                                Add products to the production list to start planning
                            </div>
                        ) : targets.map(target => (
                            <div key={target.productId} className="flex justify-between items-center p-3 bg-indigo-50/50 rounded-xl border border-indigo-100">
                                <div>
                                    <p className="font-bold text-gray-800">{target.name}</p>
                                    <p className="text-xs text-indigo-600 font-medium">{target.quantity} Units</p>
                                </div>
                                <button onClick={() => removeTarget(target.productId)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                    </div>

                    {targets.length > 0 && (
                        <button 
                            onClick={calculateRequirements}
                            disabled={loading}
                            className={`w-full py-3 flex items-center justify-center gap-2 rounded-xl text-white font-bold transition shadow-lg ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 shadow-indigo-200'}`}
                        >
                            {loading ? 'Calculating...' : (
                                <>
                                    <Calculator size={20} />
                                    Calculate RM Requirements
                                </>
                            )}
                        </button>
                    )}
                </div>

                {/* Calculation Results */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                        <h2 className="font-bold text-gray-700 flex items-center gap-2">
                            <Package size={18} className="text-indigo-500" />
                            Requirements Summary
                        </h2>
                        {results && (
                            <button 
                                onClick={savePlan}
                                disabled={saveLoading}
                                className="text-xs font-bold text-indigo-600 flex items-center gap-1 hover:underline"
                            >
                                <Save size={14} />
                                Save Plan
                            </button>
                        )}
                    </div>
                    
                    <div className="p-0 overflow-x-auto min-h-[400px]">
                        {!results ? (
                            <div className="flex flex-col items-center justify-center py-20 text-gray-400 space-y-3">
                                <Calculator size={48} className="opacity-20" />
                                <p className="italic">Results will appear here after calculation</p>
                            </div>
                        ) : (
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 text-[10px] font-bold text-gray-400 uppercase">
                                    <tr>
                                        <th className="px-6 py-3">Raw Material</th>
                                        <th className="px-6 py-3">Required</th>
                                        <th className="px-6 py-3">On Hand</th>
                                        <th className="px-6 py-3">Shortfall</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {results.map(item => (
                                        <tr key={item.material_id} className="hover:bg-gray-50/50 transition">
                                            <td className="px-6 py-4">
                                                <p className="font-bold text-gray-800">{item.name}</p>
                                                <p className="text-[10px] text-gray-400 uppercase">{item.unit}</p>
                                            </td>
                                            <td className="px-6 py-4 font-bold text-indigo-600">
                                                {item.requiredQty.toFixed(2)}
                                            </td>
                                            <td className="px-6 py-4 text-gray-600 font-medium">
                                                {item.currentQty.toFixed(2)}
                                            </td>
                                            <td className="px-6 py-4">
                                                {item.shortfall > 0 ? (
                                                    <span className="flex items-center gap-1 text-red-600 font-bold bg-red-50 px-2 py-1 rounded-lg text-xs">
                                                        <AlertTriangle size={12} />
                                                        {item.shortfall.toFixed(2)}
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center gap-1 text-green-600 font-bold bg-green-50 px-2 py-1 rounded-lg text-xs">
                                                        <CheckCircle size={12} />
                                                        Covered
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
