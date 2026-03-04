import { useState, useEffect } from 'react';
import api from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function SalespersonTracking() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [salespersons, setSalespersons] = useState([]);
    const [selectedUser, setSelectedUser] = useState('');
    const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
    const [locations, setLocations] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        // Fetch users to populate the dropdown
        api.get('/users').then(res => {
            // Filter for trackable users
            const trackers = res.data.filter(u =>
                ['salesperson', 'sales_officer'].includes(u.role)
            );
            setSalespersons(trackers);
            if (trackers.length > 0) setSelectedUser(trackers[0].id);
        }).catch(err => console.error(err));
    }, []);

    useEffect(() => {
        if (!selectedUser) return;
        setLoading(true);
        setError('');
        api.get(`/locations/history/${selectedUser}`, { params: { date } })
            .then(res => setLocations(res.data))
            .catch(err => setError('Failed to fetch location history.'))
            .finally(() => setLoading(false));
    }, [selectedUser, date]);

    const handleBack = () => navigate(-1);

    return (
        <div className="pb-24">
            <div className="page-header border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button onClick={handleBack} className="w-8 h-8 flex items-center justify-center bg-white border border-gray-200 rounded-full shadow-sm">
                        <span className="text-gray-600 block leading-none relative -top-[1px]">←</span>
                    </button>
                    <h1 className="text-lg font-semibold text-gray-800">GPS Tracking</h1>
                </div>
            </div>

            <div className="p-4 space-y-4">
                {error && <p className="text-red-500 text-sm">{error}</p>}

                <div className="card space-y-3">
                    <div>
                        <label className="label">Select Salesperson</label>
                        <select className="input" value={selectedUser} onChange={e => setSelectedUser(e.target.value)}>
                            <option value="">-- Select Person --</option>
                            {salespersons.map(s => (
                                <option key={s.id} value={s.id}>{s.name} ({s.role.replace('_', ' ')})</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="label">Select Date</label>
                        <input className="input" type="date" value={date} onChange={e => setDate(e.target.value)} max={new Date().toISOString().slice(0, 10)} />
                    </div>
                </div>

                <div className="card space-y-2">
                    <h2 className="font-semibold text-gray-700 flex justify-between">
                        <span>Location Path</span>
                        <span className="text-xs font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{locations.length} pings</span>
                    </h2>

                    {loading ? (
                        <div className="flex justify-center py-6">
                            <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : locations.length === 0 ? (
                        <p className="text-gray-400 text-sm text-center py-4">No location data found for this date.</p>
                    ) : (
                        <div className="relative border-l-2 border-brand-200 ml-3 space-y-4 py-2">
                            {locations.map((loc, idx) => {
                                const time = new Date(loc.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                return (
                                    <div key={idx} className="relative pl-5">
                                        <div className="absolute w-3 h-3 bg-brand-500 rounded-full -left-[7px] top-1 border-2 border-white shadow-sm" />
                                        <div className="text-sm font-medium text-gray-800">{time}</div>
                                        <a
                                            href={`https://maps.google.com/?q=${loc.latitude},${loc.longitude}`}
                                            target="_blank" rel="noreferrer"
                                            className="text-xs text-blue-600 underline font-medium inline-block mt-0.5"
                                        >
                                            View on Google Maps 📍
                                        </a>
                                        <p className="text-[10px] text-gray-400 mt-0.5 font-mono">
                                            {Number(loc.latitude).toFixed(5)}, {Number(loc.longitude).toFixed(5)}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
