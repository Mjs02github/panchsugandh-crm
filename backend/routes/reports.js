const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');
const { allowRoles, ROLES } = require('../middleware/rbac');
const ExcelJS = require('exceljs');
const router = express.Router();

const REPORT_ROLES = [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.SALES_OFFICER, ROLES.SALESPERSON];

// Helper: Build role-based WHERE clause for orders
function buildRoleFilter(user) {
    const conditions = [];
    const params = [];

    if (user.role === ROLES.SALESPERSON) {
        // Salesperson ONLY sees their own data
        conditions.push('so.salesperson_id = ?');
        params.push(user.id);
    } else if (user.role === ROLES.SALES_OFFICER) {
        // Sales Officer sees their team's data
        conditions.push('u.manager_id = ?');
        params.push(user.id);
    }
    // Admin / Super Admin => no filter (see all)

    return { conditions, params };
}

// Helper: Get date range params
function getDateRange(query) {
    const from = query.from || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
    const to = query.to || new Date().toISOString().slice(0, 10);
    return { from, to };
}

// Helper: Style Excel worksheet header row
function styleHeaderRow(worksheet, headerRow) {
    headerRow.eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E79' } };
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = {
            top: { style: 'thin' }, left: { style: 'thin' },
            bottom: { style: 'thin' }, right: { style: 'thin' }
        };
    });
    headerRow.height = 22;
}

// Helper: Send Excel file
async function sendExcel(res, workbook, filename) {
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    await workbook.xlsx.write(res);
    res.end();
}

// ─────────────────────────────────────────────────────────
// GET /api/reports/master
// ─────────────────────────────────────────────────────────
router.get('/master', auth, allowRoles(...REPORT_ROLES), async (req, res) => {
    try {
        const { from, to } = getDateRange(req.query);
        const { conditions, params } = buildRoleFilter(req.user);

        conditions.push('so.order_date BETWEEN ? AND ?');
        params.push(from, to);
        conditions.push("so.status NOT IN ('CANCELLED')");

        const where = 'WHERE ' + conditions.join(' AND ');

        const [rows] = await db.query(
            `SELECT 
                DATE_FORMAT(so.order_date, '%Y-%m-%d') AS Date,
                so.order_number AS 'Order No',
                u.name AS Salesman,
                a.name AS Area,
                r.firm_name AS Party,
                p.name AS Product,
                p.category AS Category,
                oi.qty_ordered AS Qty,
                oi.unit_price AS 'Unit Price',
                oi.gst_rate AS 'GST%',
                oi.line_amount AS 'Line Amount',
                so.discount AS Discount,
                so.gst_amount AS 'Total Tax',
                so.total_amount AS 'Final Amount',
                so.status AS Status
            FROM sales_orders so
            JOIN users u ON so.salesperson_id = u.id
            JOIN retailers r ON so.retailer_id = r.id
            LEFT JOIN areas a ON r.area_id = a.id
            JOIN order_items oi ON oi.order_id = so.id
            JOIN products p ON oi.product_id = p.id
            ${where}
            ORDER BY so.order_date DESC, so.order_number`,
            params
        );

        if (req.query.format === 'excel') {
            const workbook = new ExcelJS.Workbook();
            workbook.creator = 'Panchsugandh CRM';
            const sheet = workbook.addWorksheet('Master Report');
            if (rows.length > 0) {
                sheet.columns = Object.keys(rows[0]).map(key => ({ header: key, key, width: 20 }));
                styleHeaderRow(sheet, sheet.getRow(1));
                rows.forEach(row => { const r = sheet.addRow(Object.values(row)); r.height = 18; });
            }
            return sendExcel(res, workbook, `Master_Report_${from}_to_${to}.xlsx`);
        }
        res.json({ data: rows, from, to });
    } catch (err) {
        console.error('Master report error:', err);
        res.status(500).json({ error: 'Server error.' });
    }
});

