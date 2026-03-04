import React from 'react';

// This component is mostly hidden until print is triggered
export default function InvoiceTemplate({ order, items, totalPaid }) {
    if (!order) return null;

    const companyName = "Panchsugandh";
    const companyAddress = "Your Company Address here";
    const companyGST = "23AAAAA0000A1Z5"; // Placeholder
    const companyPhone = "+91 9999999999";

    const isBilled = ['BILLED', 'READY_TO_SHIP', 'DELIVERED'].includes(order.status);
    const invoiceNumber = order.bill_number || `EST-${order.order_number}`;
    const invoiceDate = (order.bill_date || order.order_date).split('T')[0];
    const totalAmount = parseFloat(order.total_amount || 0);
    const balanceDue = Math.max(0, totalAmount - (totalPaid || 0));

    return (
        <div className="invoice-print-container bg-white p-8 hidden print:block text-black" style={{ width: '210mm', minHeight: '297mm', margin: '0 auto' }}>
            {/* Header */}
            <div className="flex justify-between items-start border-b-2 border-gray-800 pb-4 mb-6">
                <div>
                    <h1 className="text-3xl font-bold uppercase tracking-wider">{companyName}</h1>
                    <p className="text-sm mt-1">{companyAddress}</p>
                    <p className="text-sm">GSTIN: <span className="font-semibold">{companyGST}</span></p>
                    <p className="text-sm">Phone: {companyPhone}</p>
                </div>
                <div className="text-right">
                    <h2 className="text-4xl font-light text-gray-400 uppercase tracking-widest">{isBilled ? 'TAX INVOICE' : 'ESTIMATE'}</h2>
                    <div className="mt-4">
                        <p className="text-sm"><span className="font-semibold text-gray-600">Invoice No:</span> {invoiceNumber}</p>
                        <p className="text-sm mt-1"><span className="font-semibold text-gray-600">Date:</span> {new Date(invoiceDate).toLocaleDateString('en-IN')}</p>
                    </div>
                </div>
            </div>

            {/* Bill To */}
            <div className="mb-8">
                <h3 className="text-sm font-bold text-gray-800 border-b border-gray-300 pb-1 mb-2">Billed To:</h3>
                <p className="font-bold text-lg">{order.retailer_name}</p>
                <p className="text-sm mt-1 max-w-sm">{order.retailer_address || order.area_name}</p>
                {order.retailer_phone && <p className="text-sm mt-1">Phone: {order.retailer_phone}</p>}
                {order.gst_number && <p className="text-sm mt-1 font-semibold">GSTIN: {order.gst_number}</p>}
            </div>

            {/* Items Table */}
            <table className="w-full text-left border-collapse mb-8">
                <thead>
                    <tr className="border-b-2 border-gray-800">
                        <th className="py-2 font-bold text-sm">S.No</th>
                        <th className="py-2 font-bold text-sm">Item & Description</th>
                        <th className="py-2 font-bold text-sm text-center">HSN</th>
                        <th className="py-2 font-bold text-sm text-right">Qty</th>
                        <th className="py-2 font-bold text-sm text-right">Rate</th>
                        <th className="py-2 font-bold text-sm text-right">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    {items && items.map((item, index) => {
                        const qty = item.qty_billed !== null ? item.qty_billed : item.qty_ordered;
                        if (qty === 0) return null; // skip items removed during billing

                        return (
                            <tr key={item.id || index} className="border-b border-gray-200">
                                <td className="py-2 text-sm text-gray-600">{index + 1}</td>
                                <td className="py-2">
                                    <p className="font-medium text-sm">{item.product_name}</p>
                                </td>
                                <td className="py-2 text-sm text-center text-gray-600">{item.hsn_code || '-'}</td>
                                <td className="py-2 text-sm text-right">{qty} {item.unit || 'PCS'}</td>
                                <td className="py-2 text-sm text-right">₹{parseFloat(item.unit_price).toLocaleString('en-IN')}</td>
                                <td className="py-2 text-sm text-right">₹{parseFloat(item.line_amount).toLocaleString('en-IN')}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>

            {/* Footer / Totals */}
            <div className="flex justify-end border-t-2 border-gray-800 pt-4">
                <div className="w-64 space-y-2">
                    <div className="flex justify-between text-sm">
                        <span className="font-semibold text-gray-600">Subtotal:</span>
                        <span>₹{parseFloat(order.subtotal || totalAmount).toLocaleString('en-IN')}</span>
                    </div>
                    {parseFloat(order.discount) > 0 && (
                        <div className="flex justify-between text-sm">
                            <span className="font-semibold text-gray-600">Discount:</span>
                            <span>- ₹{parseFloat(order.discount).toLocaleString('en-IN')}</span>
                        </div>
                    )}
                    {parseFloat(order.gst_amount) > 0 && (
                        <div className="flex justify-between text-sm">
                            <span className="font-semibold text-gray-600">Total GST:</span>
                            <span>₹{parseFloat(order.gst_amount).toLocaleString('en-IN')}</span>
                        </div>
                    )}
                    <div className="flex justify-between text-lg font-bold border-t border-gray-300 pt-2 mt-2">
                        <span>Grand Total:</span>
                        <span>₹{totalAmount.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-600 border-t border-gray-300 pt-2 mt-2">
                        <span>Amount Paid:</span>
                        <span>₹{parseFloat(totalPaid || 0).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold text-gray-800 pt-1 mt-1">
                        <span>Balance Due:</span>
                        <span>₹{balanceDue.toLocaleString('en-IN')}</span>
                    </div>
                </div>
            </div>

            {/* Signatures */}
            <div className="mt-24 flex justify-between">
                <div className="text-center w-48">
                    <div className="border-t border-gray-400 mt-8 pt-2">
                        <p className="text-sm font-medium">Customer Signature</p>
                    </div>
                </div>
                <div className="text-center w-48">
                    <div className="border-t border-gray-400 mt-8 pt-2">
                        <p className="text-sm font-medium">Authorised Signatory</p>
                        <p className="text-xs text-gray-500">For {companyName}</p>
                    </div>
                </div>
            </div>

            <div className="mt-12 text-center text-xs text-gray-400 pb-8">
                Thank you for your business!
            </div>
        </div>
    );
}
