const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');
const { allowRoles, ROLES } = require('../middleware/rbac');

/**
 * GET /api/manufacturing/logs
 * Fetch all internal production logs
 */
router.get('/logs', auth, allowRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.STORE_INCHARGE, ROLES.PROCUREMENT, ROLES.MANUFACTURING_MANAGER), async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT ipl.*, rm.name as material_name, u.name as creator_name
            FROM internal_production_logs ipl
            JOIN raw_materials rm ON ipl.material_id = rm.id
            JOIN users u ON ipl.created_by = u.id
            ORDER BY ipl.created_at DESC
        `);
        res.json(rows);
    } catch (error) {
        console.error('Error fetching manufacturing logs:', error);
        res.status(500).json({ error: 'Failed to fetch logs' });
    }
});

/**
 * POST /api/manufacturing/record
 * Record internal production of raw materials (PENDING approval)
 */
router.post('/record', auth, allowRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANUFACTURING_MANAGER), async (req, res) => {
    const { material_id, quantity, batch_number, production_date, notes } = req.body;

    if (!material_id || !quantity || !production_date) {
        return res.status(400).json({ error: 'Material, quantity, and date are required' });
    }

    try {
        // Log production as PENDING, don't update stock yet
        const [result] = await db.query(`
            INSERT INTO internal_production_logs (material_id, quantity, batch_number, production_date, created_by, notes, status)
            VALUES (?, ?, ?, ?, ?, ?, 'PENDING')
        `, [material_id, quantity, batch_number, production_date, req.user.id, notes]);

        res.json({ success: true, logId: result.insertId, message: 'Production recorded and awaiting store approval' });
    } catch (error) {
        console.error('Error recording production:', error);
        res.status(500).json({ error: 'Failed to record production' });
    }
});

/**
 * PATCH /api/manufacturing/logs/:id/status
 * Approve or Reject production log (Updates Stock on approval)
 */
router.patch('/logs/:id/status', auth, allowRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.STORE_INCHARGE), async (req, res) => {
    const { id } = req.params;
    const { status, remark } = req.body;

    if (!['APPROVED', 'REJECTED'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Get log details
        const [logs] = await connection.query('SELECT * FROM internal_production_logs WHERE id = ?', [id]);
        if (logs.length === 0) throw new Error('Log not found');
        const log = logs[0];

        if (log.status !== 'PENDING') {
            throw new Error('This record has already been processed');
        }

        // 2. Update log status
        await connection.query(`
            UPDATE internal_production_logs 
            SET status = ?, approved_by = ?, approval_date = NOW(), remark = ?
            WHERE id = ?
        `, [status, req.user.id, remark, id]);

        // 3. Update stock only if APPROVED
        if (status === 'APPROVED') {
            await connection.query(`
                UPDATE raw_materials 
                SET qty_on_hand = qty_on_hand + ? 
                WHERE id = ?
            `, [log.quantity, log.material_id]);
        }

        await connection.commit();
        res.json({ success: true, message: `Production record ${status.toLowerCase()} successfully` });
    } catch (error) {
        await connection.rollback();
        console.error('Error updating production status:', error);
        res.status(500).json({ error: error.message || 'Failed to update status' });
    } finally {
        connection.release();
    }
});

module.exports = router;
