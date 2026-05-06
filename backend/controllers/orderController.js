const Order = require('../models/Order');
const pool = require('../config/db');
const { getMailer } = require('../utils/mailer');
const paymentGatewayService = require('../services/paymentGatewayService');
const { serverError } = require('../utils/errorHandler');


function calcDeliveryFee(city = '', location = '') {
    const isDhaka = city?.toLowerCase().includes('dhaka') || location === 'inside_dhaka';
    return isDhaka ? 80 : 140;
}


async function insertReturnRequest(pool, { orderId, productId, customerId, reason, returnType, returnMethod, paymentMethod, accountNumber }) {
    await pool.execute(
        `INSERT INTO return_requests
        (order_id, product_id, customer_id, reason, return_type, return_method, payment_method, account_number)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            orderId,
            productId   || null,
            customerId  || null,
            reason,
            returnType  || 'Refund',
            returnMethod || 'Courier',
            paymentMethod  || null,
            accountNumber  || null
        ]
    );
}


async function sendOrderConfirmationEmail(orderData) {
    const { orderNumber, shipping_name, shipping_email, items, total_amount, payment_method } = orderData;
    const mailer = getMailer();
    if (!mailer) return;

    try {
        const itemDetails = items.map(i => `<li>${i.name || 'Product'} (x${i.quantity || 1}) - ${i.price || 0} BDT</li>`).join('');

        await mailer.sendMail({
            from: process.env.MAIL_FROM || `SABILORÉ <${process.env.MAIL_USER}>`,
            to: shipping_email || `support@sabilore.com`,
            bcc: process.env.MAIL_USER,
            subject: `[SABILORÉ] Order Confirmation: #${orderNumber}`,
            html: `
                <div style="font-family:Arial;max-width:600px;border:1px solid #eee;padding:20px;">
                    <h2 style="color:#111;text-align:center;">Thank You For Your Order!</h2>
                    <p>Hi ${shipping_name}, your order <strong>#${orderNumber}</strong> has been received and is being processed.</p>
                    <hr/>
                    <h4>Order Summary:</h4>
                    <ul>${itemDetails}</ul>
                    <p><strong>Total Amount:</strong> ${total_amount} BDT</p>
                    <p><strong>Payment Method:</strong> ${payment_method.toUpperCase()}</p>
                    <hr/>
                    <p style="font-size:12px;color:#888;">Track your order anytime at our site using your order number.</p>
                </div>
            `
        });
    } catch (err) {
        console.error('[Order Email Error]', err.message);
    }
}


async function validateOrderItems(items) {
    if (!items || !Array.isArray(items) || items.length === 0) {
        throw new Error("Order items cannot be empty.");
    }

    const productIds = [...new Set(items.map(item => {
        if (!item.product_id) throw new Error("Invalid order item data: missing product_id.");
        return Number(item.product_id);
    }))];

    const [dbProducts] = await pool.query('SELECT id FROM products WHERE id IN (?)', [productIds]);
    const validIds = new Set(dbProducts.map(p => p.id));

    for (const item of items) {
        if (!validIds.has(Number(item.product_id))) {
            throw new Error(`A product in your cart (ID: ${item.product_id}) is no longer available.`);
        }
    }
}


async function processCoupon(couponCode, subtotal) {
    if (!couponCode) return { appliedCode: null, discount: 0 };

    const [rows] = await pool.execute(
        'SELECT * FROM coupons WHERE code = ? AND is_active = 1',
        [couponCode.toUpperCase().trim()]
    );

    if (rows.length === 0) return { appliedCode: null, discount: 0 };

    const coupon = rows[0];
    const isValid = (!coupon.expires_at || new Date(coupon.expires_at) >= new Date())
        && (!coupon.max_uses || coupon.used_count < coupon.max_uses)
        && (!coupon.min_order_value || subtotal >= coupon.min_order_value);

    if (!isValid) return { appliedCode: null, discount: 0 };

    let discount;
    if (coupon.discount_type === 'percentage') {
        discount = Math.round(subtotal * (coupon.discount_value / 100));
    } else {
        discount = coupon.discount_value;
    }

    if (discount > subtotal) discount = subtotal;

    
    pool.execute('UPDATE coupons SET used_count = used_count + 1 WHERE id = ?', [coupon.id])
        .catch(e => console.error('[Coupon Update Error]', e));

    return { appliedCode: coupon.code, discount };
}


