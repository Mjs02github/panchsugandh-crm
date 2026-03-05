import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import BottomNav from '../components/BottomNav';

const ROLE_COLOR = {
    super_admin: 'bg-purple-100 text-purple-700',
    admin: 'bg-blue-100 text-blue-700',
    sales_officer: 'bg-indigo-100 text-indigo-700',
    salesperson: 'bg-green-100 text-green-700',
    bill_operator: 'bg-yellow-100 text-yellow-700',
    delivery_incharge: 'bg-orange-100 text-orange-700',
    store_incharge: 'bg-pink-100 text-pink-700',
};

function fmtTime(dt) {
    if (!dt) return '';
    const d = new Date(dt);
    const now = new Date();
    if (d.toDateString() === now.toDateString())
        return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

function initials(name = '') {
    return name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase()).join('');
}

// ── Order Picker Modal ─────────────────────────────────────
function OrderPicker({ onSelect, onClose }) {
    const [q, setQ] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    useEffect(() => {
        if (q.length < 1) { setResults([]); return; }
        setLoading(true);
        api.get('/chat/orders-search', { params: { q } })
            .then(r => setResults(r.data)).finally(() => setLoading(false));
    }, [q]);
    return (
        <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl w-full max-w-sm p-5 space-y-3 max-h-[80vh] flex flex-col">
                <div className="flex justify-between items-center">
                    <h3 className="font-bold text-gray-800">Link an Order</h3>
                    <button onClick={onClose} className="text-gray-400 text-xl">✕</button>
                </div>
                <input className="input text-sm" placeholder="Search order / party…" value={q} autoFocus onChange={e => setQ(e.target.value)} />
                <div className="overflow-y-auto flex-1 space-y-2">
                    {loading && <p className="text-xs text-center text-gray-400 py-4">Searching…</p>}
                    {results.map(o => (
                        <button key={o.id} onClick={() => onSelect(o)}
                            className="w-full text-left p-3 bg-gray-50 rounded-xl border border-gray-200 hover:bg-brand-50 hover:border-brand-300 transition-colors">
                            <p className="font-semibold text-sm text-gray-800">{o.retailer_name}</p>
                            <p className="text-xs text-gray-500 font-mono">{o.order_number} • ₹{parseFloat(o.total_amount).toLocaleString('en-IN')}</p>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ── New Channel Modal ──────────────────────────────────────
function NewChannelModal({ onCreated, onClose }) {
    const [name, setName] = useState('');
    const [linkedOrder, setLinkedOrder] = useState(null);
    const [showOrderPicker, setShowOrderPicker] = useState(false);
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState('');
    const handleCreate = async () => {
        if (!name.trim()) return setError('Name required.');
        setCreating(true);
        try {
            const payload = { name: name.trim(), type: linkedOrder ? 'order' : 'general' };
            if (linkedOrder) payload.order_id = linkedOrder.id;
            const res = await api.post('/chat/channels', payload);
            onCreated(res.data);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed.');
        } finally { setCreating(false); }
    };
    return (
        <>
            <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center p-4 z-50">
                <div className="bg-white rounded-2xl w-full max-w-sm p-5 space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="font-bold text-gray-800 text-lg">New Group Discussion</h3>
                        <button onClick={onClose} className="text-gray-400 text-xl">✕</button>
                    </div>
                    {error && <p className="text-red-500 text-xs bg-red-50 p-2 rounded-lg">{error}</p>}
                    <div>
                        <label className="label text-xs">Topic Name *</label>
                        <input className="input" placeholder="e.g. Delivery issue, Pricing…"
                            value={name} autoFocus onChange={e => setName(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleCreate()} />
                    </div>
                    <div>
                        <label className="label text-xs">Link Order (optional)</label>
                        {linkedOrder ? (
                            <div className="flex items-center gap-2 p-3 bg-brand-50 border border-brand-200 rounded-xl">
                                <div className="flex-1">
                                    <p className="text-sm font-semibold text-brand-800">{linkedOrder.retailer_name}</p>
                                    <p className="text-xs text-brand-600 font-mono">{linkedOrder.order_number}</p>
                                </div>
                                <button onClick={() => setLinkedOrder(null)} className="text-gray-400 hover:text-red-500 font-bold">✕</button>
                            </div>
                        ) : (
                            <button onClick={() => setShowOrderPicker(true)}
                                className="w-full py-2.5 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:border-brand-400 hover:text-brand-600 transition-colors">
                                📦 Pick an Order
                            </button>
                        )}
                    </div>
                    <button onClick={handleCreate} disabled={creating || !name.trim()}
                        className="w-full py-3 bg-brand-600 text-white font-bold rounded-xl disabled:opacity-50">
                        {creating ? 'Creating…' : '✅ Create Channel'}
                    </button>
                </div>
            </div>
            {showOrderPicker && (
                <OrderPicker
                    onSelect={o => { setLinkedOrder(o); setShowOrderPicker(false); if (!name) setName(`Order: ${o.order_number}`); }}
                    onClose={() => setShowOrderPicker(false)}
                />
            )}
        </>
    );
}

// ── User Picker for DMs ────────────────────────────────────
function UserPicker({ currentUserId, onSelect, onClose }) {
    const [users, setUsers] = useState([]);
    const [q, setQ] = useState('');
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        api.get('/chat/users').then(r => setUsers(r.data)).finally(() => setLoading(false));
    }, []);
    const filtered = users.filter(u => u.name.toLowerCase().includes(q.toLowerCase()));
    return (
        <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl w-full max-w-sm p-5 space-y-3 max-h-[80vh] flex flex-col">
                <div className="flex justify-between items-center">
                    <h3 className="font-bold text-gray-800">New Direct Message</h3>
                    <button onClick={onClose} className="text-gray-400 text-xl">✕</button>
                </div>
                <input className="input text-sm" placeholder="Search by name…" value={q} autoFocus onChange={e => setQ(e.target.value)} />
                <div className="overflow-y-auto flex-1 space-y-2">
                    {loading && <p className="text-xs text-center text-gray-400 py-4">Loading staff…</p>}
                    {filtered.map(u => (
                        <button key={u.id} onClick={() => onSelect(u)}
                            className="w-full flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200 hover:bg-brand-50 hover:border-brand-300 transition-colors text-left">
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${ROLE_COLOR[u.role] || 'bg-gray-100 text-gray-600'}`}>
                                {initials(u.name)}
                            </div>
                            <div>
                                <p className="font-semibold text-sm text-gray-800">{u.name}</p>
                                <p className="text-[10px] text-gray-400 capitalize">{u.role?.replace('_', ' ')}</p>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ── Main Chat Page ─────────────────────────────────────────
export default function Chat() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [tab, setTab] = useState('channels'); // 'channels' | 'people'

    const [channels, setChannels] = useState([]);
    const [activeChannel, setActiveChannel] = useState(null);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [sending, setSending] = useState(false);
    const [showNewChannel, setShowNewChannel] = useState(false);
    const [showUserPicker, setShowUserPicker] = useState(false);
    const lastIdRef = useRef(0);
    const messagesEndRef = useRef(null);
    const pollRef = useRef(null);
    const inputRef = useRef(null);

    const loadChannels = useCallback(() => {
        api.get('/chat/channels').then(r => setChannels(r.data)).catch(() => { });
    }, []);

    useEffect(() => { loadChannels(); }, [loadChannels]);

    const fetchMessages = useCallback(async (channelId, initial = false) => {
        try {
            const after = initial ? 0 : lastIdRef.current;
            const res = await api.get(`/chat/channels/${channelId}/messages`, { params: { after, limit: 60 } });
            const newMsgs = res.data;
            if (newMsgs.length > 0) {
                lastIdRef.current = newMsgs[newMsgs.length - 1].id;
                setMessages(prev => initial ? newMsgs : [...prev, ...newMsgs]);
            }
        } catch { }
    }, []);

    useEffect(() => {
        if (!activeChannel) return;
        lastIdRef.current = 0;
        setMessages([]);
        fetchMessages(activeChannel.id, true);
        clearInterval(pollRef.current);
        pollRef.current = setInterval(() => fetchMessages(activeChannel.id), 5000);
        return () => clearInterval(pollRef.current);
    }, [activeChannel, fetchMessages]);

    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

    const openDM = async (targetUser) => {
        setShowUserPicker(false);
        try {
            const res = await api.post('/chat/direct', { target_user_id: targetUser.id });
            setActiveChannel({ ...res.data, dmPartnerName: targetUser.name });
            loadChannels();
        } catch { alert('Failed to open conversation.'); }
    };

    const sendMessage = async () => {
        if (!input.trim() || sending || !activeChannel) return;
        const text = input.trim();
        setInput('');
        setSending(true);
        try {
            const res = await api.post(`/chat/channels/${activeChannel.id}/messages`, { message: text });
            setMessages(prev => [...prev, res.data]);
            lastIdRef.current = res.data.id;
            loadChannels();
        } catch { setInput(text); }
        finally { setSending(false); inputRef.current?.focus(); }
    };

    const handleKey = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } };

    // Get display name for a channel
    const getChannelDisplay = (ch) => {
        if (ch.type === 'direct') {
            const partner = ch.user1_id === user?.id ? ch.user2_name : ch.user1_name;
            return { name: partner, icon: '👤', iconBg: 'bg-purple-100' };
        }
        if (ch.type === 'order') return { name: ch.name, icon: '📦', iconBg: 'bg-brand-100' };
        return { name: ch.name, icon: '#', iconBg: 'bg-green-100' };
    };

    // Split channels into groups and DMs
    const groupChannels = channels.filter(c => c.type !== 'direct');
    const dmChannels = channels.filter(c => c.type === 'direct');

    const isMine = msg => msg.sender_id === user?.id;

    if (activeChannel) {
        const disp = getChannelDisplay(activeChannel);
        return (
            <div className="flex flex-col h-screen bg-gray-50">
                {/* Header */}
                <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 shrink-0">
                    <button onClick={() => { setActiveChannel(null); clearInterval(pollRef.current); }}
                        className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-600">←</button>
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg ${disp.iconBg}`}>{disp.icon}</div>
                    <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-800 text-sm truncate">{disp.name}</p>
                        {activeChannel.order_number && (
                            <button className="text-[10px] text-brand-600 font-mono hover:underline"
                                onClick={() => navigate(`/orders/${activeChannel.order_id}`)}>
                                {activeChannel.order_number} →
                            </button>
                        )}
                        {activeChannel.type === 'direct' && (
                            <p className="text-[10px] text-gray-400">Direct Message</p>
                        )}
                    </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-3 py-4 space-y-3">
                    {messages.length === 0 && (
                        <div className="text-center py-12 text-gray-400">
                            <div className="text-4xl mb-2">{activeChannel.type === 'direct' ? '👋' : '💬'}</div>
                            <p className="text-sm">Start the conversation!</p>
                        </div>
                    )}
                    {messages.map((msg, i) => {
                        const mine = isMine(msg);
                        const showHeader = i === 0 || messages[i - 1]?.sender_id !== msg.sender_id;
                        return (
                            <div key={msg.id} className={`flex gap-2 ${mine ? 'flex-row-reverse' : ''}`}>
                                {!mine && showHeader && (
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${ROLE_COLOR[msg.sender_role] || 'bg-gray-100 text-gray-600'}`}>
                                        {initials(msg.sender_name)}
                                    </div>
                                )}
                                {!mine && !showHeader && <div className="w-8 shrink-0" />}
                                <div className={`max-w-[75%] flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
                                    {showHeader && !mine && <p className="text-[10px] text-gray-400 mb-0.5 px-1">{msg.sender_name}</p>}
                                    <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed break-words ${mine
                                        ? 'bg-brand-600 text-white rounded-tr-sm'
                                        : 'bg-white text-gray-800 border border-gray-200 rounded-tl-sm shadow-sm'}`}>
                                        {msg.message}
                                    </div>
                                    <p className={`text-[9px] text-gray-400 mt-0.5 px-1 ${mine ? 'text-right' : ''}`}>{fmtTime(msg.created_at)}</p>
                                </div>
                            </div>
                        );
                    })}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="bg-white border-t border-gray-100 px-3 py-3 flex items-end gap-2 shrink-0">
                    <textarea ref={inputRef} rows={1}
                        className="flex-1 resize-none rounded-2xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent bg-gray-50 max-h-28 leading-5"
                        placeholder="Type a message…" value={input}
                        onChange={e => setInput(e.target.value)} onKeyDown={handleKey} />
                    <button onClick={sendMessage} disabled={!input.trim() || sending}
                        className="w-10 h-10 bg-brand-600 hover:bg-brand-700 text-white rounded-full flex items-center justify-center disabled:opacity-40 transition-colors shrink-0">
                        {sending
                            ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            : <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 rotate-45 -ml-0.5 -mt-0.5"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" /></svg>
                        }
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen pb-16 bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-100 px-4 py-4 flex items-center justify-between shrink-0">
                <div>
                    <h1 className="text-lg font-bold text-gray-800">💬 Chat</h1>
                    <p className="text-xs text-gray-400">Staff communications</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setShowUserPicker(true)}
                        className="flex items-center gap-1 px-3 py-2 bg-purple-100 text-purple-700 text-sm font-semibold rounded-xl hover:bg-purple-200 transition-colors">
                        👤 DM
                    </button>
                    <button onClick={() => setShowNewChannel(true)}
                        className="flex items-center gap-1 px-3 py-2 bg-brand-600 text-white text-sm font-semibold rounded-xl hover:bg-brand-700 transition-colors">
                        # New
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 px-4 py-2 bg-white border-b border-gray-100 shrink-0">
                {[{ key: 'channels', label: `Channels (${groupChannels.length})` }, { key: 'dms', label: `Direct (${dmChannels.length})` }].map(t => (
                    <button key={t.key} onClick={() => setTab(t.key)}
                        className={`flex-1 py-1.5 rounded-xl text-xs font-semibold transition-all ${tab === t.key ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                        {t.label}
                    </button>
                ))}
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto divide-y divide-gray-100 bg-white">
                {tab === 'channels' && (
                    groupChannels.length === 0 ? (
                        <div className="text-center py-12 text-gray-400"><div className="text-4xl mb-2">#</div><p>No channels yet. Create one!</p></div>
                    ) : groupChannels.map(ch => {
                        const d = getChannelDisplay(ch);
                        return (
                            <div key={ch.id} onClick={() => setActiveChannel(ch)}
                                className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 cursor-pointer transition-colors">
                                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-lg font-bold shrink-0 ${d.iconBg}`}>{d.icon}</div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start">
                                        <p className="font-semibold text-gray-800 text-sm truncate">{d.name}</p>
                                        <p className="text-[10px] text-gray-400 shrink-0 ml-2">{fmtTime(ch.last_message_at || ch.created_at)}</p>
                                    </div>
                                    {ch.order_number && <p className="text-[10px] text-brand-600 font-mono">{ch.order_number}</p>}
                                    <p className="text-xs text-gray-400 truncate mt-0.5">
                                        {ch.last_message ? <><span className="font-medium text-gray-500">{ch.last_sender?.split(' ')[0]}:</span> {ch.last_message}</> : <span className="italic">No messages yet</span>}
                                    </p>
                                </div>
                            </div>
                        );
                    })
                )}
                {tab === 'dms' && (
                    dmChannels.length === 0 ? (
                        <div className="text-center py-12 text-gray-400">
                            <div className="text-4xl mb-2">👤</div>
                            <p>No direct messages yet</p>
                            <button onClick={() => setShowUserPicker(true)} className="mt-3 px-4 py-2 bg-purple-100 text-purple-700 text-sm rounded-xl font-semibold">
                                Start a conversation
                            </button>
                        </div>
                    ) : dmChannels.map(ch => {
                        const partnerName = ch.user1_id === user?.id ? ch.user2_name : ch.user1_name;
                        return (
                            <div key={ch.id} onClick={() => setActiveChannel(ch)}
                                className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 cursor-pointer transition-colors">
                                <div className="w-11 h-11 rounded-full bg-purple-100 flex items-center justify-center text-sm font-bold text-purple-700 shrink-0">
                                    {initials(partnerName)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start">
                                        <p className="font-semibold text-gray-800 text-sm truncate">{partnerName}</p>
                                        <p className="text-[10px] text-gray-400 shrink-0 ml-2">{fmtTime(ch.last_message_at || ch.created_at)}</p>
                                    </div>
                                    <p className="text-xs text-gray-400 truncate mt-0.5">
                                        {ch.last_message ? ch.last_message : <span className="italic">No messages yet</span>}
                                    </p>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {showNewChannel && (
                <NewChannelModal onCreated={ch => { setShowNewChannel(false); loadChannels(); setActiveChannel(ch); }} onClose={() => setShowNewChannel(false)} />
            )}
            {showUserPicker && (
                <UserPicker currentUserId={user?.id} onSelect={openDM} onClose={() => setShowUserPicker(false)} />
            )}
            <BottomNav />
        </div>
    );
}
