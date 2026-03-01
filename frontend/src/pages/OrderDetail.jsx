import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';

// ── Status helpers ────────────────────────────────────────
const STATUS_CONFIG = {
    PENDING: { label: 'Pending', cls: 'status-pending', icon: '🕐', color: '#b45309' },
    BILLED: { label: 'Billed', cls: 'status-billed', icon: '📄', color: '#1d4ed8' },
    DELIVERED: { label: 'Delivered', cls: 'status-delivered', icon: '✅', color: '#166534' },
    CANCELLED: { label: 'Cancelled', cls: 'status-cancelled', icon: '❌', color: '#991b1b' },
};

const MODE_ICONS = { CASH: '💵', CHEQUE: '🏦', UPI: '📱', NEFT: '🔁', CREDIT: '💳' };

function InfoRow({ label, value, bold }) {
    if (!value) return null;
    return (
        <div className="flex justify-between items-start gap-2 py-1.5 border-b border-gray-50 last:border-0">
            <span className="text-xs text-gray-500 shrink-0">{label}</span>
            <span className={`text-xs text-right ${bold ? 'font-bold text-gray-800' : 'text-gray-700'}`}>{value}</span>
        </div>
    );
}

// ── Status Timeline ───────────────────────────────────────
function StatusTimeline({ order }) {
    const steps = [
        {
            status: 'PENDING',
            label: 'Order Placed',
            date: order.order_date,
            by: order.salesperson_name,
        },
        {
            status: 'BILLED',
            label: 'Billed',
            date: order.bill_date,
            by: order.billed_by_name,
            extra: order.bill_number ? `Bill# ${order.bill_number}` : null,
        },
        {
            status: 'DELIVERED',
            label: 'Delivered',
            date: order.delivery_date,
            by: order.delivered_by_name,
            extra: order.delivery_remark,
        },
    ];

    const currentIdx = { PENDING: 0, BILLED: 1, DELIVERED: 2, CANCELLED: 0 }[order.status] ?? 0;
    const isCancelled = order.status === 'CANCELLED';

    return (
        <div className="card mb-3">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Order Timeline</h3>
            <div className="space-y-3">
                {steps.map((step, i) => {
                    const sc = STATUS_CONFIG[step.status];
                    const done = !isCancelled && i <= currentIdx;
                    return (
                        <div key={step.status} className="flex gap-3">
                            {/* dot + line */}
                            <div className="flex flex-col items-center">
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm transition-all ${done ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-400'
                                    }`}>
                                    {sc.icon}
                                </div>
                                {i < steps.length - 1 && (
                                    <div className={`w-0.5 flex-1 mt-1 ${done && i < currentIdx ? 'bg-brand-400' : 'bg-gray-200'}`} style={{ minHeight: '1.5rem' }} />
                                )}
                            </div>
                            {/* content */}
                            <div className="flex-1 pb-2">
                                <div className="flex items-baseline justify-between">
                                    <p className={`text-sm font-medium ${done ? 'text-gray-800' : 'text-gray-400'}`}>{step.label}</p>
                                    {step.date && <p className="text-xs text-gray-400">{step.date}</p>}
                                </div>
                                {step.by && <p className="text-xs text-gray-500">by {step.by}</p>}
                                {step.extra && <p className="text-xs text-brand-600 mt-0.5 italic">{step.extra}</p>}
                            </div>
                        </div>
                    );
                })}
                {isCancelled && (
                    <p className="text-xs text-red-600 font-medium mt-1">⚠ This order was cancelled.</p>
                )}
            </div>
        </div>
    );
}

// ══════════════════════════════════════════════════════════
// Main Component
// ══════════════════════════════════════════════════════════
export default function OrderDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const load = () => {
        setLoading(true);
        api.get(`/orders/${id}`)
            .then(r => setOrder(r.data))
            .catch(() => setError('Order not found.'))
            .finally(() => setLoading(false));
    };
    useEffect(() => { load(); }, [id]);

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
    );

    if (error || !order) return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-3">
            <p className="text-5xl">😕</p>
            <p className="text-gray-500">{error || 'Order not found.'}</p>
            <button onClick={() => navigate(-1)} className="btn-primary max-w-xs">Go Back</button>
        </div>
    );

    const sc = STATUS_CONFIG[order.status] || STATUS_CONFIG.PENDING;
    const totalPaid = parseFloat(order.total_paid || 0);
    const outstanding = parseFloat(order.total_amount) - totalPaid;
    const paidPct = Math.min(100, (totalPaid / parseFloat(order.total_amount)) * 100);
    const canCancel = ['admin', 'super_admin'].includes(user?.role) &&
        !['DELIVERED', 'CANCELLED'].includes(order.status);

    const handleCancel = async () => {
        if (!window.confirm('Are you sure you want to cancel this order?')) return;
        try {
            await api.patch(`/orders/${id}/cancel`);
            load();
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to cancel order.');
        }
    };

    return (
        <div className="pb-10">
            {/* Header */}
            <div className="page-header">
                <button onClick={() => navigate(-1)} className="text-gray-500 text-xl leading-none">←</button>
                <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-800 truncate text-sm">{order.retailer_name}</p>
                    <p className="text-xs text-gray-400 font-mono">{order.order_number}</p>
                </div>
                <span className={sc.cls}>{sc.icon} {sc.label}</span>
            </div>

            <div className="px-4 pt-4 space-y-3">

                {/* Retailer card */}
                <div className="card">
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">Retailer Info</h3>
                    <InfoRow label="Firm" value={order.retailer_name} bold />
                    <InfoRow label="Area" value={order.area_name} />
                    <InfoRow label="Phone" value={order.retailer_phone} />
                    <InfoRow label="Address" value={order.retailer_address} />
                </div>

                {/* Order info */}
                <div className="card">
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">Order Info</h3>
                    <InfoRow label="Salesperson" value={order.salesperson_name} />
                    <InfoRow label="Order Date" value={order.order_date} />
                    <InfoRow label="Notes" value={order.notes} />
                </div>

                {/* Timeline */}
                <StatusTimeline order={order} />

                {/* Items */}
                <div className="card overflow-hidden">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">
                        Order Items ({order.items?.length || 0})
                    </h3>
                    <div className="overflow-x-auto -mx-4 px-4">
                        <table className="w-full text-xs min-w-[400px]">
                            <thead>
                                <tr className="bg-gray-50 text-gray-500">
                                    <th className="text-left py-2 px-2 font-medium">Product</th>
                                    <th className="text-center py-2 px-2 font-medium">Qty</th>
                                    <th className="text-right py-2 px-2 font-medium">Rate</th>
                                    <th className="text-right py-2 px-2 font-medium">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {order.items?.map((item, i) => (
                                    <tr key={i} className="border-t border-gray-50">
                                        <td className="py-2 px-2">
                                            <p className="font-medium text-gray-800">{item.product_name}</p>
                                            {item.sku && <p className="text-gray-400">{item.sku}</p>}
                                        </td>
                                        <td className="py-2 px-2 text-center text-gray-600">
                                            {item.qty_billed ?? item.qty_ordered}
                                            <span className="text-gray-400 ml-0.5">{item.unit}</span>
                                            {item.qty_billed && item.qty_billed !== item.qty_ordered && (
                                                <p className="text-orange-500 text-[10px]">Ordered: {item.qty_ordered}</p>
                                            )}
                                        </td>
                                        <td className="py-2 px-2 text-right text-gray-600">
                                            ₹{parseFloat(item.unit_price).toFixed(2)}
                                            {parseFloat(item.discount_pct) > 0 && (
                                                <p className="text-green-600 text-[10px]">-{item.discount_pct}%</p>
                                            )}
                                        </td>
                                        <td className="py-2 px-2 text-right font-semibold text-gray-800">
                                            ₹{parseFloat(item.line_amount).toLocaleString('en-IN')}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Totals */}
                    <div className="mt-3 pt-3 border-t border-gray-100 space-y-1">
                        <div className="flex justify-between text-xs text-gray-500">
                            <span>Subtotal</span>
                            <span>₹{parseFloat(order.subtotal).toLocaleString('en-IN')}</span>
                        </div>
                        {parseFloat(order.discount) > 0 && (
                            <div className="flex justify-between text-xs text-green-600">
                                <span>Discount</span>
                                <span>- ₹{parseFloat(order.discount).toLocaleString('en-IN')}</span>
                            </div>
                        )}
                        {parseFloat(order.gst_amount) > 0 && (
                            <div className="flex justify-between text-xs text-gray-500">
                                <span>GST</span>
                                <span>₹{parseFloat(order.gst_amount).toLocaleString('en-IN')}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-sm font-bold text-gray-800 pt-1 border-t border-gray-200">
                            <span>Total</span>
                            <span>₹{parseFloat(order.total_amount).toLocaleString('en-IN')}</span>
                        </div>
                    </div>
                </div>

                {/* Payment summary */}
                <div className="card">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">
                        Payment
                        {order.payments?.length > 0 && (
                            <span className="ml-2 text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                                {order.payments.length} collection{order.payments.length > 1 ? 's' : ''}
                            </span>
                        )}
                    </h3>

                    {/* Progress bar */}
                    <div className="mb-3">
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                            <span>Paid: <strong className="text-green-700">₹{totalPaid.toLocaleString('en-IN')}</strong></span>
                            <span>Due: <strong className={outstanding > 0 ? 'text-red-600' : 'text-green-600'}>₹{outstanding.toLocaleString('en-IN')}</strong></span>
                        </div>
                        <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${paidPct >= 100 ? 'bg-green-500' : 'bg-brand-500'} transition-all`}
                                style={{ width: `${paidPct}%` }} />
                        </div>
                    </div>

                    {/* Collection entries */}
                    {order.payments?.length > 0 ? (
                        <div className="space-y-2">
                            {order.payments.map((p, i) => (
                                <div key={i} className="flex items-start justify-between bg-gray-50 rounded-xl p-2.5 gap-2">
                                    <div>
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-base leading-none">{MODE_ICONS[p.mode] || '💰'}</span>
                                            <span className="text-xs font-semibold text-gray-800">{p.mode}</span>
                                            {p.reference_no && <span className="text-xs text-gray-400">#{p.reference_no}</span>}
                                        </div>
                                        <p className="text-[10px] text-gray-400 mt-0.5">
                                            {p.collection_date} · by {p.collected_by_name}
                                            {p.is_verified ? ' ✓ Verified' : ''}
                                        </p>
                                        {p.remarks && <p className="text-[10px] text-gray-500 italic mt-0.5">{p.remarks}</p>}
                                    </div>
                                    <p className="font-bold text-green-700 text-sm shrink-0">
                                        ₹{parseFloat(p.amount).toLocaleString('en-IN')}
                                    </p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-xs text-gray-400 italic text-center py-3">No payments recorded yet</p>
                    )}
                </div>

                {/* Cancel button (Admin only) */}
                {canCancel && (
                    <button onClick={handleCancel}
                        className="w-full py-3 border-2 border-red-300 text-red-600 rounded-xl text-sm font-semibold">
                        ❌ Cancel This Order
                    </button>
                )}
            </div>
        </div>
    );
}
