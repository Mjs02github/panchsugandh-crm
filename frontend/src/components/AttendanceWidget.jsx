import { useState, useEffect } from 'react';
import api from '../api';

export default function AttendanceWidget({ user }) {
    const [status, setStatus] = useState('LOADING'); // LOADING, NOT_PUNCHED_IN, PUNCHED_IN, PUNCHED_OUT
    const [punchTime, setPunchTime] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchStatus();
    }, []);

    const fetchStatus = () => {
        api.get('/attendance/status')
            .then(res => {
                setStatus(res.data.status);
                if (res.data.record) {
                    setPunchTime(res.data.record.punch_in_time);
                }
            })
            .catch(err => {
                console.error('Attendance error:', err);
                setStatus('ERROR');
            });
    };

    const handlePunch = async (action) => {
        setLoading(true);
        setError('');

        try {
            let lat, lng;
            if (window.Capacitor?.isNativePlatform()) {
                const { Geolocation } = await import('@capacitor/geolocation');
                const permStatus = await Geolocation.checkPermissions();
                if (permStatus.location !== 'granted') {
                    const request = await Geolocation.requestPermissions();
                    if (request.location !== 'granted') {
                        setError('Please allow location access to punch in/out.');
                        setLoading(false);
                        return;
                    }
                }
                const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10000 });
                lat = pos.coords.latitude;
                lng = pos.coords.longitude;
            } else if (navigator.geolocation) {
                const pos = await new Promise((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
                });
                lat = pos.coords.latitude;
                lng = pos.coords.longitude;
            } else {
                setError('Geolocation is not supported by your device.');
                setLoading(false);
                return;
            }

            api.post(`/attendance/${action}`, { latitude: lat, longitude: lng })
                .then(() => fetchStatus())
                .catch(err => setError(err.response?.data?.error || 'Failed to record punch.'))
                .finally(() => setLoading(false));

        } catch (err) {
            console.error('GPS Error:', err);
            setError('Failed to get GPS location.');
            setLoading(false);
        }
    };

    if (status === 'LOADING') return (
        <div className="card text-center py-4">
            <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
    );

    if (status === 'ERROR') return null;

    return (
        <div className="card space-y-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100">
            <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <span>🕒</span> Daily Attendance
            </h3>

            {error && <p className="text-red-500 text-xs px-2 py-1 bg-red-50 rounded border border-red-200">{error}</p>}

            {status === 'NOT_PUNCHED_IN' && (
                <div>
                    <p className="text-sm text-gray-600 mb-3">You haven't punched in today.</p>
                    <button
                        onClick={() => handlePunch('punch-in')}
                        disabled={loading}
                        className="btn-primary w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700"
                    >
                        {loading ? 'Capturing GPS...' : '📍 Punch In Now'}
                    </button>
                </div>
            )}

            {status === 'PUNCHED_IN' && (
                <div>
                    <p className="text-sm text-gray-600 mb-3">
                        Punched In at <span className="font-semibold text-gray-800">{new Date(punchTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </p>
                    <button
                        onClick={() => handlePunch('punch-out')}
                        disabled={loading}
                        className="btn-primary w-full flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600"
                    >
                        {loading ? 'Capturing GPS...' : '📍 Punch Out'}
                    </button>
                    <p className="text-[10px] text-gray-500 mt-2 text-center">Remember to punch out when your day is done.</p>
                </div>
            )}

            {status === 'PUNCHED_OUT' && (
                <div className="text-center py-2 text-sm text-green-700 font-medium flex items-center justify-center gap-2">
                    <span>✅</span> Attendance Completed
                </div>
            )}
        </div>
    );
}