async function initializePaymentGateway(orderId, orderNumber, amount, method, hostUrl) {
    if (method === 'cod') return null;

    await pool.execute('UPDATE orders SET status = "Pending Payment" WHERE id = ?', [orderId]);

    try {
        if (method === 'bkash') {
            const res = await paymentGatewayService.createBkashPayment({
                invoiceNumber: orderNumber,
                amount,
                callbackURL: `${hostUrl}/api/gateways/bkash/callback?orderId=${orderId}`
            });
            return res?.bkashURL || null;
        } else if (method === 'nagad') {
            const res = await paymentGatewayService.initNagadPayment({ invoiceNumber: orderNumber, amount });
            return res?.paymentUrl || null;
        } else if (method === 'ebl') {
            const res = await paymentGatewayService.createEBLSession({ invoiceNumber: orderNumber, amount });
            return res?.paymentUrl || null;
        }
    } catch (err) {
        console.error('[Gateway Error]', err);
        await pool.execute('UPDATE orders SET status = "Payment Failed" WHERE id = ?', [orderId]);
        throw new Error("Failed to initialize payment gateway: " + err.message, { cause: err });
    }
    return null;
}

exports.createOrder = async (req, res) => {
    try {
        const {
            items, payment_method, bkash_txn, bkash_trx_id,
            shipping_name, shipping_phone, shipping_address, shipping_city,
            shipping_email, shipping_postal, location, delivery_fee,
            notes, city, coupon_code
        } = req.body;

        const customer_id = req.user ? req.user.id : null;

        
        await validateOrderItems(items);

        
        const subtotal = items.reduce((sum, i) => sum + (i.price * i.quantity), 0);
        const { appliedCode, discount } = await processCoupon(coupon_code, subtotal);

        const cityVal = shipping_city || city || '';
        const calculatedDeliveryFee = delivery_fee || calcDeliveryFee(cityVal, location);
        const totalAmount = subtotal - discount + calculatedDeliveryFee;

        
        const { id, orderNumber } = await Order.create({
            customer_id,
            total_amount: totalAmount,
            payment_method: payment_method || 'cod',
            bkash_trx_id: bkash_txn || bkash_trx_id || null,
            shipping_name, shipping_phone, shipping_email, shipping_address, shipping_city,
            notes, items, coupon_code: appliedCode, discount_amount: discount,
            delivery_charge: calculatedDeliveryFee, shipping_postal: shipping_postal || null
        });

        
        const hostUrl = process.env.BASE_URL || (req.protocol + '://' + req.get('host'));
        const redirectUrl = await initializePaymentGateway(id, orderNumber, totalAmount, payment_method, hostUrl);

        
        sendOrderConfirmationEmail({ orderNumber, shipping_name, shipping_email, items, total_amount: totalAmount, payment_method: payment_method || 'cod' });

        res.status(201).json({
            message: "Order placed successfully",
            orderId: id,
            order_number: orderNumber,
            total_amount: totalAmount,
            deliveryFee: calculatedDeliveryFee,
            redirect_url: redirectUrl
        });
    } catch (err) {
        console.error('[createOrder]', err.message);
        res.status(err.message.includes('available') ? 400 : 500).json({ message: err.message });
    }
};


exports.getMyOrders = async (req, res) => {
    try {
        const page = Number.parseInt(req.query.page, 10) || 1;
        const limit = Number.parseInt(req.query.limit, 10) || 10;
        const offset = (page - 1) * limit;

        const orders = await Order.getByCustomerId(req.user.id, limit, offset);
        res.json(orders);
    } catch (err) {
        serverError(res, err, 'getMyOrders');
    }
};

exports.getOrderDetails = async (req, res) => {
    try {
        let order = null;
        try {
            const [rows] = await pool.execute('SELECT * FROM orders WHERE id = ?', [req.params.id]);
            if (rows.length > 0) order = rows[0];
        } catch (e) {
            console.error('Order meta error:', e);
        }

        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        
        
        if (req.user.role !== 'admin' && Number(order.customer_id) !== Number(req.user.id)) {
            return res.status(403).json({ message: "Access denied. You do not own this order." });
        }

        const items = await Order.getOrderItems(req.params.id);

        res.json({ items, order });
    } catch (err) {
        serverError(res, err, 'getOrderDetails');
    }
};

