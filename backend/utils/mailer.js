const nodemailer = require('nodemailer');

let _mailerTransport = null;


function getMailer() {
    if (!_mailerTransport && process.env.MAIL_USER && !process.env.MAIL_USER.includes('your_gmail')) {
        _mailerTransport = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.MAIL_USER,
                pass: process.env.MAIL_PASS
            }
        });
        
    }
    return _mailerTransport;
}

module.exports = { getMailer };
