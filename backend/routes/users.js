const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const auth = require('../middleware/auth');
const { allowRoles, ROLES } = require('../middleware/rbac');
const router = express.Router();

const ADMINS = [ROLES.SUPER_ADMIN, ROLES.ADMIN];

// GET /api/users/roles/list — must be before /:id to avoid route conflict
router.get('/roles/list', auth, allowRoles(...ADMINS), async (req, res) => {
    try {
        let rows;
        if (req.user.role === ROLES.SUPER_ADMIN) {
            // Super Admin sees ALL roles
            [rows] = await db.query('SELECT id, name FROM roles ORDER BY id');
        } else {
            // Admin cannot create super_admin or another admin
            [rows] = await db.query(
                "SELECT id, name FROM roles WHERE name NOT IN ('super_admin','admin') ORDER BY id"
            );
        }
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Server error.' });
    }
});


router.get('/', auth, async (req, res) => {
    try {
        let rows;
        if (ADMINS.includes(req.user.role) || req.user.role === ROLES.SALES_OFFICER) {
            // Admin sees all; sales_officer sees only their assigned salespersons
            const whereClause = req.user.role === ROLES.SALES_OFFICER
                ? 'WHERE u.manager_id = ?' : '';
            const params = req.user.role === ROLES.SALES_OFFICER ? [req.user.id] : [];

            [rows] = await db.query(
                `SELECT u.id, u.name, u.email, u.phone, u.is_active, u.manager_id, u.created_at,
                r.name AS role,
                mgr.name AS manager_name
         FROM users u
         JOIN roles r ON u.role_id = r.id
         LEFT JOIN users mgr ON u.manager_id = mgr.id
         ${whereClause}
         ORDER BY r.name, u.name`,
                params
            );
        } else {
            return res.status(403).json({ error: 'Access denied.' });
        }
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error.' });
    }
});

// GET /api/users/:id
router.get('/:id', auth, allowRoles(...ADMINS, ROLES.SALES_OFFICER), async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT u.id, u.name, u.email, u.phone, u.is_active, u.manager_id, u.created_at,
              r.name AS role
       FROM users u JOIN roles r ON u.role_id = r.id
       WHERE u.id = ?`,
            [req.params.id]
        );
        if (!rows.length) return res.status(404).json({ error: 'User not found.' });
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Server error.' });
    }
});

// POST /api/users — create user
router.post('/', auth, allowRoles(...ADMINS), async (req, res) => {
    try {
        const { name, email, phone, password, role_id, manager_id } = req.body;
        if (!name || !email || !password || !role_id) {
            return res.status(400).json({ error: 'name, email, password, role_id are required.' });
        }

        // Regular admin cannot create super_admin or admin accounts
        if (req.user.role === ROLES.ADMIN) {
            const [roleRow] = await db.query('SELECT name FROM roles WHERE id = ?', [role_id]);
            if (roleRow.length && ['super_admin', 'admin'].includes(roleRow[0].name)) {
                return res.status(403).json({ error: 'Admin cannot create Super Admin or Admin accounts.' });
            }
        }

        const hashedPw = await bcrypt.hash(password, 10);
        const [result] = await db.query(
            `INSERT INTO users (name, email, phone, password, role_id, manager_id, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [name, email.toLowerCase(), phone || null, hashedPw, role_id,
                manager_id || null, req.user.id]
        );
        res.status(201).json({ id: result.insertId, message: 'User created successfully.' });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'Email already exists.' });
        }
        console.error(err);
        res.status(500).json({ error: 'Server error.' });
    }
});

// PATCH /api/users/:id — update user
router.patch('/:id', auth, allowRoles(...ADMINS), async (req, res) => {
    try {
        const { name, phone, role_id, manager_id, is_active, password } = req.body;
        const updates = {};
        if (name !== undefined) updates.name = name;
        if (phone !== undefined) updates.phone = phone;
        if (role_id !== undefined) updates.role_id = role_id;
        if (manager_id !== undefined) updates.manager_id = manager_id;
        if (is_active !== undefined) updates.is_active = is_active;
        if (password) updates.password = await bcrypt.hash(password, 10);

        if (!Object.keys(updates).length) {
            return res.status(400).json({ error: 'No fields to update.' });
        }

        const setClauses = Object.keys(updates).map(k => `${k} = ?`).join(', ');
        const values = [...Object.values(updates), req.params.id];
        await db.query(`UPDATE users SET ${setClauses} WHERE id = ?`, values);
        res.json({ message: 'User updated successfully.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error.' });
    }
});

// GET /api/users/:id/areas — Get assigned areas for a user
router.get('/:id/areas', auth, allowRoles(...ADMINS, ROLES.SALES_OFFICER), async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT a.id, a.name 
             FROM user_areas ua 
             JOIN areas a ON ua.area_id = a.id 
             WHERE ua.user_id = ?`,
            [req.params.id]
        );
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error.' });
    }
});

// PUT /api/users/:id/areas — Assign areas to a user
router.put('/:id/areas', auth, allowRoles(...ADMINS), async (req, res) => {
    const connection = await db.getConnection();
    try {
        const { area_ids } = req.body;
        if (!Array.isArray(area_ids)) {
            return res.status(400).json({ error: 'area_ids must be an array.' });
        }

        await connection.beginTransaction();

        await connection.query('DELETE FROM user_areas WHERE user_id = ?', [req.params.id]);

        if (area_ids.length > 0) {
            const values = area_ids.map(areaId => [req.params.id, areaId]);
            await connection.query(
                'INSERT INTO user_areas (user_id, area_id) VALUES ?',
                [values]
            );
        }

        await connection.commit();
        res.json({ message: 'Areas assigned successfully.' });
    } catch (err) {
        await connection.rollback();
        console.error(err);
        res.status(500).json({ error: 'Server error.' });
    } finally {
        connection.release();
    }
});

module.exports = router;