// ─────────────────────────────────────────────────────────
// GET /api/reports/product-wise
// ─────────────────────────────────────────────────────────
router.get('/product-wise', auth, allowRoles(...REPORT_ROLES), async (req, res) => {
    try {
        const { from, to } = getDateRange(req.query);
        const { conditions, params } = buildRoleFilter(req.user);

        conditions.push('so.order_date BETWEEN ? AND ?');
        params.push(from, to);
        conditions.push("so.status NOT IN ('CANCELLED')");

        const where = 'WHERE ' + conditions.join(' AND ');

        const [rows] = await db.query(
            `SELECT 
                p.name AS Product,
                p.category AS Category,
                p.unit AS Unit,
                SUM(oi.qty_ordered) AS 'Total Qty',
                ROUND(SUM(oi.line_amount), 2) AS 'Total Amount'
            FROM sales_orders so
            JOIN users u ON so.salesperson_id = u.id
            JOIN order_items oi ON oi.order_id = so.id
            JOIN products p ON oi.product_id = p.id
            ${where}
            GROUP BY p.id, p.name, p.category, p.unit
            ORDER BY SUM(oi.line_amount) DESC`,
            params
        );

        if (req.query.format === 'excel') {
            const workbook = new ExcelJS.Workbook();
            const sheet = workbook.addWorksheet('Product-wise Report');
            if (rows.length > 0) {
                sheet.columns = Object.keys(rows[0]).map(key => ({ header: key, key, width: 22 }));
                styleHeaderRow(sheet, sheet.getRow(1));
                rows.forEach(row => { sheet.addRow(Object.values(row)).height = 18; });
            }
            return sendExcel(res, workbook, `Product_Report_${from}_to_${to}.xlsx`);
        }
        res.json({ data: rows, from, to });
    } catch (err) {
        console.error('Product report error:', err);
        res.status(500).json({ error: 'Server error.' });
    }
});

// ─────────────────────────────────────────────────────────
// GET /api/reports/party-wise
// ─────────────────────────────────────────────────────────
router.get('/party-wise', auth, allowRoles(...REPORT_ROLES), async (req, res) => {
    try {
        const { from, to } = getDateRange(req.query);
        const { conditions, params } = buildRoleFilter(req.user);

        conditions.push('so.order_date BETWEEN ? AND ?');
        params.push(from, to);
        conditions.push("so.status NOT IN ('CANCELLED')");

        const where = 'WHERE ' + conditions.join(' AND ');

        const [rows] = await db.query(
            `SELECT 
                r.firm_name AS Party,
                r.phone AS Phone,
                a.name AS Area,
                COUNT(DISTINCT so.id) AS 'Total Orders',
                ROUND(SUM(so.total_amount), 2) AS 'Total Amount'
            FROM sales_orders so
            JOIN users u ON so.salesperson_id = u.id
            JOIN retailers r ON so.retailer_id = r.id
            LEFT JOIN areas a ON r.area_id = a.id
            ${where}
            GROUP BY r.id, r.firm_name, r.phone, a.name
            ORDER BY SUM(so.total_amount) DESC`,
            params
        );

        if (req.query.format === 'excel') {
            const workbook = new ExcelJS.Workbook();
            const sheet = workbook.addWorksheet('Party-wise Report');
            if (rows.length > 0) {
                sheet.columns = Object.keys(rows[0]).map(key => ({ header: key, key, width: 22 }));
                styleHeaderRow(sheet, sheet.getRow(1));
                rows.forEach(row => { sheet.addRow(Object.values(row)).height = 18; });
            }
            return sendExcel(res, workbook, `Party_Report_${from}_to_${to}.xlsx`);
        }
        res.json({ data: rows, from, to });
    } catch (err) {
        console.error('Party report error:', err);
        res.status(500).json({ error: 'Server error.' });
    }
});

// ─────────────────────────────────────────────────────────
// GET /api/reports/date-wise
// ─────────────────────────────────────────────────────────
router.get('/date-wise', auth, allowRoles(...REPORT_ROLES), async (req, res) => {
    try {
        const { from, to } = getDateRange(req.query);
        const { conditions, params } = buildRoleFilter(req.user);

        conditions.push('so.order_date BETWEEN ? AND ?');
        params.push(from, to);
        conditions.push("so.status NOT IN ('CANCELLED')");

        const where = 'WHERE ' + conditions.join(' AND ');

        const [rows] = await db.query(
            `SELECT 
                so.order_date AS Date,
                COUNT(DISTINCT so.id) AS Orders,
                COUNT(oi.id) AS Items,
                ROUND(SUM(so.total_amount), 2) AS 'Total Amount'
            FROM sales_orders so
            JOIN users u ON so.salesperson_id = u.id
            JOIN order_items oi ON oi.order_id = so.id
            ${where}
            GROUP BY so.order_date
            ORDER BY so.order_date DESC`,
            params
        );

        if (req.query.format === 'excel') {
            const workbook = new ExcelJS.Workbook();
            const sheet = workbook.addWorksheet('Date-wise Report');
            if (rows.length > 0) {
                sheet.columns = Object.keys(rows[0]).map(key => ({ header: key, key, width: 20 }));
                styleHeaderRow(sheet, sheet.getRow(1));
                rows.forEach(row => { sheet.addRow(Object.values(row)).height = 18; });
            }
            return sendExcel(res, workbook, `Date_Report_${from}_to_${to}.xlsx`);
        }
        res.json({ data: rows, from, to });
    } catch (err) {
        console.error('Date report error:', err);
        res.status(500).json({ error: 'Server error.' });
    }
});

