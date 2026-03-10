import { useState, useEffect } from 'react';
import api from '../../api';

export default function TaxPanel() {
    const [loading, setLoading] = useState(false);
    const [summary, setSummary] = useState([]);
    const [stats, setStats] = useState({ taxable: 0, gst: 0, total: 0 });
    const [range, setRange] = useState({
        from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10),
        to: new Date().toISOString().slice(0, 10)
    });

    const load = async () => {
        setLoading(true);
        try {
            const res = await api.get('/reports/gst-data', { params: range });
            const rows = res.data.data || [];
            setSummary(rows);
            
            const s = rows.reduce((acc, curr) => ({
                taxable: acc.taxable + parseFloat(curr['Taxable Value'] || 0),
                gst: acc.gst + parseFloat(curr['GST Amount'] || 0),
                total: acc.total + parseFloat(curr['Invoice Value'] || 0)
            }), { taxable: 0, gst: 0, total: 0 });
            setStats(s);
        } catch (err) {
            console.error('Failed to load GST data', err);
            setSummary([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const downloadExcel = () => {
        window.open(`${api.defaults.baseURL}/reports/gst-data?format=excel&from=${range.from}&to=${range.to}`, '_blank');
    };

    const downloadJSON = () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(summary, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `GST_Data_${range.from}_to_${range.to}.json`);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Tax & GST Panel</h1>
                    <p className="text-gray-500 text-sm">Review taxable values and download filing data</p>
                </div>

                <div className="flex flex-wrap gap-2">
                    <input
                        type="date"
                        value={range.from}
                        onChange={e => setRange({ ...range, from: e.target.value })}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                    />
                    <input
                        type="date"
                        value={range.to}
                        onChange={e => setRange({ ...range, to: e.target.value })}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                    />
                    <button
                        onClick={load}
                        disabled={loading}
                        className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
                    >
                        {loading ? '...' : 'Refresh'}
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Total Taxable Value</p>
                    <p className="text-2xl font-bold text-gray-900">₹{stats.taxable.toLocaleString()}</p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Total GST Collected</p>
                    <p className="text-2xl font-bold text-brand-600">₹{stats.gst.toLocaleString()}</p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Total Invoice Value</p>
                    <p className="text-2xl font-bold text-gray-900">₹{stats.total.toLocaleString()}</p>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                    <h2 className="font-bold text-gray-800">GST Filing Data (B2B/B2C)</h2>
                    <div className="flex gap-2">
                        <button
                            onClick={downloadExcel}
                            className="flex items-center gap-2 px-3 py-1.5 border border-green-600 text-green-700 rounded-lg text-xs font-medium hover:bg-green-50 transition-colors"
                        >
                            <span>📊</span> Download Excel
                        </button>
                        <button
                            onClick={downloadJSON}
                            className="flex items-center gap-2 px-3 py-1.5 border border-blue-600 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-50 transition-colors"
                        >
                            <span>📄</span> Download JSON
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse">
                        <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200">
                            <tr>
                                <th className="px-4 py-3">Invoice Details</th>
                                <th className="px-4 py-3">Party Name</th>
                                <th className="px-4 py-3">GSTIN</th>
                                <th className="px-4 py-3 text-right">Taxable Amt</th>
                                <th className="px-4 py-3 text-right">GST</th>
                                <th className="px-4 py-3 text-right">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {summary.map((row, idx) => (
                                <tr key={idx} className="hover:bg-gray-50">
                                    <td className="px-4 py-3">
                                        <div className="font-medium text-gray-900">{row['Invoice No']}</div>
                                        <div className="text-[10px] text-gray-500 uppercase">{row['Invoice Date']}</div>
                                    </td>
                                    <td className="px-4 py-3 text-gray-700">{row['Party Name']}</td>
                                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">{row['Party GSTIN'] || 'UNREGISTERED'}</td>
                                    <td className="px-4 py-3 text-right font-medium">₹{parseFloat(row['Taxable Value']).toLocaleString()}</td>
                                    <td className="px-4 py-3 text-right text-brand-600">₹{parseFloat(row['GST Amount']).toLocaleString()}</td>
                                    <td className="px-4 py-3 text-right font-bold">₹{parseFloat(row['Invoice Value']).toLocaleString()}</td>
                                </tr>
                            ))}
                            {summary.length === 0 && (
                                <tr>
                                    <td colSpan="6" className="px-4 py-10 text-center text-gray-500">No GST data found for the selected period.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
