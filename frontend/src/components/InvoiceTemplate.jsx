import React from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// COMPANY CONFIG — Edit these values to update company details on invoice
// ─────────────────────────────────────────────────────────────────────────────
const COMPANY = {
    name: 'SJD Developer',
    tagline: 'Panchsugandh',
    address: '41 HIG Vikash Colony Jhunsi Prayagraj, Uttar Pradesh - 211019',
    phone: '+91 915065552',
    email: 'info@sjddeveloper.com',
    gstin: '09AIBPT6458J2ZM',
    logoUrl: 'assets/images/logo.jpeg', // Logo path
};

// ─────────────────────────────────────────────────────────────────────────────
// PAYMENT DETAILS CONFIG — Displayed at the bottom of the invoice
// ─────────────────────────────────────────────────────────────────────────────
const PAYMENT_DETAILS = {
    show: true,
    bankName: 'Bank of Baroda',
    accountName: 'SJD Developers',
    accountNumber: '06590200000593',
    ifscCode: 'BARB0MULALL',
    upiId: 'sjdcss-1@okaxis',
    qrCodeUrl: 'assets/images/QR.jpg', // Add a QR code image URL here (e.g., '/images/qr.png' or base64)
};

// ─────────────────────────────────────────────────────────────────────────────
// INVOICE CONFIG — Toggle features on/off easily
// ─────────────────────────────────────────────────────────────────────────────
const INVOICE_CONFIG = {
    showMRP: true,             // Show MRP column in product table
    showHSN: true,             // Show HSN code column
    showGST: true,             // Show GST breakdown in totals
    showDiscount: true,        // Show discount row if applicable
    showBalanceDue: true,      // Show balance due after payments
    showSignatures: true,      // Show signature lines at bottom
    showTerms: true,           // Show terms & conditions
    terms: [
        'Goods once sold will not be taken back.',
        'Payment due within 15 days of invoice date.',
        'Subject to Prayagraj jurisdiction.',
    ],
    thankYouMessage: 'Thank you for your business! We appreciate your trust.',
};

// ─────────────────────────────────────────────────────────────────────────────
// Helper formatters
// ─────────────────────────────────────────────────────────────────────────────
const fmt = (n) => parseFloat(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = (d) => d ? new Date(d.split('T')[0]).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components (for easy future restructuring)
// ─────────────────────────────────────────────────────────────────────────────

function InvoiceHeader({ order }) {
    const isBilled = ['BILLED', 'READY_TO_SHIP', 'DELIVERED'].includes(order.status);
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2.5px solid #1a1a1a', paddingBottom: '8px', marginBottom: '10px' }}>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                {COMPANY.logoUrl && (
                    <img src={COMPANY.logoUrl} alt="Logo" style={{ maxHeight: '65px', maxWidth: '65px', objectFit: 'contain' }} onError={(e) => e.target.style.display = 'none'} />
                )}
                <div>
                    <div style={{ fontSize: '24px', fontWeight: '900', letterSpacing: '1.5px', color: '#1a1a1a' }}>{COMPANY.name}</div>
                    <div style={{ fontSize: '10px', color: '#666', marginTop: '2px' }}>{COMPANY.tagline}</div>
                    <div style={{ fontSize: '10px', color: '#444', marginTop: '5px', lineHeight: '1.5' }}>
                        <div>{COMPANY.address}</div>
                        <div>📞 {COMPANY.phone}  ✉ {COMPANY.email}</div>
                        <div><strong>GSTIN:</strong> {COMPANY.gstin}</div>
                    </div>
                </div>
            </div>
            <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '26px', fontWeight: '300', color: '#ccc', letterSpacing: '3px', textTransform: 'uppercase' }}>
                    {isBilled ? 'TAX INVOICE' : 'ESTIMATE'}
                </div>
                <div style={{ marginTop: '6px', fontSize: '11px', lineHeight: '1.7' }}>
                    <div><span style={{ color: '#888' }}>Invoice No:</span> <strong>{order.bill_number || `EST-${order.order_number}`}</strong></div>
                    <div><span style={{ color: '#888' }}>Order No:</span> {order.order_number}</div>
                    <div><span style={{ color: '#888' }}>Date:</span> {fmtDate(order.bill_date || order.order_date)}</div>
                    {order.status && <div><span style={{ color: '#888' }}>Status:</span> <span style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>{order.status}</span></div>}
                </div>
            </div>
        </div>
    );
}

