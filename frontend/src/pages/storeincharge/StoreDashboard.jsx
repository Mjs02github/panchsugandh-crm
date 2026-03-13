import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api';

export default function StoreDashboard() {
    const [stats, setStats] = useState({ toPack: 0, lowStock: 0, bomMissing: 0, pendingSamples: 0 });
    const [lowStockItems, setLowStockItems] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                // Fetch orders for To Pack count
                const ordersRes = await api.get('/orders');
                const toPackCount = (Array.isArray(ordersRes.data) ? ordersRes.data : []).filter(o => o.status === 'BILLED').length;

                // Fetch products for Low Stock count & alerts
                const productsRes = await api.get('/products');
                const products = productsRes.data || [];
                const lowStockList = products.filter(p => p.qty_on_hand < 10);

                // Fetch Sample Requests
                const samplesRes = await api.get('/store/samples');
                const pendingSamples = samplesRes.data.filter(s => s.status === 'PENDING').length;

                setStats({
                    toPack: toPackCount,
                    lowStock: lowStockList.length,
                    pendingSamples: pendingSamples
                });

                // Show up to 3 low stock items
                setLowStockItems(lowStockList.slice(0, 3));
            } catch (err) {
                console.error("Dashboard fetch error", err);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    const [downloading, setDownloading] = useState(false);

    const handleDownload = async (endpoint, fileName) => {
        setDownloading(true);
        try {
            const token = localStorage.getItem('crm_token');
            const baseURL = api.defaults.baseURL || '/api';
            const response = await fetch(
                `${baseURL}${endpoint}?format=excel`,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error || `Download failed with status ${response.status}`);
            }

            const blob = await response.blob();
            // ... (rest of the code remains the same logically)
            if (window.Capacitor?.isNativePlatform()) {
                const { Filesystem, Directory } = await import('@capacitor/filesystem');
                const { Share } = await import('@capacitor/share');

                const reader = new FileReader();
                reader.readAsDataURL(blob);
                const base64Data = await new Promise((resolve, reject) => {
                    reader.onloadend = () => resolve(reader.result.split(',')[1]);
                    reader.onerror = reject;
                });

                const savedFile = await Filesystem.writeFile({
                    path: fileName,
                    data: base64Data,
                    directory: Directory.Documents
                });

                await Share.share({
                    title: fileName,
                    url: savedFile.uri,
                });
            } else {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = fileName;
                a.click();
                URL.revokeObjectURL(url);
            }
        } catch (err) {
            console.error('Download error:', err);
            alert(`Failed to download report: ${err.message}`);
        } finally {
            setDownloading(false);
        }
    };

    return (
        <div className="pb-24 max-w-5xl mx-auto">
            <header className="page-header py-6">
                <h1 className="text-3xl font-black text-gray-900 tracking-tight">Store & Production</h1>
                <p className="text-gray-500 font-medium">Manage inventory, define BOM, and log production batches.</p>
            </header>

            <main className="space-y-8">
                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">To Pack</p>
                        <p className="text-3xl font-black text-brand-600">{stats.toPack}</p>
                    </div>
                    <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Low Stock</p>
                        <p className="text-3xl font-black text-red-600">{stats.lowStock}</p>
                    </div>
                    <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Sample Req</p>
                        <p className="text-3xl font-black text-amber-600">{stats.pendingSamples}</p>
                    </div>
                    <Link to="/store/production" className="bg-brand-600 p-5 rounded-2xl shadow-lg shadow-brand-100 flex flex-col justify-end">
                        <p className="text-xs font-bold text-white/70 uppercase tracking-widest mb-1">Status</p>
                        <p className="text-lg font-bold text-white">Log Packing →</p>
                    </Link>
                </div>

                {/* Main Management Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Production Management */}
                    <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
                        <h2 className="text-lg font-bold flex items-center gap-2">
                            <span className="p-2 bg-blue-50 rounded-lg">⚙️</span> Production System
                        </h2>
                        <div className="grid grid-cols-1 gap-3">
                            <Link to="/store/production" className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl hover:bg-brand-50 transition-colors group">
                                <div>
                                    <p className="font-bold text-gray-900">Production Entry</p>
                                    <p className="text-xs text-gray-500">Log finished goods batches</p>
                                </div>
                                <span className="group-hover:translate-x-1 transition-transform">→</span>
                            </Link>
                            <Link to="/store/bom" className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl hover:bg-brand-50 transition-colors group">
                                <div>
                                    <p className="font-bold text-gray-900">BOM Management</p>
                                    <p className="text-xs text-gray-500">Define material recipes</p>
                                </div>
                                <span className="group-hover:translate-x-1 transition-transform">→</span>
                            </Link>
                        </div>
                    </div>

                    {/* Inventory Management */}
                    <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
                        <h2 className="text-lg font-bold flex items-center gap-2">
                            <span className="p-2 bg-green-50 rounded-lg">📦</span> Stock Control
                        </h2>
                        <div className="grid grid-cols-1 gap-3">
                            <Link to="/store/raw-materials" className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl hover:bg-brand-50 transition-colors group">
                                <div>
                                    <p className="font-bold text-gray-900">Raw Materials</p>
                                    <p className="text-xs text-gray-500">Packing jars, caps, etc.</p>
                                </div>
                                <span className="group-hover:translate-x-1 transition-transform">→</span>
                            </Link>
                            <Link to="/store/products" className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl hover:bg-brand-50 transition-colors group">
                                <div>
                                    <p className="font-bold text-gray-900">Finished Goods</p>
                                    <p className="text-xs text-gray-500">Ready for sale inventory</p>
                                </div>
                                <span className="group-hover:translate-x-1 transition-transform">→</span>
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Bottom Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Samples */}
                    <div className="md:col-span-1 bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
                        <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
                            <span className="p-2 bg-amber-50 rounded-lg">🎁</span> Sample Issues
                        </h2>
                        <Link to="/store/samples" className="block p-4 bg-amber-50 text-amber-800 rounded-2xl font-bold text-center hover:bg-amber-100 transition-colors">
                            Manage Sample Requests ({stats.pendingSamples})
                        </Link>
                    </div>

                    {/* Orders Queue Link */}
                    <div className="md:col-span-2 bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center text-2xl font-bold">📋</div>
                            <div>
                                <h2 className="text-lg font-bold text-gray-900">Packing Orders Queue</h2>
                                <p className="text-sm text-gray-500 font-medium">You have {stats.toPack} orders waiting to be packed and shipped.</p>
                            </div>
                        </div>
                        <Link to="/store/orders" className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-shadow shadow-md shadow-indigo-100">
                            Open Queue
                        </Link>
                    </div>
                </div>

                {/* MIS Reports Section */}
                <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                        <span className="p-2 bg-purple-50 rounded-lg">📊</span> MIS & Analytics Reports
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <button
                            onClick={() => handleDownload('/reports/raw-material-mis', 'raw_material_mis.xlsx')}
                            disabled={downloading}
                            className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl hover:bg-purple-50 transition-colors group w-full text-left"
                        >
                            <div className="flex items-center gap-3">
                                <span className="text-2xl">📋</span>
                                <div>
                                    <p className="font-bold text-gray-900">Raw Material MIS</p>
                                    <p className="text-xs text-gray-500">Current stock, usage & inward logs</p>
                                </div>
                            </div>
                            <span className="text-xs font-bold text-purple-600 group-hover:translate-x-1 transition-transform">
                                {downloading ? '...' : 'Download Excel ↓'}
                            </span>
                        </button>
                        <button
                            onClick={() => handleDownload('/reports/product-sales-batch-wise', 'product_sales_batch_wise.xlsx')}
                            disabled={downloading}
                            className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl hover:bg-purple-50 transition-colors group w-full text-left"
                        >
                            <div className="flex items-center gap-3">
                                <span className="text-2xl">📈</span>
                                <div>
                                    <p className="font-bold text-gray-900">Product Sales (Batch-wise)</p>
                                    <p className="text-xs text-gray-500">Detailed sales report with batch info</p>
                                </div>
                            </div>
                            <span className="text-xs font-bold text-purple-600 group-hover:translate-x-1 transition-transform">
                                {downloading ? '...' : 'Download Excel ↓'}
                            </span>
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
}
