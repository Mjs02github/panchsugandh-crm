import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import InvoiceTemplate from '../components/InvoiceTemplate';

/**
 * A dedicated print page that renders ONLY the invoice.
 * Expects a ?data=... query parameter which is a base64 encoded and URI encoded JSON string.
 */
export default function PrintInvoice() {
    const [searchParams] = useSearchParams();
    const [invoiceData, setInvoiceData] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        try {
            const dataParam = searchParams.get('data');
            if (!dataParam) {
                setError('No invoice data provided.');
                return;
            }

            // Decode base64
            const decoded = atob(decodeURIComponent(dataParam));
            const parsed = JSON.parse(decoded);
            setInvoiceData(parsed);

            // Trigger print automatically once data is loaded
            setTimeout(() => {
                window.print();
            }, 500);
        } catch (err) {
            console.error('Failed to parse invoice data:', err);
            setError('Invalid invoice data.');
        }
    }, [searchParams]);

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
                <p className="text-4xl mb-4">🚫</p>
                <h1 className="text-xl font-bold text-gray-800 mb-2">Print Error</h1>
                <p className="text-gray-500">{error}</p>
                <button
                    onClick={() => window.close()}
                    className="mt-6 px-4 py-2 bg-gray-800 text-white rounded-lg"
                >
                    Close Window
                </button>
            </div>
        );
    }

    if (!invoiceData) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="print-only-layout min-h-screen bg-white">
            {/* 
                We use the same InvoiceTemplate.
                It has hidden print:block, but here we want it visible since it's the ONLY thing on page.
                We'll override its default hidden class for this page.
            */}
            <style dangerouslySetInnerHTML={{
                __html: `
                @media screen {
                    .invoice-print-container { display: block !important; }
                }
                @media print {
                    @page { margin: 0; }
                    body { margin: 0; }
                    .invoice-print-container { margin: 0 !important; width: 100% !important; padding: 10mm !important; }
                }
            `}} />

            <InvoiceTemplate
                order={invoiceData.order}
                items={invoiceData.items}
                totalPaid={invoiceData.totalPaid}
            />

            {/* Hint for screen view */}
            <div className="print:hidden fixed bottom-6 right-6 flex gap-3">
                <button
                    onClick={() => window.print()}
                    className="px-6 py-3 bg-brand-600 text-white font-bold rounded-xl shadow-lg hover:bg-brand-700 transition-colors"
                >
                    🖨️ Try Print Again
                </button>
                <button
                    onClick={() => window.close()}
                    className="px-6 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl shadow-lg hover:bg-gray-200 transition-colors"
                >
                    ✕ Close
                </button>
            </div>
        </div>
    );
}
