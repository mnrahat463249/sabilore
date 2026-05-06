const pool = require('../config/db');


const activityLogger = (action) => {
    return async (req, res, next) => {
        const originalSend = res.send;

        res.send = function (data) {
            
            if (res.statusCode >= 200 && res.statusCode < 300) {
                const currentUserId = req.user?.id ?? null;
                const currentUserEmail = req.user?.email ?? req.body?.email ?? 'Unknown';
                const currentIpAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
                const currentAction = action || 'Unknown Action';

                
                let currentDetails;
                if (currentAction === 'Login') {
                    currentDetails = `User ${currentUserEmail} logged in from ${currentIpAddress}`;
                } else if (req.params?.id) {
                    currentDetails = `${currentAction} performed on ID: ${req.params.id}`;
                } else {
                    currentDetails = `${currentAction} performed`;
                }

                
                pool.execute(
                    'INSERT INTO activity_logs (user_id, user_email, action, details, ip_address) VALUES (?, ?, ?, ?, ?)',
                    [currentUserId, currentUserEmail || 'Unknown', currentAction, currentDetails || '', currentIpAddress]
                ).catch(err => console.error('[LOGGER] Database error:', err.message));
            }

            res.send = originalSend;
            return res.send(data);
        };

        next();
    };
};

module.exports = activityLogger;
