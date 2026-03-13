const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');
const { allowRoles, ROLES } = require('../middleware/rbac');
const { sendNotification, broadcastNotification } = require('../utils/notificationService');

// GET /api/notifications - Get user's notifications
router.get('/', auth, async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
            [req.user.id]
        );
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PATCH /api/notifications/:id/read - Mark notification as read
router.patch('/:id/read', auth, async (req, res) => {
    try {
        await db.query(
            'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?',
            [req.params.id, req.user.id]
        );
        res.json({ message: 'Marked as read' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/notifications/read-all - Mark all as read
router.post('/read-all', auth, async (req, res) => {
    try {
        await db.query('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [req.user.id]);
        res.json({ message: 'All marked as read' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/notifications/token - Register FCM token
router.post('/token', auth, async (req, res) => {
    const { token, platform } = req.body;
    if (!token) return res.status(400).json({ error: 'Token is required' });
    try {
        await db.query(
            'INSERT INTO fcm_tokens (user_id, token, platform) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE user_id = ?, platform = ?, updated_at = NOW()',
            [req.user.id, token, platform || 'web', req.user.id, platform || 'web']
        );
        res.json({ message: 'Token registered' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/notifications/broadcast - Admin broadcast
router.post('/broadcast', auth, allowRoles(ROLES.ADMIN, ROLES.SUPER_ADMIN), async (req, res) => {
    const { role, title, message, scheduled_at } = req.body;
    if (!title || !message) return res.status(400).json({ error: 'Title and message are required' });

    try {
        if (scheduled_at && new Date(scheduled_at) > new Date()) {
            // Schedule for later
            await db.query(
                'INSERT INTO scheduled_notifications (target_role, title, message, scheduled_at, created_by) VALUES (?, ?, ?, ?, ?)',
                [role || 'ALL', title, message, scheduled_at, req.user.id]
            );
            res.json({ message: 'Notification scheduled' });
        } else {
            // Send immediately
            await broadcastNotification(role, title, message, req.user.id);
            res.json({ message: 'Notification broadcasted' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/notifications/broadcasts - List scheduled/past broadcasts
router.get('/broadcasts', auth, allowRoles(ROLES.ADMIN, ROLES.SUPER_ADMIN), async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT sn.*, u.name as creator_name FROM scheduled_notifications sn LEFT JOIN users u ON sn.created_by = u.id ORDER BY sn.created_at DESC'
        );
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
