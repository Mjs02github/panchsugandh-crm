const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');
const router = express.Router();

// Helper: select sender with role via JOIN
const SENDER_COLS = `u.id AS sender_id, u.name AS sender_name, r.name AS sender_role`;
const SENDER_JOIN = `JOIN users u ON m.sender_id = u.id JOIN roles r ON u.role_id = r.id`;

// ─────────────────────────────────────────────────────────
// GET /api/chat/channels
// ─────────────────────────────────────────────────────────
router.get('/channels', auth, async (req, res) => {
    try {
        const userId = req.user.id;
        const [channels] = await db.query(
            `SELECT 
                c.id, c.name, c.type, c.order_id, c.created_at,
                c.user1_id, c.user2_id,
                cu.name AS created_by_name,
                u1.name AS user1_name,
                u2.name AS user2_name,
                so.order_number,
                (SELECT id FROM chat_messages WHERE channel_id = c.id ORDER BY created_at DESC LIMIT 1) AS last_message_id,
                (SELECT message FROM chat_messages WHERE channel_id = c.id ORDER BY created_at DESC LIMIT 1) AS last_message,
                (SELECT created_at FROM chat_messages WHERE channel_id = c.id ORDER BY created_at DESC LIMIT 1) AS last_message_at,
                (SELECT un.name FROM chat_messages cm JOIN users un ON cm.sender_id = un.id WHERE cm.channel_id = c.id ORDER BY cm.created_at DESC LIMIT 1) AS last_sender
            FROM chat_channels c
            JOIN users cu ON c.created_by = cu.id
            LEFT JOIN sales_orders so ON c.order_id = so.id
            LEFT JOIN users u1 ON c.user1_id = u1.id
            LEFT JOIN users u2 ON c.user2_id = u2.id
            WHERE c.type != 'direct'
               OR (c.type = 'direct' AND (c.user1_id = ? OR c.user2_id = ?))
            ORDER BY COALESCE(
                (SELECT created_at FROM chat_messages WHERE channel_id = c.id ORDER BY created_at DESC LIMIT 1),
                c.created_at
            ) DESC`,
            [userId, userId]
        );
        res.json(channels);
    } catch (err) {
        console.error('Chat channels error:', err);
        res.status(500).json({ error: 'Server error.' });
    }
});

