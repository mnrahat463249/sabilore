const fs = require('fs');
const path = require('path');


class AppLogger {
    constructor() {
        this.logDir = path.join(__dirname, '..', '..', 'logs');
        if (!fs.existsSync(this.logDir)) {
            try { fs.mkdirSync(this.logDir, { recursive: true }); } catch {  }
        }
        this.errorLogFile = path.join(this.logDir, 'error.log');
    }

    _write(level, message, meta = {}) {
        const timestamp = new Date().toISOString();
        const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
        const logLine = `[${timestamp}] [${level.toUpperCase()}] ${message} ${metaStr}\n`;

        try {
            fs.appendFileSync(this.errorLogFile, logLine);
        } catch (e) {
            console.error('Failed to write to log file', e);
        }
    }

    info(message, meta) {
        
        
    }

    warn(message, meta) {
        console.warn(`[WARN] ${message}`, meta || '');
        this._write('warn', message, meta);
    }

    error(message, errorObj = null) {
        console.error(`[ERROR] ${message}`, errorObj || '');
        const meta = errorObj ? {
            message: errorObj.message,
            stack: errorObj.stack
        } : {};
        this._write('error', message, meta);
    }
}

const logger = new AppLogger();
module.exports = logger;
