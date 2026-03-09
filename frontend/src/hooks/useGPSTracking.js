import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api';

import { Geolocation } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';

const TRACKING_INTERVAL = 2 * 60 * 1000; // 2 minutes

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

        const sendLocation = async () => {
            try {
                let lat, lng;
                if (Capacitor.isNativePlatform()) {
                    // Check permissions first on native
                    const permStatus = await Geolocation.checkPermissions();
                    if (permStatus.location !== 'granted') {
                        const request = await Geolocation.requestPermissions();
                        if (request.location !== 'granted') return;
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
                    return; // No GPS available
                }

                if (lat && lng) {
                    api.post('/locations', { latitude: lat, longitude: lng })
                        .catch(err => console.error('Failed to sync location:', err));
                }
            } catch (err) {
                console.warn('Background tracking GPS error:', err);
            }
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
