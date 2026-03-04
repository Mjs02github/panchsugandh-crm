import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api';

const TRACKING_INTERVAL = 5 * 60 * 1000; // 5 minutes

export default function useGPSTracking() {
    const { user, isLoggedIn } = useAuth();
    const intervalRef = useRef(null);

    useEffect(() => {
        // Stop any existing interval if user changes/logs out
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }

        // Only track salespersons and sales officers
        if (!isLoggedIn || !user || !['salesperson', 'sales_officer'].includes(user.role)) {
            return;
        }

        const sendLocation = () => {
            if (!navigator.geolocation) return;

            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    api.post('/locations', {
                        latitude: pos.coords.latitude,
                        longitude: pos.coords.longitude
                    }).catch(err => console.error('Failed to sync location:', err));
                },
                (err) => {
                    console.warn('Background tracking GPS error:', err);
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        };

        // Send once immediately on load
        sendLocation();

        // Then set up an interval to send periodically
        intervalRef.current = setInterval(sendLocation, TRACKING_INTERVAL);

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [isLoggedIn, user]);
}
