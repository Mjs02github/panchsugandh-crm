import React, { useState, useEffect, useRef } from 'react';
import { Bell, CheckCheck, X } from 'lucide-react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';

export default function NotificationBell() {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const dropdownRef = useRef(null);

    const fetchNotifications = async () => {
        try {
            const res = await api.get('/notifications');
            setNotifications(res.data);
            setUnreadCount(res.data.filter(n => !n.is_read).length);
        } catch (err) {
            console.error('Failed to fetch notifications:', err);
        }
    };

    useEffect(() => {
        if (user) {
            fetchNotifications();
            const interval = setInterval(fetchNotifications, 60000); // Poll every minute

            // Capacitor Push Notifications Setup
            if (Capacitor.isNativePlatform()) {
                setupPush();
            }

            return () => clearInterval(interval);
        }
    }, [user]);

    const setupPush = async () => {
        try {
            let perm = await PushNotifications.checkPermissions();
            if (perm.receive !== 'granted') {
                perm = await PushNotifications.requestPermissions();
            }
            if (perm.receive === 'granted') {
                await PushNotifications.register();
            }

            PushNotifications.addListener('registration', async (token) => {
                await api.post('/notifications/token', {
                    token: token.value,
                    platform: Capacitor.getPlatform()
                });
            });

            PushNotifications.addListener('pushNotificationReceived', (notification) => {
                fetchNotifications();
                // We could show a local toast here if needed
            });

            PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
                // Handle notification click
                fetchNotifications();
            });
        } catch (err) {
            console.warn('Push registration failed:', err);
        }
    };

    const markRead = async (id) => {
        try {
            await api.patch(`/notifications/${id}/read`);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (err) {
            console.error(err);
        }
    };

    const markAllRead = async () => {
        try {
            await api.post('/notifications/read-all');
            setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
            setUnreadCount(0);
        } catch (err) {
            console.error(err);
        }
    };

    // Close dropdown on click outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (!user) return null;

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-gray-400 hover:text-brand-600 transition-colors bg-gray-50 rounded-full"
            >
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 max-h-[400px] bg-white rounded-xl shadow-2xl border border-gray-100 z-[100] flex flex-col overflow-hidden">
                    <div className="px-4 py-3 border-b flex items-center justify-between bg-gray-50/50">
                        <h3 className="font-bold text-gray-800 flex items-center gap-2">
                            Notifications
                            {unreadCount > 0 && <span className="text-xs font-normal text-gray-500">({unreadCount} new)</span>}
                        </h3>
                        <button
                            onClick={markAllRead}
                            className="text-xs text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1"
                        >
                            <CheckCheck size={14} /> Mark all read
                        </button>
                    </div>

                    <div className="overflow-y-auto flex-1">
                        {notifications.length === 0 ? (
                            <div className="p-8 text-center text-gray-400">
                                <Bell className="mx-auto mb-2 opacity-20" size={32} />
                                <p className="text-sm">No notifications yet</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-50">
                                {notifications.map((notif) => (
                                    <div
                                        key={notif.id}
                                        onClick={() => markRead(notif.id)}
                                        className={`p-4 cursor-pointer transition-colors hover:bg-gray-50 relative ${!notif.is_read ? 'bg-brand-50/30' : ''}`}
                                    >
                                        {!notif.is_read && (
                                            <div className="absolute left-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-brand-500 rounded-full" />
                                        )}
                                        <div className="flex flex-col gap-0.5">
                                            <span className={`text-sm ${!notif.is_read ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>
                                                {notif.title}
                                            </span>
                                            <p className="text-xs text-gray-500 leading-relaxed">
                                                {notif.message}
                                            </p>
                                            <span className="text-[10px] text-gray-400 mt-1">
                                                {new Date(notif.created_at).toLocaleString([], { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="p-2 border-t text-center bg-gray-50/30">
                        <button
                            onClick={() => setIsOpen(false)}
                            className="text-xs text-gray-500 hover:text-gray-700 font-medium py-1 w-full"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
