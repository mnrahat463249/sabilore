const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    try {
        const token = req.header('Authorization');
        if (!token) {
            return res.status(401).json({ message: "No token, authorization denied" });
        }

        const decoded = jwt.verify(token.replace('Bearer ', ''), process.env.JWT_SECRET);

        if (decoded.role !== 'admin') {
            return res.status(403).json({ message: "Access denied. Admin privileges required." });
        }

        req.user = decoded;
        next();
    } catch (error) {
        console.error('[ADMIN-AUTH] Verification failed:', error.message);
        res.status(401).json({ message: "Token is not valid" });
    }
};
