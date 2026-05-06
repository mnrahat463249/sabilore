

const { body, validationResult } = require('express-validator');


const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({
            error: true,
            message: 'Validation failed',
            fields: errors.array().map(e => ({ field: e.path, message: e.msg }))
        });
    }
    next();
};


const authValidators = {
    register: [
        body('name')
            .trim()
            .notEmpty().withMessage('Name is required')
            .isLength({ max: 100 }).withMessage('Name must be 100 characters or less'),
        body('identifier')
            .trim()
            .notEmpty().withMessage('Email or Phone is required')
            .custom((value) => {
                const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
                const isPhone = /^[0-9+\-\s()]{7,20}$/.test(value);
                if (!isEmail && !isPhone) {
                    throw new Error('Please enter a valid Email Address or Phone Number');
                }
                return true;
            }),
        body('password')
            .notEmpty().withMessage('Password is required')
            .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
        handleValidationErrors
    ],

    login: [
        body('identifier')
            .optional({ checkFalsy: true })
            .trim()
            .custom((value) => {
                if (!value) return true;
                const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
                const isPhone = /^[0-9+\-\s()]{7,20}$/.test(value);
                if (!isEmail && !isPhone) {
                    throw new Error('Please enter a valid Email Address or Phone Number');
                }
                return true;
            }),
        body('email')
            .optional({ checkFalsy: true })
            .trim()
            .isEmail().withMessage('Invalid email address')
            .normalizeEmail(),
        body('phone')
            .optional({ checkFalsy: true })
            .trim()
            .matches(/^[0-9+\-\s()]{7,20}$/).withMessage('Invalid phone number format'),
        body('password')
            .notEmpty().withMessage('Password is required'),
        body().custom((value, { req }) => {
            if (!req.body.email && !req.body.phone && !req.body.identifier) {
                throw new Error('Please provide your Email or Phone Number');
            }
            return true;
        }),
        handleValidationErrors
    ],

    forgotPassword: [
        body('email')
            .trim()
            .notEmpty().withMessage('Email is required')
            .isEmail().withMessage('Invalid email address')
            .normalizeEmail(),
        handleValidationErrors
    ],

    changePassword: [
        body('current_password')
            .notEmpty().withMessage('Current password is required'),
        body('new_password')
            .notEmpty().withMessage('New password is required')
            .isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
        handleValidationErrors
    ]
};


const orderValidators = {
    createOrder: [
        body('shipping_name')
            .optional()
            .trim()
            .isLength({ max: 150 }).withMessage('Name too long'),
        body('shipping_phone')
            .optional()
            .trim()
            .matches(/^[0-9+\-\s()]{7,20}$/).withMessage('Invalid phone number'),
        body('shipping_address')
            .optional()
            .trim()
            .isLength({ max: 500 }).withMessage('Address too long'),
        body('total_amount')
            .optional()
            .isFloat({ min: 0 }).withMessage('Invalid total amount'),
        body('items')
            .isArray({ min: 1 }).withMessage('Order must have at least one item'),
        handleValidationErrors
    ],

    expressCheckout: [
        body('product_id')
            .notEmpty().withMessage('Product ID is required')
            .isInt().withMessage('Invalid product ID'),
        body('size')
            .notEmpty().withMessage('Size is required'),
        body('color')
            .optional()
            .trim(),
        body('quantity')
            .optional()
            .isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
        body('tummy_shape')
            .optional()
            .trim(),
        handleValidationErrors
    ],

    trackOrder: [
        body('order_number')
            .trim()
            .notEmpty().withMessage('Order number is required')
            .isLength({ max: 100 }).withMessage('Invalid order number'),
        handleValidationErrors
    ]
};


const newsletterValidators = {
    subscribe: [
        body('email')
            .trim()
            .notEmpty().withMessage('Email is required')
            .isEmail().withMessage('Invalid email address')
            .normalizeEmail(),
        handleValidationErrors
    ]
};


const contactValidators = {
    send: [
        body('name')
            .trim()
            .notEmpty().withMessage('Name is required')
            .isLength({ max: 100 }).withMessage('Name too long'),
        body('email')
            .trim()
            .notEmpty().withMessage('Email is required')
            .isEmail().withMessage('Invalid email address')
            .normalizeEmail(),
        body('message')
            .trim()
            .notEmpty().withMessage('Message is required')
            .isLength({ min: 10, max: 2000 }).withMessage('Message must be between 10 and 2000 characters'),
        handleValidationErrors
    ]
};

module.exports = {
    auth: authValidators,
    order: orderValidators,
    newsletter: newsletterValidators,
    contact: contactValidators,
    handleValidationErrors
};
