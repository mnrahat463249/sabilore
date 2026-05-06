const nodemailer = require('nodemailer');
const pool = require('../config/db');

class ContactController {
    
    static async sendMessage(req, res) {
        const { name, email, subject, message } = req.body;

        if (!name || !email || !message) {
            return res.status(400).json({ message: 'Name, email, and message are required.' });
        }

        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ message: 'Please enter a valid email address.' });
        }

        
        if (!process.env.MAIL_USER || process.env.MAIL_USER.includes('your_gmail')) {
            
            return res.json({ message: 'Message received! We will get back to you shortly.' });
        }

        try {
            
            await pool.execute(
                'INSERT INTO contact_messages (name, email, subject, message) VALUES (?, ?, ?, ?)',
                [name, email, subject || 'General Inquiry', message]
            );

            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: process.env.MAIL_USER,
                    pass: process.env.MAIL_PASS,
                },
            });

            const mailOptions = {
                from: process.env.MAIL_FROM || `SABILORÉ <${process.env.MAIL_USER}>`,
                to: process.env.MAIL_USER,
                replyTo: `"${name}" <${email}>`,
                subject: `[Sabilore Contact] ${subject || 'New Message'}`,
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="border-bottom: 2px solid #111; padding-bottom: 10px;">New Contact Form Message</h2>
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr><td style="padding: 8px 0; font-weight: bold; width: 120px;">Name:</td><td>${name}</td></tr>
                            <tr><td style="padding: 8px 0; font-weight: bold;">Email:</td><td><a href="mailto:${email}">${email}</a></td></tr>
                            <tr><td style="padding: 8px 0; font-weight: bold;">Subject:</td><td>${subject || 'General Inquiry'}</td></tr>
                        </table>
                        <h3 style="margin-top: 20px;">Message:</h3>
                        <div style="background: #f5f5f5; padding: 16px; border-left: 4px solid #111; border-radius: 4px; white-space: pre-wrap;">${message}</div>
                        <hr style="margin-top: 24px;">
                        <p style="color: #888; font-size: 12px;">This email was sent from the Sabilore.com contact form. A copy has been saved to the admin panel.</p>
                    </div>
                `,
            };

            await transporter.sendMail(mailOptions);
            res.json({ message: 'Message sent! We will get back to you within 24 hours.' });
        } catch (error) {
            console.error('[CONTACT] Error:', error.message);
            res.status(500).json({ message: 'Failed to send/save message. Please try again.' });
        }
    }

    
    static async getAllMessages(req, res) {
        try {
            const [rows] = await pool.execute('SELECT * FROM contact_messages ORDER BY created_at DESC');
            res.json(rows);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    
    static async markAsRead(req, res) {
        try {
            const { id } = req.params;
            await pool.execute("UPDATE contact_messages SET status = 'Read' WHERE id = ?", [id]);
            res.json({ message: 'Message marked as read' });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    
    static async deleteMessage(req, res) {
        try {
            const { id } = req.params;
            await pool.execute('DELETE FROM contact_messages WHERE id = ?', [id]);
            res.json({ message: 'Message deleted' });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
}

module.exports = ContactController;
