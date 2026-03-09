import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api';
import InvoiceTemplate from '../../components/InvoiceTemplate';

// ── Shared date filter ─────────────────────────────────────
const now = new Date();
const YEARS = Array.from({ length: 4 }, (_, i) => now.getFullYear() - i);
const MONTHS = [
    { val: '', label: 'All Months' },
    { val: '01', label: 'Jan' }, { val: '02', label: 'Feb' }, { val: '03', label: 'Mar' },
    { val: '04', label: 'Apr' }, { val: '05', label: 'May' }, { val: '06', label: 'Jun' },
    { val: '07', label: 'Jul' }, { val: '08', label: 'Aug' }, { val: '09', label: 'Sep' },
    { val: '10', label: 'Oct' }, { val: '11', label: 'Nov' }, { val: '12', label: 'Dec' },
];

function buildDateParams(year, month, specificDate) {
    if (specificDate) return { date: specificDate };
    if (year && month) {
        const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
        return { from: `${year}-${month}-01`, to: `${year}-${month}-${String(lastDay).padStart(2, '0')}` };
    }
    return { from: `${year}-01-01`, to: `${year}-12-31` };
}

const STATUS_LABEL = { PENDING: 'Pending', BILLED: 'Billed', READY_TO_SHIP: 'Ready', DELIVERED: 'Delivered', CANCELLED: 'Cancelled', CANCEL_REQUESTED: 'Cancel Req' };
const STATUS_COLOR = {
    PENDING: 'bg-yellow-100 text-yellow-700',
    BILLED: 'bg-blue-100 text-blue-700',
    READY_TO_SHIP: 'bg-purple-100 text-purple-700',
    DELIVERED: 'bg-green-100 text-green-700',
    CANCELLED: 'bg-red-100 text-red-700',
    CANCEL_REQUESTED: 'bg-orange-100 text-orange-700',
};

