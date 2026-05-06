const db = require('../config/db');
const bcrypt = require('bcryptjs');
const crypto = require('node:crypto');

class User {
    static async create(userData) {
        const { name, email, password } = userData;
        const phone = userData.phone || null;
        const address = userData.address || null;
        const city = userData.city || null;
        const password_hash = await bcrypt.hash(password, 10);

        const [result] = await db.execute(
            'INSERT INTO customers (name, email, password_hash, phone, address, city) VALUES (?, ?, ?, ?, ?, ?)',
            [name, email, password_hash, phone, address, city]
        );
        return result.insertId;
    }

    static async findByEmail(email) {
        const [rows] = await db.execute('SELECT * FROM customers WHERE email = ?', [email]);
        return rows[0];
    }

    static async findByIdentifiers(email, phone) {
        
        
        const [rows] = await db.execute(
            'SELECT * FROM customers WHERE (email = ? AND email IS NOT NULL) OR (phone = ? AND phone IS NOT NULL)',
            [email || null, phone || null]
        );
        return rows[0];
    }

    static async findById(id) {
        const [rows] = await db.execute('SELECT * FROM customers WHERE id = ?', [id]);
        return rows[0];
    }

    static async verifyPassword(user, password) {
        
        const hash = user.password_hash || user.password;
        if (!hash) {
            console.error('[AUTH] No password hash found for user:', user.email);
            return false;
        }
        return await bcrypt.compare(password, hash);
    }

    static async updatePassword(id, newPassword) {
        const password_hash = await bcrypt.hash(newPassword, 10);
        return await db.execute('UPDATE customers SET password_hash = ? WHERE id = ?', [password_hash, id]);
    }

    static async updateProfile(userId, data) {
        const { name, phone, address, city } = data;
        await db.execute(
            'UPDATE customers SET name = ?, phone = ?, address = ?, city = ? WHERE id = ?',
            [name, phone, address, city, userId]
        );
    }

    

    static async incrementLoginAttempts(userId) {
        const lockDuration = 15 * 60 * 1000; 
        const [user] = await db.execute('SELECT login_attempts FROM customers WHERE id = ?', [userId]);
        const attempts = (user[0].login_attempts || 0) + 1;

        if (attempts >= 5) {
            const lockoutUntil = new Date(Date.now() + lockDuration);
            await db.execute(
                'UPDATE customers SET login_attempts = ?, lockout_until = ? WHERE id = ?',
                [attempts, lockoutUntil, userId]
            );
            return { attempts, lockout_until: lockoutUntil };
        } else {
            await db.execute(
                'UPDATE customers SET login_attempts = ? WHERE id = ?',
                [attempts, userId]
            );
            return { attempts, lockout_until: null };
        }
    }

    static async resetLoginAttempts(userId) {
        await db.execute(
            'UPDATE customers SET login_attempts = 0, lockout_until = NULL WHERE id = ?',
            [userId]
        );
    }

    static async checkLockout(user) {
        if (user.lockout_until && new Date(user.lockout_until) > new Date()) {
            return {
                locked: true,
                until: user.lockout_until
            };
        }
        return { locked: false };
    }

    

    static async createResetToken(email) {
        
        await db.execute(
            'UPDATE password_reset_tokens SET used = 1 WHERE email = ? AND used = 0',
            [email]
        );

        
        const resetCode = crypto.randomInt(100000, 999999).toString();
        
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

        await db.execute(
            'INSERT INTO password_reset_tokens (email, token, expires_at) VALUES (?, ?, ?)',
            [email, resetCode, expiresAt]
        );

        return resetCode;
    }

    static async findByResetToken(token) {
        const [rows] = await db.execute(
            'SELECT * FROM password_reset_tokens WHERE token = ? AND used = 0 AND expires_at > NOW()',
            [token]
        );
        return rows[0];
    }

    static async markTokenUsed(tokenId) {
        return await db.execute(
            'UPDATE password_reset_tokens SET used = 1 WHERE id = ?',
            [tokenId]
        );
    }

    
    static async cleanupExpiredTokens() {
        return await db.execute(
            'DELETE FROM password_reset_tokens WHERE expires_at < NOW() OR used = 1'
        );
    }
}

module.exports = User;