// ─────────────────────────────────────────────────────────
// GET /api/reports/salesman-wise
// ─────────────────────────────────────────────────────────
router.get('/salesman-wise', auth, allowRoles(...REPORT_ROLES), async (req, res) => {
    try {
        const { from, to } = getDateRange(req.query);
        const { conditions, params } = buildRoleFilter(req.user);

        conditions.push('so.order_date BETWEEN ? AND ?');
        params.push(from, to);
        conditions.push("so.status NOT IN ('CANCELLED')");

        const where = 'WHERE ' + conditions.join(' AND ');

        const [rows] = await db.query(
            `SELECT 
                u.name AS Salesman,
                COUNT(DISTINCT so.id) AS Orders,
                COUNT(DISTINCT so.retailer_id) AS 'Unique Parties',
                ROUND(SUM(so.total_amount), 2) AS 'Total Amount'
            FROM sales_orders so
            JOIN users u ON so.salesperson_id = u.id
            ${where}
            GROUP BY u.id, u.name
            ORDER BY SUM(so.total_amount) DESC`,
            params
        );

        if (req.query.format === 'excel') {
            const workbook = new ExcelJS.Workbook();
            const sheet = workbook.addWorksheet('Salesman-wise Report');
            if (rows.length > 0) {
                sheet.columns = Object.keys(rows[0]).map(key => ({ header: key, key, width: 22 }));
                styleHeaderRow(sheet, sheet.getRow(1));
                rows.forEach(row => { sheet.addRow(Object.values(row)).height = 18; });
            }
            return sendExcel(res, workbook, `Salesman_Report_${from}_to_${to}.xlsx`);
        }
        res.json({ data: rows, from, to });
    } catch (err) {
        console.error('Salesman report error:', err);
        res.status(500).json({ error: 'Server error.' });
    }
});

// ─────────────────────────────────────────────────────────
// GET /api/reports/attendance
// ─────────────────────────────────────────────────────────
router.get('/attendance', auth, allowRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.SALES_OFFICER), async (req, res) => {
    try {
        const { from, to } = getDateRange(req.query);

        // Sales officer sees only their team
        let userFilter = '';
        const params = [from, to];
        if (req.user.role === ROLES.SALES_OFFICER) {
            userFilter = 'AND u.manager_id = ?';
            params.push(req.user.id);
        }

        const [rows] = await db.query(
            `SELECT
                DATE_FORMAT(a.date, '%Y-%m-%d') AS Date,
                u.name AS Salesman,
                ro.name AS Role,
                TIME_FORMAT(a.punch_in_time, '%H:%i') AS 'Punch In',
                TIME_FORMAT(a.punch_out_time, '%H:%i') AS 'Punch Out',
                CASE
                    WHEN a.punch_out_time IS NOT NULL
                    THEN CONCAT(
                        FLOOR(TIMESTAMPDIFF(MINUTE, a.punch_in_time, a.punch_out_time) / 60), 'h ',
                        MOD(TIMESTAMPDIFF(MINUTE, a.punch_in_time, a.punch_out_time), 60), 'm'
                    )
                    ELSE 'Still In'
                END AS 'Hours Worked',
                CASE WHEN a.punch_out_time IS NOT NULL THEN 'Present' ELSE 'In-Office' END AS Status
            FROM attendance a
            JOIN users u ON a.user_id = u.id
            JOIN roles ro ON u.role_id = ro.id
            WHERE a.date BETWEEN ? AND ?
                ${userFilter}
            ORDER BY a.date DESC, u.name`,
            params
        );

        if (req.query.format === 'excel') {
            const workbook = new ExcelJS.Workbook();
            workbook.creator = 'Panchsugandh CRM';
            const sheet = workbook.addWorksheet('Attendance Report');
            if (rows.length > 0) {
                sheet.columns = Object.keys(rows[0]).map(key => ({ header: key, key, width: 22 }));
                styleHeaderRow(sheet, sheet.getRow(1));
                rows.forEach(row => { sheet.addRow(Object.values(row)).height = 18; });
            }
            return sendExcel(res, workbook, `Attendance_Report_${from}_to_${to}.xlsx`);
        }
        res.json({ data: rows, from, to });
    } catch (err) {
        console.error('Attendance report error:', err);
        res.status(500).json({ error: 'Server error.' });
    }
});

