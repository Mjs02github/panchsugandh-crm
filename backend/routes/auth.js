const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const router = express.Router();

/**
 * POST /api/auth/login
 * Body: { email, password }
 */
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required.' });
        }

        const [rows] = await db.query(
            `SELECT u.id, u.name, u.email, u.password, u.is_active, u.manager_id,
              r.name AS role
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.email = ? LIMIT 1`,
            [email.toLowerCase().trim()]
        );

        if (!rows.length) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        const user = rows[0];

        if (!user.is_active) {
            return res.status(403).json({ error: 'Your account is deactivated. Contact admin.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        const payload = {
            id: user.id,
            name: user.name,
            role: user.role,
            managerId: user.manager_id,
        };

        const token = jwt.sign(payload, process.env.JWT_SECRET || 'panchsugandh_fallback_secret_123', {
            expiresIn: process.env.JWT_EXPIRES_IN || '8h',
        });

        res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                managerId: user.manager_id,
            },
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Server error during login.' });
    }
});

/**
 * GET /api/auth/me
 * Returns current logged-in user info
 */
router.get('/me', require('../middleware/auth'), async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT u.id, u.name, u.email, u.phone, u.manager_id, r.name AS role
       FROM users u JOIN roles r ON u.role_id = r.id
       WHERE u.id = ?`,
            [req.user.id]
        );
        if (!rows.length) return res.status(404).json({ error: 'User not found.' });
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Server error.' });
    }
});

module.exports = router;