exports.getOrderStats = async (req, res) => {
    try {
        const stats = await Order.getStats(req.user.id);
        res.json(stats);
    } catch (err) {
        serverError(res, err, 'getOrderStats');
    }
};

exports.expressCheckout = async (req, res) => {
    try {
        const { product_id, size, color, quantity, tummy_shape } = req.body;
        const customer_id = req.user ? req.user.id : null;

        if (!customer_id) {
            return res.status(401).json({ message: "Please login to use Express Checkout, or use the standard checkout as a guest." });
        }

        
        const [customers] = await pool.execute('SELECT * FROM customers WHERE id = ?', [customer_id]);
        if (customers.length === 0) return res.status(404).json({ message: "Customer profile not found" });
        const customer = customers[0];

        
        const [products] = await pool.execute('SELECT price, sale_price, name, image FROM products WHERE id = ?', [product_id]);
        if (products.length === 0) return res.status(404).json({ message: "Product not found" });
        const product = products[0];

        
        const applicablePrice = product.sale_price && Number(product.sale_price) > 0 
            ? Number(product.sale_price) 
            : Number(product.price);

        
        const items = [{
            product_id: product_id,
            name: product.name,
            image: product.image,
            price: applicablePrice,
            quantity: quantity || 1,
            size: size || null,
            color: color || null,
            tummy_shape: tummy_shape || null
        }];

        
        const deliveryFee = calcDeliveryFee(customer.city || '');
        const totalAmount = (applicablePrice * (quantity || 1)) + deliveryFee;

        
        const { id, orderNumber } = await Order.create({
            customer_id,
            total_amount: totalAmount,
            payment_method: 'cod', 
            bkash_trx_id: null,
            shipping_name: customer.name,
            shipping_phone: customer.phone,
            shipping_address: customer.address,
            shipping_city: customer.city,
            notes: 'Express Checkout Order',
            items,
            delivery_charge: deliveryFee
        });

        res.status(201).json({
            message: "Express order placed successfully!",
            orderId: id,
            order_number: orderNumber,
            total_amount: totalAmount
        });
    } catch (err) {
        serverError(res, err, 'expressCheckout');
    }
};


exports.requestReturn = async (req, res) => {
    try {
        const {
            orderId,
            productId,
            reason,
            returnType,
            returnMethod,
            paymentMethod,
            accountNumber
        } = req.body;
        const customer_id = req.user.id;

        if (!orderId || !reason) {
            return res.status(400).json({ message: "Order ID and reason are required" });
        }

        
        const [orders] = await pool.execute(
            'SELECT * FROM orders WHERE id = ? AND customer_id = ?',
            [orderId, customer_id]
        );

        if (orders.length === 0) {
            return res.status(404).json({ message: "Order not found" });
        }

        
        const [existing] = await pool.execute(
            'SELECT * FROM return_requests WHERE order_id = ? AND product_id = ?',
            [orderId, productId || null]
        );
        if (existing.length > 0) {
            return res.status(400).json({ message: "A return request already exists for this item" });
        }

        await insertReturnRequest(pool, {
            orderId,
            productId,
            customerId: customer_id,
            reason,
            returnType,
            returnMethod,
            paymentMethod,
            accountNumber
        });

        res.json({ message: "Return request submitted successfully. Our team will contact you soon." });
    } catch (err) {
        serverError(res, err, 'requestReturn');
    }
};


exports.getAllReturns = async (req, res) => {
    try {
        const [rows] = await pool.execute(`
            SELECT rr.*, o.order_number, 
                   COALESCE(c.name, o.shipping_name, 'Guest') as customer_name, 
                   COALESCE(c.email, o.shipping_email, '') as customer_email,
                   p.name as product_name, p.image as product_image
            FROM return_requests rr
            JOIN orders o ON rr.order_id = o.id
            LEFT JOIN customers c ON rr.customer_id = c.id
            LEFT JOIN products p ON rr.product_id = p.id
            ORDER BY rr.created_at DESC
        `);
        res.json(rows);
    } catch (err) {
        serverError(res, err, 'getAllReturns');
    }
};


exports.updateReturnStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, admin_notes } = req.body;

        if (!status) return res.status(400).json({ message: "Status is required" });

        await pool.execute(
            'UPDATE return_requests SET status = ?, admin_notes = ? WHERE id = ?',
            [status, admin_notes || null, id]
        );

        res.json({ message: "Return request updated successfully" });
    } catch (err) {
        serverError(res, err, 'updateReturnStatus');
    }
};