// ─────────────────────────────────────────────────────────
// GET /api/chat/users — list all staff for DM picker
// ─────────────────────────────────────────────────────────
router.get('/users', auth, async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT u.id, u.name, r.name AS role
             FROM users u
             JOIN roles r ON u.role_id = r.id
             WHERE u.is_active = 1 AND u.id != ?
             ORDER BY r.name, u.name`,
            [req.user.id]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Server error.' });
    }
});

// ─────────────────────────────────────────────────────────
// POST /api/chat/direct — get-or-create DM channel
// ─────────────────────────────────────────────────────────
router.post('/direct', auth, async (req, res) => {
    try {
        const { target_user_id } = req.body;
        if (!target_user_id) return res.status(400).json({ error: 'target_user_id required.' });

        const myId = req.user.id;
        const u1 = Math.min(myId, target_user_id);
        const u2 = Math.max(myId, target_user_id);

        // Check if DM already exists
        const [existing] = await db.query(
            `SELECT c.id, c.name, c.type, c.user1_id, c.user2_id,
                    u1.name AS user1_name, u2.name AS user2_name
             FROM chat_channels c
             JOIN users u1 ON c.user1_id = u1.id
             JOIN users u2 ON c.user2_id = u2.id
             WHERE c.type = 'direct' AND c.user1_id = ? AND c.user2_id = ?`,
            [u1, u2]
        );
        if (existing.length) return res.json(existing[0]);

        // Get target user name for channel name
        const [targetUser] = await db.query('SELECT name FROM users WHERE id = ?', [target_user_id]);
        if (!targetUser.length) return res.status(404).json({ error: 'User not found.' });

        const [result] = await db.query(
            `INSERT INTO chat_channels (name, type, user1_id, user2_id, created_by)
             VALUES (?, 'direct', ?, ?, ?)`,
            [`DM:${u1}:${u2}`, u1, u2, myId]
        );

        const [newCh] = await db.query(
            `SELECT c.id, c.name, c.type, c.user1_id, c.user2_id,
                    u1.name AS user1_name, u2.name AS user2_name
             FROM chat_channels c
             JOIN users u1 ON c.user1_id = u1.id
             JOIN users u2 ON c.user2_id = u2.id
             WHERE c.id = ?`,
            [result.insertId]
        );
        res.status(201).json(newCh[0]);
    } catch (err) {
        console.error('DM create error:', err);
        res.status(500).json({ error: 'Server error.' });
    }
});

// ─────────────────────────────────────────────────────────
// POST /api/chat/channels — create group/order channel
// ─────────────────────────────────────────────────────────
router.post('/channels', auth, async (req, res) => {
    try {
        const { name, type = 'general', order_id } = req.body;
        if (!name || !name.trim()) return res.status(400).json({ error: 'Channel name is required.' });

        const [result] = await db.query(
            'INSERT INTO chat_channels (name, type, order_id, created_by) VALUES (?, ?, ?, ?)',
            [name.trim(), type, order_id || null, req.user.id]
        );
        const [rows] = await db.query(
            `SELECT c.*, cu.name AS created_by_name, so.order_number
             FROM chat_channels c JOIN users cu ON c.created_by = cu.id
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

// ─────────────────────────────────────────────────────────
// GET /api/chat/channels/:id/messages
// ─────────────────────────────────────────────────────────
router.get('/channels/:id/messages', auth, async (req, res) => {
    try {
        const { id } = req.params;
        const { after = 0, limit = 60 } = req.query;

        const [messages] = await db.query(
            `SELECT m.id, m.channel_id, m.message, m.created_at,
                    ${SENDER_COLS}
             FROM chat_messages m
             ${SENDER_JOIN}
             WHERE m.channel_id = ? AND m.id > ?
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

// ─────────────────────────────────────────────────────────
// POST /api/chat/channels/:id/messages
// ─────────────────────────────────────────────────────────
router.post('/channels/:id/messages', auth, async (req, res) => {
    try {
        const { id } = req.params;
        const { message } = req.body;
        if (!message || !message.trim()) return res.status(400).json({ error: 'Message cannot be empty.' });

        const [ch] = await db.query('SELECT id FROM chat_channels WHERE id = ?', [id]);
        if (!ch.length) return res.status(404).json({ error: 'Channel not found.' });

        const [result] = await db.query(
            'INSERT INTO chat_messages (channel_id, sender_id, message) VALUES (?, ?, ?)',
            [id, req.user.id, message.trim()]
        );
        const [rows] = await db.query(
            `SELECT m.id, m.channel_id, m.message, m.created_at,
                    ${SENDER_COLS}
             FROM chat_messages m ${SENDER_JOIN}
             WHERE m.id = ?`,
            [result.insertId]
        );
        res.status(201).json(rows[0]);
    } catch (err) {
        console.error('Send message error:', err);
        res.status(500).json({ error: 'Server error.' });
    }
});

// ─────────────────────────────────────────────────────────
// GET /api/chat/orders-search
// ─────────────────────────────────────────────────────────
router.get('/orders-search', auth, async (req, res) => {
    try {
        const { q = '' } = req.query;
        const [rows] = await db.query(
            `SELECT so.id, so.order_number, r.firm_name AS retailer_name, so.total_amount, so.status
             FROM sales_orders so JOIN retailers r ON so.retailer_id = r.id
             WHERE so.order_number LIKE ? OR r.firm_name LIKE ?
             ORDER BY so.created_at DESC LIMIT 10`,
            [`%${q}%`, `%${q}%`]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Server error.' });
    }
});

module.exports = router;
