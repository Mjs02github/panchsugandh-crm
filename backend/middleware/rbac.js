/**
 * Role-Based Access Control middleware factory.
 * Usage: router.get('/path', auth, allowRoles('admin', 'super_admin'), handler)
 */
module.exports.allowRoles = function allowRoles(...roles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Not authenticated.' });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                error: `Access denied. Required role(s): ${roles.join(', ')}`,
            });
        }
        next();
    };
};

// Role constants for easy reference
module.exports.ROLES = {
    SUPER_ADMIN: 'super_admin',
    ADMIN: 'admin',
    SALES_OFFICER: 'sales_officer',
    SALESPERSON: 'salesperson',
    BILL_OPERATOR: 'bill_operator',
    DELIVERY_INCHARGE: 'delivery_incharge',
    STORE_INCHARGE: 'store_incharge',
};
