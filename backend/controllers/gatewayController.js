
const pool = require('../config/db');
const paymentGatewayService = require('../services/paymentGatewayService');


const handleRedirect = (res, orderId, success, message) => {
    
    
    if (success) {
        res.redirect(`/checkout-success?orderId=${orderId}&payment=success`);
    } else {
        res.redirect(`/checkout?error=${encodeURIComponent(message)}`);
    }
};

exports.bkashCallback = async (req, res) => {
    const { paymentID, status, orderId } = req.query;

    

    if (status !== 'success') {
        if (orderId) {
            await pool.execute('UPDATE orders SET status = "Payment Failed" WHERE id = ?', [orderId]);
        }
        return handleRedirect(res, orderId, false, 'bKash payment was canceled or failed.');
    }

    try {
        
        const executeRes = await paymentGatewayService.executeBkashPayment(paymentID);

        if (executeRes && executeRes.statusCode === '0000') {
            
            await pool.execute('UPDATE orders SET status = "Processing", bkash_trx_id = ? WHERE id = ?', [executeRes.trxID, orderId]);
            return handleRedirect(res, orderId, true, 'bKash payment successful.');
        } else {
            
            const msg = executeRes ? executeRes.statusMessage : 'Execution Failed';
            await pool.execute('UPDATE orders SET status = "Payment Failed" WHERE id = ?', [orderId]);
            return handleRedirect(res, orderId, false, msg);
        }
    } catch (error) {
        console.error('bKash execution caught error:', error);
        await pool.execute('UPDATE orders SET status = "Payment Error" WHERE id = ?', [orderId]);
        return handleRedirect(res, orderId, false, 'An error occurred while verifying the bKash payment.');
    }
};

exports.nagadCallback = async (req, res) => {
    const { payment_ref_id, status, order_id } = req.query; 

    
    if (status !== 'Success' && status !== 'success') {
        if (order_id) await pool.execute('UPDATE orders SET status = "Payment Failed" WHERE id = ?', [order_id]);
        return handleRedirect(res, order_id, false, 'Nagad payment failed or was canceled.');
    }

    try {
        const verifyRes = await paymentGatewayService.verifyNagadPayment(payment_ref_id);

        if (verifyRes && verifyRes.status === 'Success') {
            await pool.execute('UPDATE orders SET status = "Processing", bkash_trx_id = ? WHERE id = ?', [payment_ref_id, order_id]);
            return handleRedirect(res, order_id, true, 'Nagad payment successful.');
        } else {
            await pool.execute('UPDATE orders SET status = "Payment Failed" WHERE id = ?', [order_id]);
            return handleRedirect(res, order_id, false, 'Nagad payment verification failed.');
        }
    } catch (error) {
        console.error('[Nagad Callback Error]:', error);
        if (order_id) await pool.execute('UPDATE orders SET status = "Payment Error" WHERE id = ?', [order_id]);
        return handleRedirect(res, order_id, false, 'Error verifying Nagad payment.');
    }
};

exports.eblCallback = async (req, res) => {
    
    const { 'resultIndicator': resultIndicator, 'session.id': sessionId, orderId } = req.body || req.query;

    if (!resultIndicator) {
        return handleRedirect(res, orderId, false, 'EBL payment canceled or failed without result.');
    }

    
    
    try {
        await pool.execute('UPDATE orders SET status = "Processing", bkash_trx_id = ? WHERE id = ?', [sessionId, orderId]);
        return handleRedirect(res, orderId, true, 'EBL payment successful.');
    } catch (error) {
        console.error('[EBL Callback Error]:', error);
        return handleRedirect(res, orderId, false, 'Error processing EBL callback.');
    }
};
