import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import api from '../api';

const AuthContext = createContext(null);

const IDLE_TIME_MS = 60 * 60 * 1000; // 1 Hour

export function AuthProvider({ children }) {
    const [user, setUser] = useState(() => {
        try { return JSON.parse(localStorage.getItem('crm_user')) || null; }
        catch { return null; }
    });

    const idleTimerRef = useRef(null);

    const logout = useCallback(() => {
        localStorage.removeItem('crm_token');
        localStorage.removeItem('crm_user');
        setUser(null);
        if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    }, []);

    const resetIdleTimer = useCallback(() => {
        if (!user) return;
        if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
        idleTimerRef.current = setTimeout(() => {
            console.log("Session expired due to inactivity");
            logout();
        }, IDLE_TIME_MS);
    }, [user, logout]);

    useEffect(() => {
        if (user) {
            // Set initial timer
            resetIdleTimer();

            // Event listeners to detect activity
            const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
            events.forEach(event => window.addEventListener(event, resetIdleTimer));

            return () => {
                events.forEach(event => window.removeEventListener(event, resetIdleTimer));
                if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
            };
        }
    }, [user, resetIdleTimer]);

    const login = useCallback(async (email, password) => {
        const { data } = await api.post('/auth/login', { email, password });
        localStorage.setItem('crm_token', data.token);
        localStorage.setItem('crm_user', JSON.stringify(data.user));
        setUser(data.user);
        return data.user;
    }, []);

    return (
        <AuthContext.Provider value={{ user, login, logout, isLoggedIn: !!user }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
