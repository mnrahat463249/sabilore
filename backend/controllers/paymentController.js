const db = require('../config/db');
const { deleteOldFile } = require('../utils/fileUtils');


exports.getAllPaymentMethods = async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM payment_methods ORDER BY id ASC');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


exports.getActivePaymentMethods = async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT id, name, type, instructions, image FROM payment_methods WHERE status = "active" ORDER BY id ASC');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


exports.addPaymentMethod = async (req, res) => {
    try {
        const { name, type, status, instructions } = req.body;
        if (!name || !type) return res.status(400).json({ message: "Name and type are required" });

        const imagePath = req.file ? `/uploads/${req.file.filename}` : null;

        await db.execute(
            'INSERT INTO payment_methods (name, type, status, instructions, image) VALUES (?, ?, ?, ?, ?)',
            [name, type, status || 'active', instructions || '', imagePath]
        );

        res.status(201).json({ message: "Payment method added successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


exports.updatePaymentMethod = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, type, status, instructions } = req.body;

        const updateFields = [];
        const params = [];

        if (name) { updateFields.push('name = ?'); params.push(name); }
        if (type) { updateFields.push('type = ?'); params.push(type); }
        if (status) { updateFields.push('status = ?'); params.push(status); }
        if (instructions !== undefined) { updateFields.push('instructions = ?'); params.push(instructions); }

        if (req.file) {
            
            const [existing] = await db.execute('SELECT image FROM payment_methods WHERE id = ?', [id]);
            if (existing[0] && existing[0].image) {
                deleteOldFile(existing[0].image);
            }

            updateFields.push('image = ?');
            params.push(`/uploads/${req.file.filename}`);
        }

        if (updateFields.length === 0) return res.status(400).json({ message: "No fields to update" });

        params.push(id);
        await db.execute(
            `UPDATE payment_methods SET ${updateFields.join(', ')} WHERE id = ?`,
            params
        );

        res.json({ message: "Payment method updated successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


exports.deletePaymentMethod = async (req, res) => {
    try {
        const { id } = req.params;

        
        const [existing] = await db.execute('SELECT image FROM payment_methods WHERE id = ?', [id]);
        if (existing[0] && existing[0].image) {
            deleteOldFile(existing[0].image);
        }

        await db.execute('DELETE FROM payment_methods WHERE id = ?', [id]);
        res.json({ message: "Payment method deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
