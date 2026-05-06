const db = require('../config/db');
const fs = require('fs').promises;
const path = require('path');



const UPLOAD_DIR = '/uploads';


const deleteImageFile = async (imagePath) => {
    if (!imagePath) return;
    try {
        
        
        const fullPath = path.join(process.cwd(), imagePath);
        await fs.unlink(fullPath);
        
    } catch (err) {
        if (err.code !== 'ENOENT') {
            console.error(`[File Cleanup Error] Failed to delete ${imagePath}:`, err.message);
        }
    }
};


const productSizeOptionController = {
    
    getAllOptions: async (req, res) => {
        try {
            const [options] = await db.execute('SELECT * FROM product_size_options ORDER BY display_order ASC, id ASC');
            res.json(options);
        } catch (error) {
            console.error('Error fetching product size options:', error);
            res.status(500).json({ message: 'Error fetching options' });
        }
    },

    
    addOption: async (req, res) => {
        try {
            
            const [existing] = await db.execute('SELECT COUNT(*) as count FROM product_size_options');
            if (existing[0].count >= 3) {
                if (req.file) await deleteImageFile(`${UPLOAD_DIR}/${req.file.filename}`);
                return res.status(400).json({ message: 'Maximum limit of 3 size options reached.' });
            }

            const { label, display_order } = req.body;

            if (!label) {
                if (req.file) await deleteImageFile(`${UPLOAD_DIR}/${req.file.filename}`);
                return res.status(400).json({ message: 'Label is required.' });
            }

            if (!req.file) {
                return res.status(400).json({ message: 'Image is required.' });
            }

            const imageUrl = `${UPLOAD_DIR}/${req.file.filename}`;
            const order = parseInt(display_order) || 0;

            const [result] = await db.execute(
                'INSERT INTO product_size_options (label, image_url, display_order) VALUES (?, ?, ?)',
                [label, imageUrl, order]
            );

            res.status(201).json({
                message: 'Option added successfully',
                id: result.insertId,
                label,
                image_url: imageUrl,
                display_order: order
            });
        } catch (error) {
            if (req.file) await deleteImageFile(`${UPLOAD_DIR}/${req.file.filename}`);
            console.error('Error adding product size option:', error);
            res.status(500).json({ message: 'Error adding option' });
        }
    },

    
    updateOption: async (req, res) => {
        try {
            const { id } = req.params;
            const { label, display_order } = req.body;

            
            const [existing] = await db.execute('SELECT label, display_order, image_url FROM product_size_options WHERE id = ?', [id]);
            if (existing.length === 0) {
                if (req.file) await deleteImageFile(`${UPLOAD_DIR}/${req.file.filename}`);
                return res.status(404).json({ message: 'Option not found' });
            }

            const oldImage = existing[0].image_url;
            let imageUrl = oldImage;

            
            if (req.file) {
                imageUrl = `${UPLOAD_DIR}/${req.file.filename}`;
                
                deleteImageFile(oldImage).catch(console.error);
            }

            const updatedLabel = label !== undefined ? label : existing[0].label;
            const updatedOrder = display_order !== undefined ? parseInt(display_order) : existing[0].display_order;

            await db.execute(
                'UPDATE product_size_options SET label = ?, image_url = ?, display_order = ? WHERE id = ?',
                [updatedLabel, imageUrl, updatedOrder, id]
            );

            res.json({
                message: 'Option updated successfully',
                id: parseInt(id),
                label: updatedLabel,
                image_url: imageUrl,
                display_order: updatedOrder
            });
        } catch (error) {
            if (req.file) await deleteImageFile(`${UPLOAD_DIR}/${req.file.filename}`);
            console.error('Error updating product size option:', error);
            res.status(500).json({ message: 'Error updating option' });
        }
    },

    
    deleteOption: async (req, res) => {
        try {
            const { id } = req.params;

            
            const [existing] = await db.execute('SELECT image_url FROM product_size_options WHERE id = ?', [id]);
            if (existing.length === 0) {
                return res.status(404).json({ message: 'Option not found' });
            }

            await deleteImageFile(existing[0].image_url);

            await db.execute('DELETE FROM product_size_options WHERE id = ?', [id]);

            res.json({ message: 'Option deleted successfully' });
        } catch (error) {
            console.error('Error deleting product size option:', error);
            res.status(500).json({ message: 'Error deleting option' });
        }
    }
};

module.exports = productSizeOptionController;
