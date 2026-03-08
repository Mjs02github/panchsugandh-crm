import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';

function StatusBadge({ status }) {
    const cls = {
        PENDING: 'status-pending',
        BILLED: 'status-billed',
        DELIVERED: 'status-delivered',
        CANCELLED: 'status-cancelled',
        CANCEL_REQUESTED: 'bg-red-100 text-red-700 px-2.5 py-1 text-xs rounded-full font-semibold',
        READY_TO_SHIP: 'bg-purple-100 text-purple-700 px-2.5 py-1 text-xs rounded-full font-semibold',
    };
    const labels = { CANCEL_REQUESTED: 'Cancel Req', READY_TO_SHIP: 'Ready Ship' };
    return <span className={cls[status] || 'status-pending'}>{labels[status] || status}</span>;
}

const now = new Date();
const YEARS = Array.from({ length: 4 }, (_, i) => now.getFullYear() - i);
const MONTHS = [
    { val: '', label: 'All Months' },
    { val: '01', label: 'January' }, { val: '02', label: 'February' }, { val: '03', label: 'March' },
    { val: '04', label: 'April' }, { val: '05', label: 'May' }, { val: '06', label: 'June' },
    { val: '07', label: 'July' }, { val: '08', label: 'August' }, { val: '09', label: 'September' },
    { val: '10', label: 'October' }, { val: '11', label: 'November' }, { val: '12', label: 'December' },
];

export default function OrdersList() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState(new URLSearchParams(window.location.search).get('status') || '');

    // Date filters
    const [year, setYear] = useState(String(now.getFullYear()));
    const [month, setMonth] = useState('');
    const [specificDate, setSpecificDate] = useState('');

    const isSalesperson = user?.role === 'salesperson';
    const isAdmin = ['admin', 'super_admin'].includes(user?.role);

    const load = () => {
        setLoading(true);
        const params = {};
        if (filter) params.status = filter;
        if (specificDate) {
            params.date = specificDate;
        } else if (year && month) {
            params.from = `${year}-${month}-01`;
            const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
            params.to = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;
        } else if (year) {
            params.from = `${year}-01-01`;
            params.to = `${year}-12-31`;
        }
        api.get('/orders', { params })
            .then(r => setOrders(r.data))
            .catch(() => { })
            .finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, [filter, year, month, specificDate]);

    const clearDateFilter = () => { setSpecificDate(''); setMonth(''); setYear(String(now.getFullYear())); };

    const dateLabel = specificDate
        ? `Date: ${specificDate}`
        : month
            ? `${MONTHS.find(m => m.val === month)?.label} ${year}`
            : `Year ${year}`;

    return (
        <div className="pb-24">
            <div className="page-header">
                <h1 className="text-lg font-semibold flex-1">{isSalesperson ? 'My Orders' : 'All Orders'}</h1>
                <select className="text-sm border border-gray-200 rounded-lg px-2 py-1 text-gray-600"
                    value={filter} onChange={e => {
                        setFilter(e.target.value);
                        navigate(`/orders${e.target.value ? `?status=${e.target.value}` : ''}`, { replace: true });
                    }}>
                    <option value="">All Status</option>
                    <option value="PENDING">Pending</option>
                    <option value="BILLED">Billed</option>
                    <option value="READY_TO_SHIP">Ready to Ship</option>
                    <option value="DELIVERED">Delivered</option>
                    <option value="CANCELLED">Cancelled</option>
                    {isAdmin && <option value="CANCEL_REQUESTED">Cancel Requests</option>}
                </select>
            </div>

            {/* ── Date Filter Bar ── */}
            <div className="px-4 pt-3 pb-0">
                <div className="bg-white border border-gray-200 rounded-2xl p-3 shadow-sm space-y-2">
                    <div className="flex gap-2">
                        {/* Year */}
                        <select className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-2 text-gray-700 bg-white font-medium"
                            value={year} onChange={e => { setYear(e.target.value); setSpecificDate(''); }}>
                            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                        {/* Month */}
                        <select className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-2 text-gray-700 bg-white"
                            value={month} onChange={e => { setMonth(e.target.value); setSpecificDate(''); }}>
                            {MONTHS.map(m => <option key={m.val} value={m.val}>{m.label}</option>)}
                        </select>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Specific Date */}
                        <div className="flex-1 relative">
                            <input type="date"
                                className="w-full text-xs border border-gray-200 rounded-lg px-2 py-2 text-gray-700"
                                value={specificDate}
                                onChange={e => { setSpecificDate(e.target.value); setMonth(''); }} />
                        </div>
                        {(specificDate || month || year !== String(now.getFullYear())) && (
                            <button onClick={clearDateFilter}
                                className="text-xs text-red-500 font-semibold px-2 py-2 border border-red-200 rounded-lg whitespace-nowrap bg-red-50">
                                ✕ Clear
                            </button>
                        )}
                    </div>
                    <p className="text-[10px] text-gray-400 text-center font-medium">📅 {dateLabel} — {orders.length} order{orders.length !== 1 ? 's' : ''}</p>
                </div>
            </div>

            <div className="px-4 py-3 space-y-3">
                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : orders.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                        <div className="text-5xl mb-3">📋</div>
                        <p>No orders found for this period</p>
                    </div>
                ) : orders.map(o => (
                    <div key={o.id} className="card" onClick={() => navigate(`/orders/${o.id}`)}>
                        <div className="flex items-start justify-between mb-2">
                            <div>
                                <p className="font-semibold text-gray-800 text-sm">{o.retailer_name}</p>
                                <p className="text-xs text-gray-500">{o.area_name || 'No area'}</p>
                            </div>
                            <StatusBadge status={o.status} />
                        </div>
                        <div className="flex items-end justify-between mt-2">
                            <div>
                                <p className="text-xs text-gray-500 font-mono">{o.order_number}</p>
                                <p className="text-xs text-gray-400">{String(o.order_date).split('T')[0]}</p>
                                {!isSalesperson && <p className="text-[10px] text-gray-400 mt-0.5">By {o.salesperson_name}</p>}
                            </div>
                            <div className="text-right flex flex-col items-end">
                                <p className="text-lg font-bold text-brand-700 leading-none">₹{parseFloat(o.total_amount).toLocaleString('en-IN')}</p>
                                <Link to={`/orders/${o.id}`} className="text-xs text-brand-600 font-medium underline mt-1" onClick={e => e.stopPropagation()}>View Details</Link>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
                    </div>
    );
}