// ─────────────────────────────────────────────────────────
// GET /api/reports/raw-material-mis
// ─────────────────────────────────────────────────────────
router.get('/raw-material-mis', auth, allowRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.STORE_INCHARGE), async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT 
                rm.name AS 'Material Name',
                rm.sku AS SKU,
                rm.unit AS Unit,
                rm.qty_on_hand AS 'Current Stock',
                rm.min_stock AS 'Min Stock',
                (SELECT SUM(quantity) FROM raw_material_logs WHERE material_id = rm.id AND received_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)) AS 'Received (30d)',
                CASE WHEN rm.qty_on_hand <= rm.min_stock THEN 'LOW' ELSE 'OK' END AS Status
            FROM raw_materials rm
            ORDER BY rm.name ASC`
        );

        if (req.query.format === 'excel') {
            const workbook = new ExcelJS.Workbook();
            const sheet = workbook.addWorksheet('Raw Material MIS');
            if (rows.length > 0) {
                sheet.columns = Object.keys(rows[0]).map(key => ({ header: key, key, width: 22 }));
                styleHeaderRow(sheet, sheet.getRow(1));
                rows.forEach(row => { sheet.addRow(Object.values(row)).height = 18; });
            }
            return sendExcel(res, workbook, `Raw_Material_MIS_${new Date().toISOString().slice(0, 10)}.xlsx`);
        }
        res.json({ data: rows });
    } catch (err) {
        console.error('RM MIS report error:', err);
        res.status(500).json({ error: 'Server error.' });
    }
});

// ─────────────────────────────────────────────────────────
// GET /api/reports/product-sales-batch-wise
// ─────────────────────────────────────────────────────────
router.get('/product-sales-batch-wise', auth, allowRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.STORE_INCHARGE, ROLES.BILL_OPERATOR), async (req, res) => {
    try {
        const { from, to } = getDateRange(req.query);
        const [rows] = await db.query(
            `SELECT 
                p.name AS Product,
                oi.batch_number AS 'Batch No',
                oi.mrp AS MRP,
                SUM(COALESCE(oi.qty_billed, oi.qty_ordered)) AS 'Qty Sold',
                ROUND(SUM(oi.line_amount), 2) AS 'Sales Amount'
            FROM order_items oi
            JOIN sales_orders so ON oi.order_id = so.id
            JOIN products p ON oi.product_id = p.id
            WHERE so.order_date BETWEEN ? AND ? AND so.status NOT IN ('CANCELLED')
            GROUP BY p.id, oi.batch_number, oi.mrp
            ORDER BY p.name ASC, oi.batch_number ASC`,
            [from, to]
        );

        if (req.query.format === 'excel') {
            const workbook = new ExcelJS.Workbook();
            const sheet = workbook.addWorksheet('Batch-wise Sales');
            if (rows.length > 0) {
                sheet.columns = Object.keys(rows[0]).map(key => ({ header: key, key, width: 22 }));
                styleHeaderRow(sheet, sheet.getRow(1));
                rows.forEach(row => { sheet.addRow(Object.values(row)).height = 18; });
            }
            return sendExcel(res, workbook, `Batch_Sales_${from}_to_${to}.xlsx`);
        }
        res.json({ data: rows, from, to });
    } catch (err) {
        console.error('Batch sales report error:', err);
        res.status(500).json({ error: 'Server error.' });
    }
});

// ─────────────────────────────────────────────────────────
// GET /api/reports/hsn-wise
// ─────────────────────────────────────────────────────────
router.get('/hsn-wise', auth, allowRoles(...REPORT_ROLES), async (req, res) => {
    try {
        const { from, to } = getDateRange(req.query);
        const { conditions, params } = buildRoleFilter(req.user);

        conditions.push('so.order_date BETWEEN ? AND ?');
        params.push(from, to);
        conditions.push("so.status NOT IN ('CANCELLED')");

        const where = 'WHERE ' + conditions.join(' AND ');

        const [rows] = await db.query(
            `SELECT 
                p.hsn_code AS 'HSN Code',
                p.category AS Category,
                p.unit AS Unit,
                SUM(COALESCE(oi.qty_billed, oi.qty_ordered)) AS 'Total Qty',
                ROUND(SUM(oi.line_amount / (1 + oi.gst_rate/100)), 2) AS 'Taxable Value',
                ROUND(SUM(oi.line_amount - (oi.line_amount / (1 + oi.gst_rate/100))), 2) AS 'GST Amount',
                ROUND(SUM(oi.line_amount), 2) AS 'Total Amount'
            FROM sales_orders so
            JOIN order_items oi ON oi.order_id = so.id
            JOIN products p ON oi.product_id = p.id
            JOIN users u ON so.salesperson_id = u.id
            ${where}
            GROUP BY p.hsn_code, p.category, p.unit
            ORDER BY p.hsn_code ASC`,
            params
        );

        if (req.query.format === 'excel') {
            const workbook = new ExcelJS.Workbook();
            const sheet = workbook.addWorksheet('HSN Summary');
            if (rows.length > 0) {
                sheet.columns = Object.keys(rows[0]).map(key => ({ header: key, key, width: 22 }));
                styleHeaderRow(sheet, sheet.getRow(1));
                rows.forEach(row => { sheet.addRow(Object.values(row)).height = 18; });
            }
            return sendExcel(res, workbook, `HSN_Summary_${from}_to_${to}.xlsx`);
        }
        res.json({ data: rows, from, to });
    } catch (err) {
        console.error('HSN report error:', err);
        res.status(500).json({ error: 'Server error.' });
    }
});

// ─────────────────────────────────────────────────────────
// GET /api/reports/gst-data
// ─────────────────────────────────────────────────────────
router.get('/gst-data', auth, allowRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.BILL_OPERATOR), async (req, res) => {
    try {
        const { from, to } = getDateRange(req.query);
        const [rows] = await db.query(
            `SELECT 
                so.bill_number AS 'Invoice No',
                DATE_FORMAT(so.bill_date, '%Y-%m-%d') AS 'Invoice Date',
                r.firm_name AS 'Party Name',
                r.gst_number AS 'Party GSTIN',
                a.name AS 'Area',
                ROUND(SUM(oi.line_amount / (1 + oi.gst_rate/100)), 2) AS 'Taxable Value',
                ROUND(SUM(oi.line_amount - (oi.line_amount / (1 + oi.gst_rate/100))), 2) AS 'GST Amount',
                ROUND(SUM(oi.line_amount), 2) AS 'Invoice Value'
            FROM sales_orders so
            JOIN retailers r ON so.retailer_id = r.id
            LEFT JOIN areas a ON r.area_id = a.id
            JOIN order_items oi ON oi.order_id = so.id
            WHERE so.bill_date BETWEEN ? AND ? AND so.status NOT IN ('CANCELLED')
            GROUP BY so.id
            ORDER BY so.bill_date ASC, so.bill_number ASC`,
            [from, to]
        );

        if (req.query.format === 'excel') {
            const workbook = new ExcelJS.Workbook();
            const sheet = workbook.addWorksheet('GST Data');
            if (rows.length > 0) {
                sheet.columns = Object.keys(rows[0]).map(key => ({ header: key, key, width: 22 }));
                styleHeaderRow(sheet, sheet.getRow(1));
                rows.forEach(row => { sheet.addRow(Object.values(row)).height = 18; });
            }
            return sendExcel(res, workbook, `GST_Data_${from}_to_${to}.xlsx`);
        }

        res.json({ data: rows, from, to });
    } catch (err) {
        console.error('GST data export error:', err);
        res.status(500).json({ error: 'Server error.' });
    }
});

module.exports = router;
