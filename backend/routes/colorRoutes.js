


const express = require('express');
const router = express.Router();
const db = require('../config/db');


function isValidHex(hex) {
    return /^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$/.test(hex);
}


router.get('/', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT id, name, hex_code, status FROM colors ORDER BY name');
        res.json(rows);
    } catch (err) {
        console.error('Error fetching colors:', err);
        res.status(500).json({ message: 'Failed to fetch colors' });
    }
});


router.post('/', async (req, res) => {
    const { name, hex_code, status } = req.body;
    if (!name || !hex_code) return res.status(400).json({ message: 'Name and hex_code are required' });
    if (!isValidHex(hex_code)) return res.status(400).json({ message: 'Invalid hex code format (must be #RRGGBB)' });
    try {
        await db.execute('INSERT INTO colors (name, hex_code, status) VALUES (?, ?, ?)',
            [name.trim(), hex_code.trim(), status || 'active']);
        res.status(201).json({ message: 'Color added successfully' });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: 'Duplicate color name or hex code' });
        }
        console.error('Error adding color:', err);
        res.status(500).json({ message: 'Failed to add color' });
    }
});


router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { name, hex_code, status } = req.body;
    if (!name || !hex_code) return res.status(400).json({ message: 'Name and hex_code are required' });
    if (!isValidHex(hex_code)) return res.status(400).json({ message: 'Invalid hex code format' });
    try {
        const [result] = await db.execute('UPDATE colors SET name = ?, hex_code = ?, status = ? WHERE id = ?',
            [name.trim(), hex_code.trim(), status || 'active', id]);
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Color not found' });
        res.json({ message: 'Color updated successfully' });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: 'Duplicate color name or hex code' });
        }
        console.error('Error updating color:', err);
        res.status(500).json({ message: 'Failed to update color' });
    }
});


router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await db.execute('DELETE FROM colors WHERE id = ?', [id]);
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Color not found' });
        res.json({ message: 'Color deleted' });
    } catch (err) {
        console.error('Error deleting color:', err);
        res.status(500).json({ message: 'Failed to delete color' });
    }
});

module.exports = router;
