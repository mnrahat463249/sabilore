const https = require('https');
const pool = require('../config/db');


function httpRequest(url, { method = 'GET', headers = {}, body = null } = {}) {
    return new Promise((resolve, reject) => {
        const parsed = new URL(url);
        const options = {
            hostname: parsed.hostname,
            port: parsed.port || 443,
            path: parsed.pathname + parsed.search,
            method,
            headers: { 'Content-Type': 'application/json', ...headers }
        };
        const req = https.request(options, (res) => {
            let raw = '';
            res.on('data', chunk => raw += chunk);
            res.on('end', () => {
                try { resolve(JSON.parse(raw)); }
                catch { resolve(raw); }
            });
        });
        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

class PaymentGatewayService {
    async getSettings() {
        const [rows] = await pool.execute('SELECT setting_key, setting_value FROM settings');
        const settings = {};
        rows.forEach(row => { settings[row.setting_key] = row.setting_value; });
        return settings;
    }

    
    
    
    async getBkashToken(settings) {
        const isSandbox = settings.bkash_is_sandbox === 'true';
        const baseUrl = isSandbox ? 'https://tokenized.sandbox.bka.sh/v1.2.0-beta' : 'https://tokenized.pay.bka.sh/v1.2.0-beta';

        try {
            const data = await httpRequest(`${baseUrl}/tokenized/checkout/token/grant`, {
                method: 'POST',
                headers: {
                    'username': settings.bkash_username,
                    'password': settings.bkash_password
                },
                body: { app_key: settings.bkash_app_key, app_secret: settings.bkash_app_secret }
            });
            return { token: data.id_token, baseUrl };
        } catch (error) {
            console.error('bKash Token Error:', error.response?.data || error.message);
            throw new Error('Failed to connect to bKash', { cause: error });
        }
    }

    async createBkashPayment(orderInfo) {
        const settings = await this.getSettings();
        const { token, baseUrl } = await this.getBkashToken(settings);

        try {
            const data = await httpRequest(`${baseUrl}/tokenized/checkout/create`, {
                method: 'POST',
                headers: {
                    'Authorization': token,
                    'X-APP-Key': settings.bkash_app_key
                },
                body: {
                    mode: '0011',
                    payerReference: orderInfo.payerReference || '1',
                    callbackURL: orderInfo.callbackURL,
                    amount: orderInfo.amount,
                    currency: 'BDT',
                    intent: 'sale',
                    merchantInvoiceNumber: orderInfo.invoiceNumber
                }
            });
            return data;
        } catch (error) {
            console.error('bKash Create Payment Error:', error.response?.data || error.message);
            throw new Error('Failed to create bKash payment', { cause: error });
        }
    }

    async executeBkashPayment(paymentID) {
        const settings = await this.getSettings();
        const { token, baseUrl } = await this.getBkashToken(settings);

        try {
            const data = await httpRequest(`${baseUrl}/tokenized/checkout/execute`, {
                method: 'POST',
                headers: {
                    'Authorization': token,
                    'X-APP-Key': settings.bkash_app_key
                },
                body: { paymentID }
            });
            return data;
        } catch (error) {
            console.error('bKash Execute Payment Error:', error.response?.data || error.message);
            throw new Error('Failed to execute bKash payment', { cause: error });
        }
    }

    
    
    
    
    
    async initNagadPayment(orderInfo) {
        const settings = await this.getSettings();
        const isSandbox = settings.nagad_is_sandbox === 'true';
        const baseUrl = isSandbox ? 'https://sandbox.mynagad.com/api/dfs' : 'https://api.mynagad.com/api/dfs';

        
        
        

        

        
        
        return {
            paymentUrl: `${baseUrl}/check-out/12345/mock-session`,
            orderId: orderInfo.invoiceNumber
        };
    }

    async verifyNagadPayment(paymentRefId) {
        const settings = await this.getSettings();
        const isSandbox = settings.nagad_is_sandbox === 'true';
        const baseUrl = isSandbox ? 'https://sandbox.mynagad.com/api/dfs' : 'https://api.mynagad.com/api/dfs';

        try {
            const data = await httpRequest(`${baseUrl}/verify/payment/${paymentRefId}`);
            return data;
        } catch (error) {
            console.error('Nagad Verify Error:', error.message);
            throw new Error('Failed to verify Nagad payment', { cause: error });
        }
    }

    
    
    
    async createEBLSession(orderInfo) {
        const settings = await this.getSettings();
        const isSandbox = settings.ebl_is_sandbox === 'true';
        
        const baseUrl = isSandbox ? 'https://ebl.test.gateway' : 'https://ebl.live.gateway';

        try {
            
            
            
            return {
                sessionId: 'SESSION0001',
                paymentUrl: `${baseUrl}/checkout?session=SESSION0001&order=${orderInfo.invoiceNumber}`
            };
        } catch (error) {
            console.error('EBL Session Error:', error.message);
            throw new Error('Failed to create EBL session', { cause: error });
        }
    }

}

module.exports = new PaymentGatewayService();
