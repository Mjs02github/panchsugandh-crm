import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api';
import { useAuth } from '../../context/AuthContext';

const TABS = [
    { key: 'master', label: '📋 Master', endpoint: '/reports/master' },
    { key: 'product', label: '📦 Product-wise', endpoint: '/reports/product-wise' },
    { key: 'party', label: '🏪 Party-wise', endpoint: '/reports/party-wise' },
    { key: 'date', label: '📅 Date-wise', endpoint: '/reports/date-wise' },
    { key: 'salesman', label: '👤 Salesman-wise', endpoint: '/reports/salesman-wise' },
    { key: 'attendance', label: '🕒 Attendance', endpoint: '/reports/attendance', adminOnly: true },
];

export default function Reports() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const today = new Date().toISOString().slice(0, 10);
    const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);

    const [activeTab, setActiveTab] = useState('master');
    const [from, setFrom] = useState(firstDay);
    const [to, setTo] = useState(today);
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [downloading, setDownloading] = useState(false);

    const isSalesperson = user?.role === 'salesperson';
    // If salesperson, only show master tab (their own data)
    const visibleTabs = isSalesperson
        ? TABS.filter(t => t.key === 'master')
        : TABS.filter(t => !t.adminOnly || ['admin', 'super_admin', 'sales_officer'].includes(user?.role));

    const currentTab = TABS.find(t => t.key === activeTab);

    const fetchData = useCallback(() => {
        if (!currentTab) return;
        setLoading(true);
        setError('');
        api.get(currentTab.endpoint, { params: { from, to } })
            .then(res => setData(res.data.data || []))
            .catch(() => setError('Failed to load report data.'))
            .finally(() => setLoading(false));
    }, [activeTab, from, to]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleDownload = async () => {
        setDownloading(true);
        try {
            const token = localStorage.getItem('crm_token');
            const baseURL = api.defaults.baseURL || '/api';
            const response = await fetch(
                `${baseURL}${currentTab.endpoint}?from=${from}&to=${to}&format=excel`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (!response.ok) throw new Error('Download failed');
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${currentTab.key}_report_${from}_to_${to}.xlsx`;
            a.click();
            URL.revokeObjectURL(url);
        } catch {
            setError('Failed to download Excel file.');
        } finally {
            setDownloading(false);
        }
    };

    const columns = data.length > 0 ? Object.keys(data[0]) : [];

    return (
        <div className="pb-24">
            <div className="page-header border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="w-8 h-8 flex items-center justify-center bg-white border border-gray-200 rounded-full shadow-sm">
                        <span className="text-gray-600 relative -top-[1px]">←</span>
                    </button>
                    <h1 className="text-lg font-semibold text-gray-800">MIS Reports</h1>
                </div>
            </div>

            <div className="p-4 space-y-4">
                {/* Date Range Filter */}
                <div className="card flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-4">
                    <div className="flex-1">
                        <label className="label">From Date</label>
                        <input type="date" className="input" value={from} onChange={e => setFrom(e.target.value)} max={to} />
                    </div>
                    <div className="flex-1">
                        <label className="label">To Date</label>
                        <input type="date" className="input" value={to} onChange={e => setTo(e.target.value)} min={from} max={today} />
                    </div>
                    <button onClick={fetchData} className="btn-primary whitespace-nowrap">
                        Apply Filter
                    </button>
                </div>

                {/* Report Tabs */}
                <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
                    {visibleTabs.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${activeTab === tab.key
                                ? 'bg-brand-600 text-white shadow-md'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Header & Download */}
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm text-gray-500">{data.length} record{data.length !== 1 ? 's' : ''} found</p>
                    </div>
                    {data.length > 0 && (
                        <button
                            onClick={handleDownload}
                            disabled={downloading}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors disabled:opacity-60"
                        >
                            {downloading ? (
                                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <span>⬇️</span>
                            )}
                            Download Excel
                        </button>
                    )}
                </div>

                {/* Error */}
                {error && <p className="text-red-500 text-sm">{error}</p>}

                {/* Data Table */}
                <div className="card overflow-x-auto p-0 rounded-xl border border-gray-200">
                    {loading ? (
                        <div className="flex justify-center py-10">
                            <div className="w-7 h-7 border-[3px] border-brand-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : data.length === 0 ? (
                        <div className="text-center py-10">
                            <div className="text-4xl mb-2">📊</div>
                            <p className="text-gray-400 text-sm">No data found for the selected period.</p>
                        </div>
                    ) : (
                        <table className="w-full text-left min-w-[640px]">
                            <thead>
                                <tr className="bg-gray-800 text-white text-xs uppercase tracking-wider">
                                    {columns.map(col => (
                                        <th key={col} className="px-3 py-3 font-medium whitespace-nowrap">{col}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {data.map((row, idx) => (
                                    <tr key={idx} className={`hover:bg-gray-50 text-sm transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                                        {columns.map(col => (
                                            <td key={col} className="px-3 py-2.5 text-gray-700 whitespace-nowrap">
                                                {row[col] !== null && row[col] !== undefined ? String(row[col]) : '—'}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}