exports.deleteReturnRequest = async (req, res) => {
    try {
        const { id } = req.params;
        await pool.execute('DELETE FROM return_requests WHERE id = ?', [id]);
        res.json({ message: "Return request deleted successfully" });
    } catch (err) {
        serverError(res, err, 'deleteReturnRequest');
    }
};

exports.trackOrder = async (req, res) => {
    try {
        const { order_number, phone } = req.body;
        if (!order_number || !phone) {
            return res.status(400).json({ message: "Order number and phone number are required" });
        }

        const order = await Order.findByOrderNumber(order_number, phone);
        if (!order) {
            return res.status(404).json({ message: "Order not found with these details" });
        }

        const items = await Order.getOrderItems(order.id);
        res.json({ order, items });
    } catch (err) {
        serverError(res, err, 'trackOrder');
    }
};





exports.findPublicOrder = async (req, res) => {
    try {
        const { order_number, email_or_phone } = req.body;
        if (!order_number || !email_or_phone) {
            return res.status(400).json({ message: "Order number and email/phone are required" });
        }

        
        const [orders] = await pool.execute(
            'SELECT id, order_number, status, created_at, total_amount, shipping_name, shipping_email, shipping_phone FROM orders WHERE order_number = ? AND (shipping_email = ? OR shipping_phone = ?)',
            [order_number, email_or_phone, email_or_phone]
        );

        if (orders.length === 0) {
            return res.status(404).json({ message: "We couldn't find an order matching those details. Please check your order number and contact info." });
        }

        const order = orders[0];

        
        const orderDate = new Date(order.created_at);
        const diffTime = Math.abs(Date.now() - orderDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays > 14) {
            return res.status(400).json({ message: "This order is past the eligible return window (7 days). Contact support if you need assistance." });
        }

        
        const [items] = await pool.execute(`
            SELECT oi.*, p.name, p.image 
            FROM order_items oi 
            JOIN products p ON oi.product_id = p.id 
            WHERE oi.order_id = ?
        `, [order.id]);

        
        const [existingReturns] = await pool.execute(
            'SELECT product_id FROM return_requests WHERE order_id = ?',
            [order.id]
        );
        const returnedProductIds = new Set(existingReturns.map(r => r.product_id));

        const availableItems = items.map(item => {
            let imageUrl = null;
            if (item.image) {
                if (item.image.startsWith('http')) {
                    imageUrl = item.image;
                } else {
                    imageUrl = item.image.startsWith('/') ? item.image : '/' + item.image;
                }
            }

            return {
                ...item,
                image_url: imageUrl,
                already_requested: returnedProductIds.has(item.product_id)
            };
        });

        
        res.json({
            order: {
                id: order.id,
                order_number: order.order_number,
                status: order.status,
                created_at: order.created_at,
                total_amount: order.total_amount,
                shipping_name: order.shipping_name
            },
            items: availableItems
        });
    } catch (error) {
        console.error('findPublicOrder error:', error);
        res.status(500).json({ message: "Server error occurred. Please try again later." });
    }
};

exports.submitPublicReturn = async (req, res) => {
    try {
        const { order_id, items, reason, returnType, returnMethod, paymentMethod, accountNumber } = req.body;

        if (!order_id || !items || items.length === 0 || !reason) {
            return res.status(400).json({ message: "Missing required return details (items, reason)." });
        }

        
        const [orders] = await pool.execute('SELECT customer_id FROM orders WHERE id = ?', [order_id]);
        if (orders.length === 0) return res.status(404).json({ message: "Order not found." });

        const customer_id = orders[0].customer_id || null; 

        
        let createdCount = 0;
        for (const item of items) {
            const [existing] = await pool.execute(
                'SELECT id FROM return_requests WHERE order_id = ? AND product_id = ?',
                [order_id, item.product_id]
            );

            if (existing.length === 0) {
                await insertReturnRequest(pool, {
                    orderId: order_id,
                    productId: item.product_id,
                    customerId: customer_id,
                    reason,
                    returnType,
                    returnMethod,
                    paymentMethod,
                    accountNumber
                });
                createdCount++;
            }
        }

        if (createdCount > 0) {
            res.json({ message: "Return request submitted successfully. Our team will contact you soon." });
        } else {
            res.status(400).json({ message: "Return request already exists for these items." });
        }

    } catch (err) {
        serverError(res, err, 'submitPublicReturn');
    }
};