function PartySection({ order }) {
    return (
        <div style={{ display: 'flex', gap: '20px', marginBottom: '12px' }}>
            {/* Billed To */}
            <div style={{ flex: 1, padding: '10px 12px', background: '#f8f8f8', borderRadius: '6px', borderLeft: '4px solid #1a1a1a' }}>
                <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#888', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '1px' }}>Billed To</div>
                <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#1a1a1a' }}>{order.retailer_name}</div>
                {order.retailer_address && (
                    <div style={{ fontSize: '11px', color: '#555', marginTop: '3px', whiteSpace: 'pre-wrap', lineHeight: '1.4' }}>
                        {order.retailer_address}
                    </div>
                )}
                {order.area_name && <div style={{ fontSize: '11px', color: '#555', marginTop: '2px' }}>Area: {order.area_name}</div>}
                {order.retailer_phone && <div style={{ fontSize: '11px', color: '#555', marginTop: '4px' }}>📞 {order.retailer_phone}</div>}
                {order.gst_number && <div style={{ fontSize: '11px', color: '#555', marginTop: '3px' }}>GSTIN: <strong>{order.gst_number}</strong></div>}
            </div>
            {/* Order Meta */}
            <div style={{ width: '165px', padding: '10px 12px', background: '#f8f8f8', borderRadius: '6px' }}>
                <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#888', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '1px' }}>Sales Info</div>
                {order.salesperson_name && <div style={{ fontSize: '11px', color: '#555' }}>Salesman: <strong>{order.salesperson_name}</strong></div>}
                {order.order_date && <div style={{ fontSize: '11px', color: '#555', marginTop: '2px' }}>Date: {fmtDate(order.order_date)}</div>}
                {order.billed_by_name && <div style={{ fontSize: '11px', color: '#555', marginTop: '2px' }}>Billed By: {order.billed_by_name}</div>}
            </div>
        </div>
    );
}

