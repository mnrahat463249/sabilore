const User = require('../models/User');
const Order = require('../models/Order');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const crypto = require('node:crypto');
const { serverError } = require('../utils/errorHandler');


async function sendTempPasswordEmail(toEmail, userName, tempPassword) {
    try {
        if (!process.env.MAIL_USER || process.env.MAIL_USER === 'your_gmail@gmail.com') {
            return false; 
        }

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.MAIL_USER,
                pass: process.env.MAIL_PASS
            }
        });

        
        const loginUrl = 'https://sabilore.com/login'; 

        const mailOptions = {
            from: process.env.MAIL_FROM || `SABILORÉ <${process.env.MAIL_USER}>`,
            to: toEmail,
            subject: 'SABILORÉ - Your Temporary Password',
            html: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:40px 0;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:4px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
        
        <tr><td style="background:#000;padding:32px;text-align:center;">
          <h1 style="color:#fff;margin:0;font-size:28px;font-weight:800;letter-spacing:0.15em;">SABILORÉ</h1>
        </td></tr>
        
        <tr><td style="padding:40px 40px 20px;">
          <h2 style="margin:0 0 12px;font-size:20px;color:#111;">Your Password Was Reset</h2>
          <p style="color:#555;font-size:15px;line-height:1.6;margin:0 0 28px;">
            Hello ${userName || 'there'},<br><br>
            As requested, we have generated a temporary password for your account. Please sign in using the password below.
          </p>

          
          <div style="background:#f8f8f8;border:1px dashed #ddd;border-radius:4px;padding:20px;text-align:center;margin-bottom:28px;">
            <p style="margin:0 0 8px;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.1em;">Temporary Password</p>
            <p style="margin:0;font-size:28px;font-weight:800;letter-spacing:0.15em;color:#000;">${tempPassword}</p>
          </div>
          
          
          <div style="text-align:center;margin-bottom:32px;">
            <a href="${loginUrl}" style="background:#000;color:#fff;padding:16px 32px;text-decoration:none;border-radius:4px;font-weight:700;display:inline-block;letter-spacing:0.05em;">SIGN IN NOW</a>
          </div>
          
          <p style="color:#888;font-size:13px;line-height:1.6;margin:0 0 20px;">
            For security reasons, we strongly recommend changing this password to a personal one immediately after logging in by visiting your Profile settings.
          </p>
        </td></tr>
        
        <tr><td style="background:#f8f8f8;padding:20px 40px;text-align:center;border-top:1px solid #eee;">
          <p style="margin:0;font-size:12px;color:#aaa;">© 2026 SABILORÉ. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
        };

        await transporter.sendMail(mailOptions);
        
        return true;
    } catch (err) {
        console.error('[RESET] Email send failed:', err.message);
        return false;
    }
}

exports.register = async (req, res) => {
    try {
        const { name, identifier, password, address, city } = req.body;

        if (!identifier || !password) {
            return res.status(400).json({ message: "Email or Phone and password are required" });
        }

        
        let email = null;
        let phone = null;
        if (identifier.includes('@')) {
            email = identifier;
        } else {
            phone = identifier;
        }

        
        const existingUser = await User.findByIdentifiers(email, phone);
        if (existingUser) {
            
            await Order.linkGuestOrders(email, phone, existingUser.id);
            return res.status(400).json({ message: "An account with this Email or Phone already exists. Please sign in." });
        }

        const userId = await User.create({ name, email, password, phone, address, city });

        
        await Order.linkGuestOrders(email, phone, userId);

        res.status(201).json({
            message: "User registered successfully",
            userId
        });
    } catch (error) {
        serverError(res, error, 'register');
    }
};

exports.login = async (req, res) => {
    try {
        const { identifier, email, phone, password } = req.body;

        
        let loginEmail = email;
        let loginPhone = phone;

        if (identifier) {
            
            loginEmail = identifier;
            loginPhone = identifier;
        }

        if ((!loginEmail && !loginPhone) || !password) {
            return res.status(400).json({ message: "Email or Phone and password are required" });
        }

        
        const user = await User.findByIdentifiers(loginEmail, loginPhone);
        if (!user) {
            return res.status(401).json({ message: "Invalid credentials. If you haven't registered with this Phone or Email, please create an account." });
        }

        
        const lockoutStatus = await User.checkLockout(user);
        if (lockoutStatus.locked) {
            const minutesLeft = Math.ceil((new Date(lockoutStatus.until).getTime() - Date.now()) / 60000);
            return res.status(403).json({
                message: `Account temporarily locked due to multiple failed attempts. Please try again in ${minutesLeft} minutes.`
            });
        }

        const isMatch = await User.verifyPassword(user, password);
        if (!isMatch) {
            const result = await User.incrementLoginAttempts(user.id);
            if (result.lockout_until) {
                return res.status(403).json({ message: "Too many failed attempts. Account locked for 15 minutes." });
            }

            return res.status(401).json({
                message: `Invalid password. You have ${5 - result.attempts} attempts remaining before lockout.`
            });
        }

        
        await User.resetLoginAttempts(user.id);

        
        await Order.linkGuestOrders(user.email, user.phone, user.id);

        const token = jwt.sign(
            { id: user.id, email: user.email, role: 'customer' },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone
            }
        });
    } catch (error) {
        serverError(res, error, 'login');
    }
};

exports.getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        res.json({
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            address: user.address,
            city: user.city
        });
    } catch (error) {
        serverError(res, error, 'getMe');
    }
};

exports.changePassword = async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;
        const user = await User.findById(req.user.id);

        const isMatch = await User.verifyPassword(user, oldPassword);
        if (!isMatch) {
            return res.status(400).json({ message: "Incorrect old password" });
        }

        await User.updatePassword(req.user.id, newPassword);
        res.json({ message: "Password updated successfully" });
    } catch (error) {
        serverError(res, error, 'changePassword');
    }
};

exports.updateProfile = async (req, res) => {
    try {
        const { name, phone, address, city } = req.body;
        await User.updateProfile(req.user.id, { name, phone, address, city });
        res.json({ message: "Profile updated successfully" });
    } catch (error) {
        serverError(res, error, 'updateProfile');
    }
};



exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ message: "Email is required" });
        }

        const user = await User.findByEmail(email);
        if (!user) {
            
            return res.json({ message: "If an account with that email exists, a temporary password has been sent to your inbox." });
        }

        
        const tempPassword = crypto.randomBytes(4).toString('hex'); 

        

        
        await User.updatePassword(user.id, tempPassword);

        
        const emailSent = await sendTempPasswordEmail(email, user.name, tempPassword);

        if (emailSent) {
            res.json({ 
                status: "sent",
                message: "A temporary password has been sent to your email. Please check your inbox (and spam folder) and sign in." 
            });
        } else {
            console.warn('[RESET] Email not configured. Temp password generated but not sent.');
            res.json({ 
                status: "error",
                message: "Temporary password generated but email is not configured. Please contact support." 
            });
        }
    } catch (error) {
        console.error('[RESET] Error in forgotPassword:', error.message);
        res.status(500).json({ message: "An error occurred. Please try again." });
    }
};
