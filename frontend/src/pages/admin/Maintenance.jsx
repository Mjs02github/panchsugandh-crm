import { useState } from 'react';
import api from '../../api';
import { ShieldAlert, Trash2, CheckCircle, AlertCircle } from 'lucide-react';

export default function Maintenance() {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [confirmText, setConfirmText] = useState('');
    const [error, setError] = useState('');

    const handleReset = async (e) => {
        e.preventDefault();
        if (confirmText !== 'RESET') {
            setError('Please type RESET to confirm.');
            return;
        }

        if (!window.confirm('CRITICAL WARNING: This will permanently delete all business data (Orders, Retailers, Stock, Payments, etc). Only USERS and ROLES will be preserved. Are you absolutely sure?')) {
            return;
        }

        setLoading(true);
        setError('');
        setResult(null);

        try {
            const { data } = await api.post('/api/maintenance/reset-all-data');
            setResult(data);
            setConfirmText('');
        } catch (err) {
            setError(err.response?.data?.error || 'System reset failed.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto py-8 px-4">
            <header className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <ShieldAlert className="text-red-600" />
                    System Maintenance
                </h1>
                <p className="text-gray-500">Critical administrative tasks and database management.</p>
            </header>

            <div className="space-y-6">
                {/* Reset Section */}
                <section className="bg-white border-2 border-red-100 rounded-3xl p-6 shadow-sm">
                    <div className="flex items-start gap-4 mb-6">
                        <div className="p-3 bg-red-50 text-red-600 rounded-2xl">
                            <Trash2 size={24} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">Reset All Business Data</h2>
                            <p className="text-sm text-gray-500 leading-relaxed">
                                This will clear all transactions, orders, inventory records, and retailer lists. 
                                <span className="font-bold text-red-600"> This action is irreversible.</span>
                                👷 Master data (User accounts and Roles) will be preserved.
                            </p>
                        </div>
                    </div>

                    {result ? (
                        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-start gap-3">
                            <CheckCircle className="text-green-600 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-green-800 font-bold text-sm">System Reset Successful</p>
                                <p className="text-green-700 text-xs mt-1">
                                    {result.summary.clearedCount} tables cleared. {result.summary.totalTables} total tables verified.
                                </p>
                                <button 
                                    onClick={() => setResult(null)}
                                    className="mt-3 text-xs font-bold text-green-700 underline"
                                >
                                    Dismiss
                                </button>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleReset} className="space-y-4">
                            {error && (
                                <div className="bg-red-50 text-red-700 p-3 rounded-xl text-xs font-medium flex items-center gap-2 border border-red-100">
                                    <AlertCircle size={14} />
                                    {error}
                                </div>
                            )}

                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 ml-1">
                                    Type "RESET" to confirm
                                </label>
                                <input
                                    type="text"
                                    value={confirmText}
                                    onChange={(e) => setConfirmText(e.target.value)}
                                    placeholder="Type RESET here"
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-red-500 outline-none transition-all font-mono"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className={`w-full py-4 rounded-2xl font-black text-sm tracking-wider uppercase transition-all shadow-lg ${
                                    loading 
                                    ? 'bg-gray-100 text-gray-400' 
                                    : 'bg-red-600 text-white hover:bg-red-700 shadow-red-100'
                                }`}
                            >
                                {loading ? 'Processing Reset...' : '💣 Initiate Full System Reset'}
                            </button>
                        </form>
                    )}
                </section>

                <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100">
                    <p className="text-[11px] text-amber-800 font-medium leading-relaxed">
                        💡 **Note**: After reset, the system will be exactly as it was during the initial setup. 
                        You will need to re-create retailers, products, and re-stock inventory. 
                        Users will still be able to log in with their existing credentials.
                    </p>
                </div>
            </div>
        </div>
    );
}