function ItemsTable({ items }) {
    const visibleItems = (items || []).filter(item => {
        const qty = item.qty_billed != null ? item.qty_billed : item.qty_ordered;
        return qty > 0;
    });

    const thStyle = { padding: '5px 6px', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '2px solid #1a1a1a', background: '#1a1a1a', color: '#fff' };
    const tdStyle = { padding: '5px 6px', fontSize: '11px', borderBottom: '1px solid #e0e0e0', verticalAlign: 'middle' };

    return (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '10px' }}>
            <thead>
                <tr>
                    <th style={{ ...thStyle, textAlign: 'center', width: '36px' }}>#</th>
                    <th style={{ ...thStyle }}>Product Name</th>
                    {INVOICE_CONFIG.showHSN && <th style={{ ...thStyle, textAlign: 'center', width: '70px' }}>HSN</th>}
                    <th style={{ ...thStyle, textAlign: 'center', width: '50px' }}>Unit</th>
                    <th style={{ ...thStyle, textAlign: 'right', width: '60px' }}>Qty</th>
                    {INVOICE_CONFIG.showMRP && <th style={{ ...thStyle, textAlign: 'right', width: '80px' }}>MRP (₹)</th>}
                    <th style={{ ...thStyle, textAlign: 'right', width: '60px' }}>Disc%</th>
                    <th style={{ ...thStyle, textAlign: 'right', width: '55px' }}>GST%</th>
                    <th style={{ ...thStyle, textAlign: 'right', width: '80px' }}>Rate (₹)</th>
                    <th style={{ ...thStyle, textAlign: 'right', width: '90px' }}>Amount (₹)</th>
                </tr>
            </thead>
            <tbody>
                {visibleItems.map((item, idx) => {
                    const qty = item.qty_billed != null ? item.qty_billed : item.qty_ordered;
                    const rowBg = idx % 2 === 0 ? '#fff' : '#fafafa';
                    return (
                        <tr key={item.id || idx} style={{ background: rowBg }}>
                            <td style={{ ...tdStyle, textAlign: 'center', color: '#888' }}>{idx + 1}</td>
                            <td style={{ ...tdStyle }}>
                                <div style={{ fontWeight: '600', color: '#1a1a1a' }}>{item.product_name}</div>
                                {item.sku && <div style={{ fontSize: '10px', color: '#aaa' }}>SKU: {item.sku}</div>}
                            </td>
                            {INVOICE_CONFIG.showHSN && <td style={{ ...tdStyle, textAlign: 'center', color: '#666', fontSize: '11px' }}>{item.hsn_code || '—'}</td>}
                            <td style={{ ...tdStyle, textAlign: 'center', color: '#666', fontSize: '11px' }}>{item.unit || 'PCS'}</td>
                            <td style={{ ...tdStyle, textAlign: 'right', fontWeight: '600' }}>{qty}</td>
                            {INVOICE_CONFIG.showMRP && (
                                <td style={{ ...tdStyle, textAlign: 'right', color: '#888' }}>
                                    {item.mrp ? `₹${fmt(item.mrp)}` : '—'}
                                </td>
                            )}
                            <td style={{ ...tdStyle, textAlign: 'right', color: '#e53e3e', fontSize: '11px' }}>
                                {item.discount_pct > 0 ? `${parseFloat(item.discount_pct).toFixed(1)}%` : '—'}
                            </td>
                            <td style={{ ...tdStyle, textAlign: 'right', color: '#666', fontSize: '11px' }}>
                                {item.gst_rate > 0 ? `${item.gst_rate}%` : '0%'}
                            </td>
                            <td style={{ ...tdStyle, textAlign: 'right' }}>₹{fmt(item.unit_price)}</td>
                            <td style={{ ...tdStyle, textAlign: 'right', fontWeight: '600' }}>₹{fmt(item.line_amount)}</td>
                        </tr>
                    );
                })}
                {visibleItems.length === 0 && (
                    <tr><td colSpan="8" style={{ textAlign: 'center', padding: '20px', color: '#aaa', fontSize: '12px' }}>No items</td></tr>
                )}
            </tbody>
        </table>
    );
}

