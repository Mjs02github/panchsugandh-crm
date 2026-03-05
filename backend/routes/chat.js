const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');
const router = express.Router();

// All authenticated staff can use chat
// ─────────────────────────────────────────────────────────

// GET /api/chat/channels
// List all channels with last message preview + unread hint
router.get('/channels', auth, async (req, res) => {
    try {
        const [channels] = await db.query(
            `SELECT 
                c.id, c.name, c.type, c.order_id, c.created_at,
                u.name AS created_by_name,
                so.order_number,
                (SELECT message FROM chat_messages WHERE channel_id = c.id ORDER BY created_at DESC LIMIT 1) AS last_message,
                (SELECT created_at FROM chat_messages WHERE channel_id = c.id ORDER BY created_at DESC LIMIT 1) AS last_message_at,
                (SELECT name FROM users WHERE id = (SELECT sender_id FROM chat_messages WHERE channel_id = c.id ORDER BY created_at DESC LIMIT 1)) AS last_sender
            FROM chat_channels c
            JOIN users u ON c.created_by = u.id
            LEFT JOIN sales_orders so ON c.order_id = so.id
            ORDER BY COALESCE(
                (SELECT created_at FROM chat_messages WHERE channel_id = c.id ORDER BY created_at DESC LIMIT 1),
                c.created_at
            ) DESC`,
        );
        res.json(channels);
    } catch (err) {
        console.error('Chat channels error:', err);
        res.status(500).json({ error: 'Server error.' });
    }
});

// POST /api/chat/channels
// Create a new channel
router.post('/channels', auth, async (req, res) => {
    try {
        const { name, type = 'general', order_id } = req.body;
        if (!name || !name.trim()) return res.status(400).json({ error: 'Channel name is required.' });

        const [result] = await db.query(
            'INSERT INTO chat_channels (name, type, order_id, created_by) VALUES (?, ?, ?, ?)',
            [name.trim(), type, order_id || null, req.user.id]
        );
        const [rows] = await db.query(
            `SELECT c.*, u.name AS created_by_name, so.order_number
             FROM chat_channels c
             JOIN users u ON c.created_by = u.id
             LEFT JOIN sales_orders so ON c.order_id = so.id
             WHERE c.id = ?`,
            [result.insertId]
        );
        res.status(201).json(rows[0]);
    } catch (err) {
        console.error('Create channel error:', err);
        res.status(500).json({ error: 'Server error.' });
    }
});

// GET /api/chat/channels/:id/messages?after=<last_id>
// Fetch messages (supports polling: only fetch new ones using after=lastId)
router.get('/channels/:id/messages', auth, async (req, res) => {
    try {
        const { id } = req.params;
        const { after = 0, limit = 60 } = req.query;

        const [messages] = await db.query(
            `SELECT 
                m.id, m.channel_id, m.message, m.created_at,
                u.id AS sender_id, u.name AS sender_name, u.role AS sender_role
             FROM chat_messages m
             JOIN users u ON m.sender_id = u.id
             WHERE m.channel_id = ?
               AND m.id > ?
             ORDER BY m.created_at ASC
             LIMIT ?`,
            [id, parseInt(after), parseInt(limit)]
        );
        res.json(messages);
    } catch (err) {
        console.error('Fetch messages error:', err);
        res.status(500).json({ error: 'Server error.' });
    }
});

// POST /api/chat/channels/:id/messages
// Send a message
router.post('/channels/:id/messages', auth, async (req, res) => {
    try {
        const { id } = req.params;
        const { message } = req.body;
        if (!message || !message.trim()) return res.status(400).json({ error: 'Message cannot be empty.' });

        // Verify channel exists
        const [ch] = await db.query('SELECT id FROM chat_channels WHERE id = ?', [id]);
        if (!ch.length) return res.status(404).json({ error: 'Channel not found.' });

        const [result] = await db.query(
            'INSERT INTO chat_messages (channel_id, sender_id, message) VALUES (?, ?, ?)',
            [id, req.user.id, message.trim()]
        );
        const [rows] = await db.query(
            `SELECT m.id, m.channel_id, m.message, m.created_at,
                    u.id AS sender_id, u.name AS sender_name, u.role AS sender_role
             FROM chat_messages m JOIN users u ON m.sender_id = u.id
             WHERE m.id = ?`,
            [result.insertId]
        );
        res.status(201).json(rows[0]);
    } catch (err) {
        console.error('Send message error:', err);
        res.status(500).json({ error: 'Server error.' });
    }
});

// GET /api/chat/orders-search?q=
// Search orders to link in a channel
router.get('/orders-search', auth, async (req, res) => {
    try {
        const { q = '' } = req.query;
        const [rows] = await db.query(
            `SELECT so.id, so.order_number, r.firm_name AS retailer_name, so.total_amount, so.status
             FROM sales_orders so
             JOIN retailers r ON so.retailer_id = r.id
             WHERE so.order_number LIKE ? OR r.firm_name LIKE ?
             ORDER BY so.created_at DESC
             LIMIT 10`,
            [`%${q}%`, `%${q}%`]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Server error.' });
    }
});

module.exports = router;
