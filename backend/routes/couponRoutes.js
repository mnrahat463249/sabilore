const express = require('express');
const router = express.Router();
const pool = require('../config/db');


router.post('/validate', async (req, res) => {
    try {
        const { code, cart_total } = req.body;

        if (!code) {
            return res.status(400).json({ message: "Coupon code is required" });
        }

        const [rows] = await pool.execute(
            'SELECT * FROM coupons WHERE code = ? AND is_active = 1',
            [code.toUpperCase().trim()]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: "Invalid or inactive coupon code" });
        }

        const coupon = rows[0];

        
        if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
            return res.status(400).json({ message: "This coupon has expired" });
        }

        
        if (coupon.max_uses && coupon.used_count >= coupon.max_uses) {
            return res.status(400).json({ message: "This coupon has reached its usage limit" });
        }

        
        if (coupon.min_order_value && cart_total < coupon.min_order_value) {
            return res.status(400).json({ message: `Minimum order of ৳${coupon.min_order_value} required for this coupon` });
        }

        res.json({ message: "Coupon applied successfully", coupon });

    } catch (error) {
        console.error("Coupon Validation Error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

module.exports = router;
