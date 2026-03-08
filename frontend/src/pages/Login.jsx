import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [form, setForm] = useState({ email: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const ROLE_HOME = {
        super_admin: '/dashboard',
        admin: '/dashboard',
        sales_officer: '/dashboard',
        salesperson: '/orders',
        bill_operator: '/billing',
        delivery_incharge: '/delivery',
        store_incharge: '/store',
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const user = await login(form.email, form.password);
            navigate(ROLE_HOME[user.role] || '/dashboard', { replace: true });
        } catch (err) {
            // SHOW ERROR ON PHONE SCREEN TO DIAGNOSE CORS/NETWORK
            alert(`Error: ${err.message}\nURL: ${import.meta.env.VITE_API_URL}`);

            setError(err.response?.data?.error || 'Login failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-between font-sans">

            {/* --- CUSTOM HEADER --- */}
            <div className="bg-white shadow-md rounded-b-3xl px-6 py-5 flex items-center gap-4 z-10">
                {/* Company logo */}
                <img src="assets/images/logo.jpeg" alt="Panchsugandh Logo" className="w-16 h-16 rounded-xl object-cover shrink-0 shadow-sm" />
                <div className="flex flex-col">
                    <h1 className="text-2xl font-black text-gray-900 tracking-tight">Sjd Developer</h1>
                    <h2 className="text-lg font-bold text-red-600">Panchsugandh</h2>
                </div>
            </div>

            {/* --- LOGIN FORM --- */}
            <div className="flex-1 flex flex-col justify-center px-6 py-8">
                <div className="bg-white rounded-3xl shadow-xl p-7 border border-gray-100">
                    <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                        <span>👋</span> Welcome back
                    </h2>

                    {error && (
                        <div className="mb-5 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl font-medium">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email Address</label>
                            <input
                                type="email"
                                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all bg-gray-50 focus:bg-white"
                                placeholder="you@example.com"
                                value={form.email}
                                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password</label>
                            <input
                                type="password"
                                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all bg-gray-50 focus:bg-white"
                                placeholder="••••••••"
                                value={form.password}
                                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                                required
                            />
                        </div>
                        <button type="submit" className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-brand-500/30 transition-all mt-2" disabled={loading}>
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                    </svg>
                                    Signing in...
                                </span>
                            ) : 'Secure Login'}
                        </button>
                    </form>
                </div>
            </div>

            {/* --- CUSTOM FOOTER PRODUCT SPACES --- */}
            <div className="bg-white rounded-t-3xl shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] pt-6 pb-8 px-6 mt-auto">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 text-center">Featured Products</h3>
                <div className="flex justify-between items-center gap-3">
                    {/* Product 1 */}
                    <div className="flex-1 aspect-[4/5] bg-gray-50 rounded-2xl flex flex-col items-center justify-center border-2 border-dashed border-gray-200">
                        <span className="text-2xl mb-2 opacity-50">🖼️</span>
                        <span className="text-[10px] font-bold text-gray-400 uppercase">Product 1</span>
                    </div>
                    {/* Product 2 */}
                    <div className="flex-1 aspect-[4/5] bg-gray-50 rounded-2xl flex flex-col items-center justify-center border-2 border-dashed border-gray-200">
                        <span className="text-2xl mb-2 opacity-50">🖼️</span>
                        <span className="text-[10px] font-bold text-gray-400 uppercase">Product 2</span>
                    </div>
                    {/* Product 3 */}
                    <div className="flex-1 aspect-[4/5] bg-gray-50 rounded-2xl flex flex-col items-center justify-center border-2 border-dashed border-gray-200">
                        <span className="text-2xl mb-2 opacity-50">🖼️</span>
                        <span className="text-[10px] font-bold text-gray-400 uppercase">Product 3</span>
                    </div>
                </div>
            </div>

        </div>
    );
}
