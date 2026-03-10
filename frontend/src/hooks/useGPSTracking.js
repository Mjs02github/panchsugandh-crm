import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api';

import { Geolocation } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';
import { registerPlugin } from '@capacitor/core';

// Dynamically import the background plugin to avoid errors on non-native platforms
const BackgroundGeolocation = registerPlugin('BackgroundGeolocation');

const TRACKING_INTERVAL = 2 * 60 * 1000; // 2 minutes

export default function useGPSTracking() {
    const { user, isLoggedIn } = useAuth();
    const intervalRef = useRef(null);
    const backgroundWatcherId = useRef(null);

    useEffect(() => {
        // Cleanup function
        const stopTracking = async () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            if (Capacitor.isNativePlatform() && backgroundWatcherId.current) {
                try {
                    await BackgroundGeolocation.removeWatcher({ id: backgroundWatcherId.current });
                    backgroundWatcherId.current = null;
                } catch (e) {
                    console.error('Failed to stop background tracking:', e);
                }
            }
        };

        // Only track salespersons and sales officers
        if (!isLoggedIn || !user || !['salesperson', 'sales_officer'].includes(user.role)) {
            stopTracking();
            return;
        }

        const sendLocation = async (lat, lng) => {
            if (lat && lng) {
                api.post('/locations', { latitude: lat, longitude: lng })
                    .catch(err => console.error('Failed to sync location:', err));
            }
        };

        const startTracking = async () => {
            if (Capacitor.isNativePlatform()) {
                try {
                    // 1. Check/Request Permissions
                    const { Geolocation: CapGeo } = await import('@capacitor/geolocation');
                    let perm = await CapGeo.checkPermissions();
                    if (perm.location !== 'granted') {
                        perm = await CapGeo.requestPermissions();
                    }

                    // For background tracking, Android 10+ needs specific background permission
                    // Users must select "Allow all the time" in settings manually if not auto-requested

                    // 2. Start Background Watcher (for movement + keeping app alive)
                    const id = await BackgroundGeolocation.addWatcher(
                        {
                            backgroundMessage: "Panchsugandh: Boost the sales, meet the target",
                            backgroundTitle: "Panchsugandh",
                            requestPermissions: true,
                            stale: false,
                            distanceFilter: 5 // Reduced from 10 to 5 for better sensitivity
                        },
                        (location, error) => {
                            if (location) {
                                sendLocation(location.latitude, location.longitude);
                            }
                        }
                    );
                    backgroundWatcherId.current = id;

                    // 3. ALSO start a standard interval as a backup
                    // The BackgroundWatcher's foreground service will help this interval stay alive
                    setupStandardInterval();

                } catch (err) {
                    console.warn('Background tracking initialization failed:', err);
                    // Fallback to standard interval if background plugin fails
                    setupStandardInterval();
                }
            } else {
                setupStandardInterval();
            }
        };

        const setupStandardInterval = () => {
            const pollLocation = async () => {
                try {
                    let lat, lng;
                    if (navigator.geolocation) {
                        const pos = await new Promise((resolve, reject) => {
                            navigator.geolocation.getCurrentPosition(resolve, reject, {
                                enableHighAccuracy: true,
                                timeout: 10000,
                                maximumAge: 0
                            });
                        });
                        lat = pos.coords.latitude;
                        lng = pos.coords.longitude;
                        sendLocation(lat, lng);
                    }
                } catch (e) {
                    console.warn('Polling GPS error:', e);
                }
            };
            pollLocation(); // Initial
            intervalRef.current = setInterval(pollLocation, TRACKING_INTERVAL);
        };

        startTracking();

        return () => {
            stopTracking();
        };
    }, [isLoggedIn, user]);
}
