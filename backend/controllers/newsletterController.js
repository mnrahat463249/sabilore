const pool = require('../config/db');

class NewsletterController {
    static async subscribe(req, res) {
        try {
            const { email } = req.body;
            if (!email || !email.includes('@')) {
                return res.status(400).json({ message: "Please provide a valid email address" });
            }

            
            const [existing] = await pool.execute('SELECT * FROM newsletter_emails WHERE email = ?', [email]);
            if (existing.length > 0) {
                return res.status(200).json({ message: "You are already subscribed to our newsletter!" });
            }

            await pool.execute('INSERT INTO newsletter_emails (email) VALUES (?)', [email]);
            res.status(201).json({ message: "Thank you for subscribing to our newsletter!" });
        } catch (error) {
            console.error('Newsletter error:', error.message);
            res.status(500).json({ message: "An error occurred. Please try again later." });
        }
    }

    static async getAll(req, res) {
        try {
            const [emails] = await pool.execute('SELECT * FROM newsletter_emails ORDER BY created_at DESC');
            res.json(emails);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    static async delete(req, res) {
        try {
            const { id } = req.params;
            await pool.execute('DELETE FROM newsletter_emails WHERE id = ?', [id]);
            res.json({ message: "Email removed from newsletter list" });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
}

module.exports = NewsletterController;