export default function BillingQueue() {
    const navigate = useNavigate();
    const [tab, setTab] = useState('queue'); // 'queue' | 'history'

    // ── Queue state ────────────────────────────────────────
    const [orders, setOrders] = useState([]);
    const [selected, setSelected] = useState(null);
    const [billNum, setBillNum] = useState('');
    const [billDate, setBillDate] = useState(now.toISOString().slice(0, 10));
    const [finalAmount, setFinalAmount] = useState('');
    const [orderItems, setOrderItems] = useState([]);
    const [loadingQ, setLoadingQ] = useState(true);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [lastBilledOrder, setLastBilledOrder] = useState(null);
    const [showCancelFor, setShowCancelFor] = useState(null);
    const [cancelReason, setCancelReason] = useState('');
    const [itemDiscounts, setItemDiscounts] = useState({}); // {itemId: discPct}

    // ── History state ──────────────────────────────────────
    const [history, setHistory] = useState([]);
    const [loadingH, setLoadingH] = useState(false);
    const [year, setYear] = useState(String(now.getFullYear()));
    const [month, setMonth] = useState(String(now.getMonth() + 1).padStart(2, '0'));
    const [specificDate, setSpecificDate] = useState('');
    const [histStatus, setHistStatus] = useState('BILLED');
    const [printOrder, setPrintOrder] = useState(null);
    const [printItems, setPrintItems] = useState([]);
    const [itemBatches, setItemBatches] = useState({}); // {itemId: batch_number}
    const [itemMRPs, setItemMRPs] = useState({}); // {itemId: mrp}
    const [availableBatches, setAvailableBatches] = useState({}); // {productId: [batches]}

    // ── Load Queue ─────────────────────────────────────────
    const loadQueue = () => {
        setLoadingQ(true);
        api.get('/orders', { params: { status: 'PENDING' } })
            .then(r => setOrders(r.data))
            .finally(() => setLoadingQ(false));
    };
    useEffect(() => { loadQueue(); }, []);

    // ── Load History ───────────────────────────────────────
    const loadHistory = () => {
        setLoadingH(true);
        const dateParams = buildDateParams(year, month, specificDate);
        const params = { ...dateParams };
        if (histStatus) params.status = histStatus;
        api.get('/orders', { params })
            .then(r => setHistory(r.data))
            .catch(() => { })
            .finally(() => setLoadingH(false));
    };
    useEffect(() => { if (tab === 'history') loadHistory(); }, [tab, year, month, specificDate, histStatus]);

    // ── Bill submission ────────────────────────────────────
    const handleSelectOrder = async (order) => {
        setSelected(order.id); setSuccess(''); setError('');
        setBillNum(''); setOrderItems([]); setItemDiscounts({});
        setItemBatches({}); setItemMRPs({}); setAvailableBatches({});
        setShowCancelFor(null); setCancelReason('');
        setLoadingDetails(true);
        try {
            const r = await api.get(`/orders/${order.id}`);
            const items = r.data.items || [];
            setOrderItems(items);

            // Pre-fill discounts and fetch batches for each product
            const discMap = {};
            const mrpMap = {};
            for (const it of items) {
                discMap[it.id] = parseFloat(it.discount_pct || 0);
                mrpMap[it.id] = parseFloat(it.mrp || 0);

                // Fetch batches for this product if not already fetched
                if (!availableBatches[it.product_id]) {
                    const bRes = await api.get(`/store/inventory/product/${it.product_id}/batches`);
                    setAvailableBatches(prev => ({ ...prev, [it.product_id]: bRes.data }));

                    // Default to first batch if available
                    if (bRes.data.length > 0) {
                        setItemBatches(prev => ({ ...prev, [it.id]: bRes.data[0].batch_number }));
                        setItemMRPs(prev => ({ ...prev, [it.id]: bRes.data[0].mrp }));
                    }
                }
            }
            setItemDiscounts(discMap);
            setItemMRPs(mrpMap);
        }
        catch { setError('Failed to load order items.'); }
        finally { setLoadingDetails(false); }
    };

    // Helpers — same formula as NewOrder
    const calcBaseRate = (mrp, gst) => parseFloat(mrp || 0) / (1 + parseFloat(gst || 0) / 100);
    const calcBilledRate = (mrp, gst, disc) => calcBaseRate(mrp, gst) * (1 - parseFloat(disc || 0) / 100);
    const calcLineAmt = (mrp, gst, disc, qty) => {
        const billed = calcBilledRate(mrp, gst, disc);
        const gstFactor = 1 + parseFloat(gst || 0) / 100;
        return billed * gstFactor * parseInt(qty || 1);
    };

    const computedTotal = orderItems.reduce((s, it) => {
        const disc = itemDiscounts[it.id] ?? parseFloat(it.discount_pct || 0);
        const mrp = itemMRPs[it.id] ?? parseFloat(it.mrp || 0);
        return s + calcLineAmt(mrp, it.gst_rate, disc, it.qty_billed ?? it.qty_ordered);
    }, 0);

    const handleBill = async (orderId) => {
        if (!billNum.trim()) return setError('Bill number is required.');
        setSubmitting(true); setError('');
        try {
            const billingItems = orderItems.map(it => {
                const mrp = itemMRPs[it.id] ?? parseFloat(it.mrp || 0);
                const unitPrice = calcBaseRate(mrp, it.gst_rate);
                return {
                    id: it.id,
                    qty_billed: it.qty_billed ?? it.qty_ordered,
                    discount_pct: itemDiscounts[it.id] ?? parseFloat(it.discount_pct || 0),
                    batch_number: itemBatches[it.id] || null,
                    mrp: mrp,
                    unit_price: parseFloat(unitPrice.toFixed(2)),
                    line_amount: parseFloat(calcLineAmt(
                        mrp,
                        it.gst_rate,
                        itemDiscounts[it.id] ?? it.discount_pct,
                        it.qty_billed ?? it.qty_ordered
                    ).toFixed(2)),
                };
            });
            const finalAmt = parseFloat(computedTotal.toFixed(2));
            await api.patch(`/orders/${orderId}/bill`, {
                bill_number: billNum,
                bill_date: billDate,
                final_amount: finalAmt,
                items: billingItems,
            });
            const billedOrder = orders.find(o => o.id === orderId);
            setLastBilledOrder({ ...billedOrder, bill_number: billNum, bill_date: billDate, total_amount: finalAmt, status: 'BILLED' });
            setSuccess('Order marked as BILLED! You can now print the invoice.');
            setSelected(null); setBillNum('');
            // We keep orderItems for the hidden InvoiceTemplate print preview
            // till another order is selected or tab changed.
            loadQueue();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to update.');
        } finally { setSubmitting(false); }
    };

    const handleCancelRequest = async (orderId) => {
        if (!cancelReason.trim()) return setError('Cancellation reason is required.');
        setSubmitting(true); setError('');
        try {
            await api.patch(`/orders/${orderId}/cancel-request`, { cancel_reason: cancelReason });
            setSuccess('Cancellation requested.'); setSelected(null); setShowCancelFor(null); setCancelReason('');
            loadQueue();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to request cancellation.');
        } finally { setSubmitting(false); }
    };

    // ── Print from history ─────────────────────────────────
    const handlePrintHistory = async (order) => {
        try {
            const r = await api.get(`/orders/${order.id}`);

            // Wait for React to render the InvoiceTemplate by setting state,
            // then wait a tick before capturing the DOM if native, or printing if web.
            setPrintOrder(order);
            setPrintItems(r.data.items || []);

            setTimeout(async () => {
                if (window.Capacitor?.isNativePlatform()) {
                    try {
                        const { Filesystem, Directory } = await import('@capacitor/filesystem');
                        const { Share } = await import('@capacitor/share');
                        const html2pdf = (await import('html2pdf.js')).default;

                        // 1. Get the invoice DOM node ( rendered by InvoiceTemplate component )
                        // Using querySelectorAll to get the LAST one in case lastBilledOrder is also present
                        const elements = document.querySelectorAll('.invoice-print-container');
                        const element = elements[elements.length - 1];
                        if (!element) return alert('Invoice element not found.');

                        // Clone it
                        const clone = element.cloneNode(true);
                        clone.style.display = 'block';
                        clone.classList.remove('hidden');
                        document.body.appendChild(clone);

                        // 2. Generate PDF blob
                        const opt = {
                            margin: 0,
                            filename: `Invoice_${order.order_number || order.bill_number}.pdf`,
                            image: { type: 'jpeg', quality: 0.98 },
                            html2canvas: { scale: 2, useCORS: true },
                            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
                        };

                        const pdfBlob = await html2pdf().set(opt).from(clone).outputPdf('blob');
                        document.body.removeChild(clone);

                        // 3. Convert Blob to Base64
                        const reader = new FileReader();
                        reader.readAsDataURL(pdfBlob);
                        const base64Data = await new Promise((resolve, reject) => {
                            reader.onloadend = () => resolve(reader.result.split(',')[1]);
                            reader.onerror = reject;
                        });

                        // 4. Save and Share relative Native File
                        const savedFile = await Filesystem.writeFile({
                            path: opt.filename,
                            data: base64Data,
                            directory: Directory.Documents
                        });

                        await Share.share({ title: opt.filename, url: savedFile.uri });
                    } catch (err) {
                        console.error('Android Print Error:', err);
                        alert('Failed to generate PDF on device.');
                    }
                } else {
                    window.print();
                }
            }, 300);

        } catch { alert('Failed to load order for printing.'); }
    };

    return (
        <div className="pb-24">
            {/* Header */}
            <div className="page-header">
                <h1 className="text-lg font-semibold flex-1">Billing</h1>
                {success && lastBilledOrder && (
                    <button onClick={() => handlePrintHistory(lastBilledOrder)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-xs font-semibold rounded-lg">
                        🖨️ Print
                    </button>
                )}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 px-4 py-2 border-b border-gray-100">
                {[{ key: 'queue', label: `📋 Queue (${orders.length})` }, { key: 'history', label: '🕒 History' }].map(t => (
                    <button key={t.key} onClick={() => { setTab(t.key); setError(''); setSuccess(''); }}
                        className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${tab === t.key ? 'bg-brand-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600'}`}>
                        {t.label}
                    </button>
                ))}
            </div>

            {error && <div className="mx-4 mt-3 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">{error}</div>}
            {success && (
                <div className="mx-4 mt-3 p-3 bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl flex items-center justify-between gap-3">
                    <span>{success}</span>
                    {lastBilledOrder && (
                        <button onClick={() => handlePrintHistory(lastBilledOrder)}
                            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-xs font-semibold rounded-lg">
                            🖨️ Print Invoice
                        </button>
                    )}
                </div>
            )}

            {/* ── QUEUE TAB ── */}
            {tab === 'queue' && (
                <div className="px-4 py-3 space-y-3">
                    {loadingQ ? (
                        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>
                    ) : orders.length === 0 ? (
                        <div className="text-center py-12 text-gray-400"><div className="text-5xl mb-3">✅</div><p>No orders pending billing</p></div>
                    ) : orders.map(o => (
                        <div key={o.id} className="card">
                            <div className="flex items-start justify-between mb-2">
                                <div>
                                    <p className="font-semibold text-gray-800">{o.retailer_name}</p>
                                    <p className="text-xs text-gray-500">{o.area_name} • {o.salesperson_name}</p>
                                    <p className="text-xs font-mono text-gray-400 mt-0.5">{o.order_number} • {String(o.order_date).split('T')[0]}</p>
                                </div>
                                <p className="font-bold text-brand-700">₹{parseFloat(o.total_amount).toLocaleString('en-IN')}</p>
                            </div>

                            {selected === o.id ? (<div className="mt-3 space-y-3 border-t border-gray-100 pt-3">
                                <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
                                    <h3 className="text-xs font-bold text-gray-700 mb-2">Order Items — Adjust Discount %</h3>
                                    {loadingDetails ? <p className="text-xs text-gray-400">Loading...</p> : orderItems.length > 0 ? (
                                        <div className="space-y-3">
                                            {orderItems.map((item) => {
                                                const disc = itemDiscounts[item.id] ?? parseFloat(item.discount_pct || 0);
                                                const qty = item.qty_billed ?? item.qty_ordered;
                                                const mrp = itemMRPs[item.id] ?? parseFloat(item.mrp || 0);
                                                const baseRate = calcBaseRate(mrp, item.gst_rate);
                                                const billedRate = calcBilledRate(mrp, item.gst_rate, disc);
                                                const lineAmt = calcLineAmt(mrp, item.gst_rate, disc, qty);
                                                const batches = availableBatches[item.product_id] || [];

                                                return (
                                                    <div key={item.id} className="border border-gray-200 rounded-lg p-3 bg-white space-y-3">
                                                        <div className="flex justify-between items-start">
                                                            <span className="text-xs font-semibold text-gray-800 flex-1 pr-2">{qty}× {item.product_name}</span>
                                                            <span className="text-sm font-bold text-brand-700">₹{lineAmt.toFixed(2)}</span>
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-3">
                                                            {/* Batch Selection */}
                                                            <div>
                                                                <label className="text-[10px] text-gray-400 block mb-1 uppercase font-bold">Select Batch</label>
                                                                <select
                                                                    className="w-full text-xs border border-gray-200 rounded-lg p-2 bg-gray-50 font-medium"
                                                                    value={itemBatches[item.id] || ''}
                                                                    onChange={e => {
                                                                        const selectedBatch = batches.find(b => b.batch_number === e.target.value);
                                                                        setItemBatches(prev => ({ ...prev, [item.id]: e.target.value }));
                                                                        if (selectedBatch) {
                                                                            setItemMRPs(prev => ({ ...prev, [item.id]: selectedBatch.mrp }));
                                                                        }
                                                                    }}
                                                                >
                                                                    <option value="">-- No Batch --</option>
                                                                    {batches.map(b => (
                                                                        <option key={b.batch_number} value={b.batch_number}>
                                                                            {b.batch_number} (Stk: {b.qty_on_hand})
                                                                        </option>
                                                                    ))}
                                                                </select>
                                                            </div>

                                                            {/* MRP Adjustment */}
                                                            <div>
                                                                <label className="text-[10px] text-gray-400 block mb-1 uppercase font-bold">MRP (editable)</label>
                                                                <input
                                                                    type="number" step="0.01"
                                                                    className="w-full text-xs border border-gray-200 rounded-lg p-2 bg-gray-50 font-bold text-brand-600"
                                                                    value={mrp}
                                                                    onChange={e => setItemMRPs(prev => ({ ...prev, [item.id]: parseFloat(e.target.value || 0) }))}
                                                                />
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-2 text-[10px] text-gray-500">
                                                            <span className="bg-gray-100 px-1.5 py-0.5 rounded">Base: ₹{baseRate.toFixed(2)}</span>
                                                            <span className="bg-brand-50 text-brand-600 px-1.5 py-0.5 rounded font-bold">Billed: ₹{billedRate.toFixed(2)}</span>
                                                        </div>

                                                        <div className="flex items-center gap-2 pt-1">
                                                            <label className="text-[10px] text-gray-500 shrink-0 font-bold uppercase">Disc %</label>
                                                            <input
                                                                type="number" min="0" max="100" step="0.5"
                                                                className="flex-1 text-xs border border-gray-200 rounded-lg p-1.5 bg-white font-medium"
                                                                value={disc}
                                                                onChange={e => setItemDiscounts(d => ({ ...d, [item.id]: parseFloat(e.target.value || 0) }))}
                                                            />
                                                            <span className="text-[10px] text-gray-400">on base rate</span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            <div className="flex justify-between text-sm font-bold text-gray-800 pt-1.5 border-t border-gray-200">
                                                <span>Computed Total</span>
                                                <span className="text-brand-700">₹{computedTotal.toFixed(2)}</span>
                                            </div>
                                        </div>
                                    ) : <p className="text-xs text-red-500">No items found.</p>}
                                </div>
                                <div><label className="label text-xs">Bill Number *</label>
                                    <input type="text" className="input" value={billNum} onChange={e => setBillNum(e.target.value)} placeholder="e.g. INV-2026-001" required /></div>
                                <div><label className="label text-xs">Bill Date</label>
                                    <input type="date" className="input" value={billDate} onChange={e => setBillDate(e.target.value)} /></div>

                                <div className="flex flex-col gap-2">
                                    <div className="flex gap-2">
                                        <button onClick={() => handleBill(o.id)} disabled={submitting || loadingDetails}
                                            className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50">
                                            {submitting ? 'Saving…' : '✅ Confirm Bill'}
                                        </button>
                                        <button onClick={() => setSelected(null)}
                                            className="flex-1 py-2.5 border border-gray-300 text-gray-600 rounded-xl text-sm font-semibold">Cancel</button>
                                    </div>
                                    <button onClick={() => setShowCancelFor(o.id)}
                                        className="w-full py-2 border border-red-300 text-red-600 bg-red-50 rounded-xl text-sm font-semibold hover:bg-red-100">
                                        ⚠️ Request Cancellation
                                    </button>
                                </div>
                            </div>
                            ) : (
                                <button onClick={() => handleSelectOrder(o)}
                                    className="mt-2 w-full py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold">Mark as Billed</button>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* ── HISTORY TAB ── */}
            {tab === 'history' && (
                <div className="px-4 py-3 space-y-3">
                    {/* Date + Status filters */}
                    <div className="bg-white border border-gray-200 rounded-2xl p-3 shadow-sm space-y-2">
                        <div className="flex gap-2">
                            <select className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-2 text-gray-700 bg-white font-medium"
                                value={year} onChange={e => { setYear(e.target.value); setSpecificDate(''); }}>
                                {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                            <select className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-2 text-gray-700 bg-white"
                                value={month} onChange={e => { setMonth(e.target.value); setSpecificDate(''); }}>
                                {MONTHS.map(m => <option key={m.val} value={m.val}>{m.label}</option>)}
                            </select>
                            <select className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-2 text-gray-700 bg-white"
                                value={histStatus} onChange={e => setHistStatus(e.target.value)}>
                                <option value="">All Status</option>
                                <option value="BILLED">Billed</option>
                                <option value="DELIVERED">Delivered</option>
                                <option value="PENDING">Pending</option>
                                <option value="CANCELLED">Cancelled</option>
                            </select>
                        </div>
                        <input type="date" className="w-full text-xs border border-gray-200 rounded-lg px-2 py-2 text-gray-700"
                            value={specificDate} onChange={e => { setSpecificDate(e.target.value); setMonth(''); }} />
                        <p className="text-[10px] text-gray-400 text-center">{history.length} record{history.length !== 1 ? 's' : ''} found</p>
                    </div>

                    {loadingH ? (
                        <div className="flex justify-center py-8"><div className="w-7 h-7 border-[3px] border-brand-500 border-t-transparent rounded-full animate-spin" /></div>
                    ) : history.length === 0 ? (
                        <div className="text-center py-10 text-gray-400"><div className="text-4xl mb-2">🕒</div><p>No records found</p></div>
                    ) : history.map(o => (
                        <div key={o.id} className="card flex items-center justify-between gap-3">
                            <div className="flex-1 min-w-0" onClick={() => navigate(`/orders/${o.id}`)}>
                                <div className="flex items-center gap-2 mb-0.5">
                                    <p className="font-semibold text-gray-800 text-sm truncate">{o.retailer_name}</p>
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0 ${STATUS_COLOR[o.status] || 'bg-gray-100 text-gray-600'}`}>
                                        {STATUS_LABEL[o.status] || o.status}
                                    </span>
                                </div>
                                <p className="text-xs text-gray-400 font-mono">{o.bill_number || o.order_number} • {String(o.order_date).split('T')[0]}</p>
                                <p className="text-xs text-gray-500">{o.salesperson_name} • {o.area_name}</p>
                                <p className="text-sm font-bold text-brand-700 mt-1">₹{parseFloat(o.total_amount).toLocaleString('en-IN')}</p>
                            </div>
                            {['BILLED', 'READY_TO_SHIP', 'DELIVERED'].includes(o.status) && (
                                <button onClick={() => handlePrintHistory(o)}
                                    className="shrink-0 flex flex-col items-center gap-1 px-3 py-2.5 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold rounded-xl hover:bg-blue-100 transition-colors">
                                    <span className="text-lg">🖨️</span>
                                    <span>Print</span>
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Cancel Modal */}
            {showCancelFor && (
                <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-sm p-5 pb-8 sm:pb-5">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-lg font-bold text-gray-800">Request Cancellation</h3>
                                <p className="text-xs text-gray-500 mt-1">Will be sent to Admin for approval</p>
                            </div>
                            <button onClick={() => { setShowCancelFor(null); setCancelReason(''); }} className="p-1 rounded-full hover:bg-gray-100">✕</button>
                        </div>
                        <textarea className="input w-full min-h-[100px] resize-none mb-4"
                            placeholder="Reason for cancellation..."
                            value={cancelReason} onChange={e => setCancelReason(e.target.value)} />
                        <button onClick={() => handleCancelRequest(showCancelFor)} disabled={submitting || !cancelReason.trim()}
                            className="w-full py-3 bg-red-600 text-white font-semibold rounded-xl disabled:opacity-50">
                            {submitting ? 'Submitting...' : 'Submit Cancel Request'}
                        </button>
                    </div>
                </div>
            )}


            {/* Hidden invoice for print */}
            {lastBilledOrder && <InvoiceTemplate order={lastBilledOrder} items={orderItems} totalPaid={0} />}
            {printOrder && <InvoiceTemplate order={printOrder} items={printItems} totalPaid={0} />}
        </div>
    );
}
