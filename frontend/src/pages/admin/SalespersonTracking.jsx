import { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { GoogleMap, useJsApiLoader, Marker, Polyline, InfoWindow } from '@react-google-maps/api';

const containerStyle = { width: '100%', height: '100%' };
const LIBRARIES = ['places'];

export default function SalespersonTracking() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [salespersons, setSalespersons] = useState([]);
    const [selectedUser, setSelectedUser] = useState('');
    const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
    const [locations, setLocations] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [liveLocations, setLiveLocations] = useState([]);
    const [mapMode, setMapMode] = useState('roadmap'); // roadmap or satellite
    const [isLiveView, setIsLiveView] = useState(true);
    const [activeMarker, setActiveMarker] = useState(null);

    const { isLoaded } = useJsApiLoader({
        googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
        libraries: LIBRARIES
    });

    useEffect(() => {
        // Fetch users
        api.get('/users').then(res => {
            const trackers = res.data.filter(u => ['salesperson', 'sales_officer'].includes(u.role));
            setSalespersons(trackers);
        }).catch(err => console.error(err));

        // Fetch live locations
        const fetchLive = () => {
            api.get('/locations/live').then(res => setLiveLocations(res.data))
                .catch(err => console.error('Live fetch failed', err));
        };
        fetchLive();
        const interval = setInterval(fetchLive, 30000); // Poll every 30s
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (!selectedUser || isLiveView) return;
        setLoading(true);
        setError('');
        api.get(`/locations/history/${selectedUser}`, { params: { date } })
            .then(res => setLocations(res.data))
            .catch(err => setError('Failed to fetch location history.'))
            .finally(() => setLoading(false));
    }, [selectedUser, date, isLiveView]);

    const handleBack = () => navigate(-1);

    const mapCenter = useMemo(() => {
        if (activeMarker) {
            return { lat: parseFloat(activeMarker.latitude), lng: parseFloat(activeMarker.longitude) };
        }
        if (isLiveView && liveLocations.length > 0) {
            return { lat: parseFloat(liveLocations[0].latitude), lng: parseFloat(liveLocations[0].longitude) };
        }
        if (!isLiveView && locations.length > 0) {
            return { lat: parseFloat(locations[locations.length - 1].latitude), lng: parseFloat(locations[locations.length - 1].longitude) };
        }
        return { lat: 25.4484, lng: 81.8333 }; // Prayagraj default
    }, [activeMarker, isLiveView, liveLocations, locations]);

    if (!isLoaded) return <div className="p-10 text-center">Loading Maps...</div>;

    return (
        <div className="pb-24">
            <div className="page-header border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button onClick={handleBack} className="w-8 h-8 flex items-center justify-center bg-white border border-gray-200 rounded-full shadow-sm">
                        <span className="text-gray-600 block leading-none relative -top-[1px]">←</span>
                    </button>
                    <h1 className="text-lg font-semibold text-gray-800">GPS Tracking</h1>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setIsLiveView(!isLiveView)}
                        className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider transition-all shadow-sm ${isLiveView ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-gray-100 text-gray-500 border border-gray-200'}`}
                    >
                        {isLiveView ? '● Live Mode' : 'History Mode'}
                    </button>
                    <button
                        onClick={() => setMapMode(mapMode === 'roadmap' ? 'satellite' : 'roadmap')}
                        className="px-3 py-1 bg-brand-50 text-brand-700 border border-brand-100 rounded-full text-xs font-bold uppercase shadow-sm"
                    >
                        {mapMode === 'roadmap' ? 'Satellite View' : 'Road View'}
                    </button>
                </div>
            </div>

            <div className="p-4 space-y-4">
                {error && <p className="text-red-500 text-sm">{error}</p>}

                {!isLiveView ? (
                    <div className="card grid grid-cols-2 gap-3">
                        <div>
                            <label className="label">Select Salesperson</label>
                            <select className="input" value={selectedUser} onChange={e => setSelectedUser(e.target.value)}>
                                <option value="">-- Select Person --</option>
                                {salespersons.map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="label">Select Date</label>
                            <input className="input" type="date" value={date} onChange={e => setDate(e.target.value)} max={new Date().toISOString().slice(0, 10)} />
                        </div>
                    </div>
                ) : (
                    <div className="card grid grid-cols-1 md:grid-cols-4 gap-4 bg-white/50 border-brand-100">
                        <div className="md:col-span-4 flex items-center gap-2 mb-1">
                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Live Active Salespeople</h2>
                        </div>
                        {liveLocations.length === 0 ? (
                            <p className="md:col-span-4 text-xs text-gray-400 italic py-2">No active tracking data available right now.</p>
                        ) : liveLocations.map(loc => (
                            <button 
                                key={loc.salesperson_id}
                                onClick={() => {
                                    setActiveMarker(loc);
                                    // Map automatically centers due to mapCenter useMemo
                                }}
                                className={`flex items-center gap-3 p-2 rounded-xl border transition-all ${activeMarker?.salesperson_id === loc.salesperson_id ? 'bg-brand-50 border-brand-200 ring-2 ring-brand-100' : 'bg-white border-gray-100 hover:border-brand-200'}`}
                            >
                                <div className="w-8 h-8 bg-brand-100 text-brand-700 flex items-center justify-center rounded-full text-xs font-bold">
                                    {loc.salesperson_name.charAt(0)}
                                </div>
                                <div className="text-left overflow-hidden">
                                    <p className="text-xs font-bold text-gray-800 truncate">{loc.salesperson_name}</p>
                                    <p className="text-[9px] text-gray-400">{new Date(loc.last_ping_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                )}

                <div className="card p-0 overflow-hidden shadow-lg border-0 bg-white rounded-2xl">
                    <div className="h-[450px] w-full relative">
                        {!import.meta.env.VITE_GOOGLE_MAPS_API_KEY && (
                            <div className="absolute inset-0 bg-gray-50 flex items-center justify-center p-10 text-center z-10">
                                <p className="text-gray-500 text-sm">Please set <b>VITE_GOOGLE_MAPS_API_KEY</b> in your .env file to enable high-accuracy tracking.</p>
                            </div>
                        )}
                        <GoogleMap
                            mapContainerStyle={containerStyle}
                            center={mapCenter}
                            zoom={isLiveView ? 8 : 14}
                            mapTypeId={mapMode}
                            options={{
                                streetViewControl: false,
                                mapTypeControl: false,
                                fullscreenControl: true
                            }}
                        >
                            {isLiveView ? (
                                liveLocations.map((loc) => (
                                    <Marker
                                        key={loc.salesperson_id}
                                        position={{ lat: parseFloat(loc.latitude), lng: parseFloat(loc.longitude) }}
                                        label={{
                                            text: loc.salesperson_name,
                                            className: "map-label",
                                            color: "white",
                                            fontSize: "12px",
                                            fontWeight: "bold"
                                        }}
                                        onClick={() => setActiveMarker(loc)}
                                    />
                                ))
                            ) : (
                                <>
                                    <Polyline
                                        path={locations.map(loc => ({ lat: parseFloat(loc.latitude), lng: parseFloat(loc.longitude) }))}
                                        options={{ strokeColor: "#0ea5e9", strokeOpacity: 0.8, strokeWeight: 5 }}
                                    />
                                    {locations.length > 0 && (
                                        <Marker
                                            position={{ lat: parseFloat(locations[locations.length - 1].latitude), lng: parseFloat(locations[locations.length - 1].longitude) }}
                                            label="Current"
                                        />
                                    )}
                                    {locations.length > 1 && (
                                        <Marker
                                            position={{ lat: parseFloat(locations[0].latitude), lng: parseFloat(locations[0].longitude) }}
                                            label="Start"
                                        />
                                    )}
                                </>
                            )}

                            {activeMarker && (
                                <InfoWindow
                                    position={{ lat: parseFloat(activeMarker.latitude), lng: parseFloat(activeMarker.longitude) }}
                                    onCloseClick={() => setActiveMarker(null)}
                                >
                                    <div className="p-1">
                                        <div className="font-bold text-gray-800">{activeMarker.salesperson_name}</div>
                                        <div className="text-[10px] text-gray-500">Last Seen: {new Date(activeMarker.last_ping_at).toLocaleTimeString()}</div>
                                        <div className="text-[10px] text-gray-400 mt-1">{activeMarker.latitude}, {activeMarker.longitude}</div>
                                    </div>
                                </InfoWindow>
                            )}
                        </GoogleMap>
                    </div>
                </div>

                {!isLiveView && locations.length > 0 && (
                    <div className="card space-y-2">
                        <h2 className="font-semibold text-gray-700 flex justify-between">
                            <span>Journey History</span>
                            <span className="text-xs font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{locations.length} pings</span>
                        </h2>
                        <div className="relative border-l-2 border-brand-200 ml-3 space-y-4 py-2 mt-4 max-h-64 overflow-y-auto pr-2">
                            {locations.map((loc, idx) => (
                                <div key={idx} className="relative pl-5">
                                    <div className="absolute w-3 h-3 bg-brand-500 rounded-full -left-[7px] top-1 border-2 border-white shadow-sm" />
                                    <div className="text-sm font-medium text-gray-800">{new Date(loc.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                    <p className="text-[10px] text-gray-400 mt-0.5 font-mono">
                                        {Number(loc.latitude).toFixed(5)}, {Number(loc.longitude).toFixed(5)}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <style>{`
                .map-label {
                    background-color: #0369a1;
                    padding: 2px 8px;
                    border-radius: 4px;
                    border: 2px solid white;
                    margin-top: -40px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                }
            `}</style>
        </div>
    );
}
