require('dotenv').config();
const jwt = require('jsonwebtoken');
const token = jwt.sign({ id: 1, email: 'admin@sabilore.com', role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '1h' });

