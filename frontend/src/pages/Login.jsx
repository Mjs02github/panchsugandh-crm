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
            setError(err.response?.data?.error || 'Login failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-brand-600 to-brand-800 flex flex-col justify-center px-6 py-12">
            {/* Logo area */}
            <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-xl mb-4">
                    <span className="text-3xl">🪔</span>
                </div>
                <h1 className="text-2xl font-bold text-white">Panchsugandh CRM</h1>
                <p className="text-brand-200 text-sm mt-1">Field Operations Platform</p>
            </div>

            {/* Card */}
            <div className="bg-white rounded-3xl shadow-2xl p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-6">Welcome back</h2>

                {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="label">Email Address</label>
                        <input
                            type="email"
                            className="input"
                            placeholder="you@example.com"
                            value={form.email}
                            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                            required
                        />
                    </div>
                    <div>
                        <label className="label">Password</label>
                        <input
                            type="password"
                            className="input"
                            placeholder="••••••••"
                            value={form.password}
                            onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                            required
                        />
                    </div>
                    <button type="submit" className="btn-primary mt-2" disabled={loading}>
                        {loading ? (
                            <span className="flex items-center justify-center gap-2">
                                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                </svg>
                                Signing in...
                            </span>
                        ) : 'Sign In'}
                    </button>
                </form>
            </div>

            <p className="text-center text-brand-200 text-xs mt-6">
                Contact your admin if you've forgotten your credentials.
            </p>
        </div>
    );
}