function TotalsBlock({ order, totalPaid }) {
    const subtotal = parseFloat(order.subtotal || order.total_amount || 0);
    const discount = parseFloat(order.discount || 0);
    const gstAmount = parseFloat(order.gst_amount || 0);
    const grandTotal = parseFloat(order.total_amount || 0);
    const balanceDue = Math.max(0, grandTotal - (totalPaid || 0));

    const rowStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '3px 0', fontSize: '12px' };
    const labelStyle = { color: '#555' };
    const valStyle = { fontWeight: '500' };

    return (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
            <div style={{ width: '210px', padding: '8px 10px', border: '1px solid #ddd', borderRadius: '7px', background: '#fafafa' }}>
                {INVOICE_CONFIG.showDiscount && discount > 0 && (
                    <div style={rowStyle}>
                        <span style={labelStyle}>Subtotal:</span>
                        <span style={valStyle}>₹{fmt(subtotal)}</span>
                    </div>
                )}
                {INVOICE_CONFIG.showDiscount && discount > 0 && (
                    <div style={rowStyle}>
                        <span style={labelStyle}>Discount:</span>
                        <span style={{ ...valStyle, color: '#e53e3e' }}>- ₹{fmt(discount)}</span>
                    </div>
                )}
                {INVOICE_CONFIG.showGST && gstAmount > 0 && (
                    <div style={rowStyle}>
                        <span style={labelStyle}>GST:</span>
                        <span style={valStyle}>₹{fmt(gstAmount)}</span>
                    </div>
                )}
                {/* Grand Total */}
                <div style={{ borderTop: '2px solid #1a1a1a', marginTop: '6px', paddingTop: '7px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', fontWeight: 'bold' }}>TOTAL AMOUNT:</span>
                    <span style={{ fontSize: '16px', fontWeight: '900', color: '#1a1a1a' }}>₹{fmt(grandTotal)}</span>
                </div>
                {INVOICE_CONFIG.showBalanceDue && totalPaid > 0 && (
                    <>
                        <div style={{ ...rowStyle, marginTop: '8px', borderTop: '1px solid #ddd', paddingTop: '8px' }}>
                            <span style={labelStyle}>Amount Paid:</span>
                            <span style={{ ...valStyle, color: '#38a169' }}>₹{fmt(totalPaid)}</span>
                        </div>
                        <div style={{ ...rowStyle, fontWeight: 'bold' }}>
                            <span>Balance Due:</span>
                            <span style={{ color: balanceDue > 0 ? '#e53e3e' : '#38a169' }}>₹{fmt(balanceDue)}</span>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

function PaymentDetailsBlock() {
    if (!PAYMENT_DETAILS.show) return null;
    return (
        <div style={{ padding: '8px 12px', background: '#f8f8f8', borderRadius: '6px', borderTop: '2px solid #e0e0e0', marginBottom: '10px', display: 'flex', gap: '20px', alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
                <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#888', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Payment Details</div>
                <div style={{ fontSize: '11px', color: '#444', lineHeight: '1.6' }}>
                    <div><strong>Bank:</strong> {PAYMENT_DETAILS.bankName}</div>
                    <div><strong>A/c Name:</strong> {PAYMENT_DETAILS.accountName} &nbsp;&nbsp; <strong>A/c No:</strong> {PAYMENT_DETAILS.accountNumber}</div>
                    <div><strong>IFSC:</strong> {PAYMENT_DETAILS.ifscCode} &nbsp;&nbsp; <strong>UPI:</strong> {PAYMENT_DETAILS.upiId}</div>
                </div>
            </div>
            {PAYMENT_DETAILS.qrCodeUrl && (
                <div style={{ width: '65px', height: '65px', flexShrink: 0 }}>
                    <img src={PAYMENT_DETAILS.qrCodeUrl} alt="QR Code" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>
            )}
        </div>
    );
}

function SignatureBlock() {
    if (!INVOICE_CONFIG.showSignatures) return null;
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', paddingTop: '8px' }}>
            <div style={{ textAlign: 'center', width: '150px' }}>
                <div style={{ borderTop: '1px solid #888', paddingTop: '6px', fontSize: '11px' }}>Customer Signature</div>
            </div>
            <div style={{ textAlign: 'center', width: '150px' }}>
                <div style={{ borderTop: '1px solid #888', paddingTop: '6px', fontSize: '11px' }}>
                    <div>Authorised Signatory</div>
                    <div style={{ fontSize: '9px', color: '#888' }}>For {COMPANY.name}</div>
                </div>
            </div>
        </div>
    );
}

function TermsBlock() {
    if (!INVOICE_CONFIG.showTerms || !INVOICE_CONFIG.terms.length) return null;
    return (
        <div style={{ marginTop: '8px', padding: '7px 10px', background: '#f8f8f8', borderRadius: '6px', borderTop: '1px solid #e0e0e0' }}>
            <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#888', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Terms & Conditions</div>
            {INVOICE_CONFIG.terms.map((t, i) => (
                <div key={i} style={{ fontSize: '10px', color: '#666', marginBottom: '2px' }}>{i + 1}. {t}</div>
            ))}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main exported component — assembles all sections
// ─────────────────────────────────────────────────────────────────────────────
export default function InvoiceTemplate({ order, items, totalPaid }) {
    if (!order) return null;
    return (
        <div className="invoice-print-container hidden print:block" style={{ width: '210mm', margin: '0 auto', background: '#fff', color: '#1a1a1a', fontFamily: 'Arial, sans-serif', padding: '10mm 12mm', boxSizing: 'border-box' }}>
            <InvoiceHeader order={order} />
            <PartySection order={order} />
            <ItemsTable items={items} />
            <TotalsBlock order={order} totalPaid={totalPaid} />
            <PaymentDetailsBlock />
            {INVOICE_CONFIG.showSignatures && <SignatureBlock />}
            <TermsBlock />
            <div style={{ textAlign: 'center', marginTop: '8px', fontSize: '10px', color: '#aaa', borderTop: '1px solid #eee', paddingTop: '6px' }}>
                {INVOICE_CONFIG.thankYouMessage}
            </div>
        </div>
    );
}
