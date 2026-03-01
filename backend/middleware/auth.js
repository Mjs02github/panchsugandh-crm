const jwt = require('jsonwebtoken');

/**
 * Verifies JWT token attached to Authorization header.
 * Attaches decoded user payload to req.user.
 */
module.exports = function auth(req, res, next) {
    const header = req.headers['authorization'];
    if (!header || !header.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided. Please login.' });
    }

    const token = header.split(' ')[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // { id, role, managerId, name }
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired token. Please login again.' });
    }
};
