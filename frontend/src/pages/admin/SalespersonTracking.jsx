import { useState, useEffect } from 'react';
import api from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Polyline, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icon in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export default function SalespersonTracking() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [salespersons, setSalespersons] = useState([]);
    const [selectedUser, setSelectedUser] = useState('');
    const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
    const [locations, setLocations] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [liveStatus, setLiveStatus] = useState({});

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

        // Fetch live status
        api.get('/locations/live').then(res => {
            const statusMap = {};
            res.data.forEach(item => {
                statusMap[item.salesperson_id] = item.last_ping_at;
            });
            setLiveStatus(statusMap);
        }).catch(err => console.error('Failed to fetch live status', err));
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
                            {salespersons.map(s => {
                                const lastPing = liveStatus[s.id];
                                const isLive = lastPing && (new Date() - new Date(lastPing)) < 30 * 60 * 1000;
                                return (
                                    <option key={s.id} value={s.id}>
                                        {isLive ? '🟢 ' : ''}{s.name} ({s.role.replace('_', ' ')})
                                    </option>
                                );
                            })}
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
                        <div className="space-y-4">
                            {/* Map View */}
                            <div className="h-64 w-full rounded-xl overflow-hidden border border-gray-200 shadow-inner z-0 relative">
                                <MapContainer
                                    center={[locations[0].latitude, locations[0].longitude]}
                                    zoom={14}
                                    style={{ height: '100%', width: '100%', zIndex: 0 }}
                                >
                                    <TileLayer
                                        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                                    />
                                    <Polyline
                                        positions={locations.map(loc => [loc.latitude, loc.longitude])}
                                        color="#0ea5e9" weight={4} opacity={0.7} dashArray="8, 8"
                                    />
                                    {locations.map((loc, idx) => {
                                        const time = new Date(loc.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                        const isStart = idx === 0;
                                        const isEnd = idx === locations.length - 1;
                                        return (
                                            <Marker key={idx} position={[loc.latitude, loc.longitude]}>
                                                <Popup>
                                                    <div className="text-sm font-semibold">{time}</div>
                                                    <div className="text-xs text-gray-500">{isStart ? 'Start Point' : isEnd ? 'Current Point' : 'Ping'}</div>
                                                </Popup>
                                            </Marker>
                                        );
                                    })}
                                </MapContainer>
                            </div>

                            {/* Timeline View */}
                            <div className="relative border-l-2 border-brand-200 ml-3 space-y-4 py-2 mt-4">
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
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
