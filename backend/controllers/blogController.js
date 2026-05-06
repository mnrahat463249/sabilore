const pool = require('../config/db');
const { serverError } = require('../utils/errorHandler');
const { deleteOldFile } = require('../utils/fileUtils');

class BlogController {
    
    static async createPost(req, res) {
        try {
            const { title, slug, content, excerpt, author, status } = req.body;
            const image = req.file ? `/uploads/${req.file.filename}` : null;

            if (!title || !slug || !content) {
                return res.status(400).json({ message: 'Title, slug, and content are required.' });
            }

            await pool.execute(
                'INSERT INTO blog_posts (title, slug, content, excerpt, author, image, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [
                    title        || null,
                    slug         || null,
                    content      || null,
                    excerpt      || null,
                    author       || 'Admin',
                    image        ?? null,
                    status       || 'Draft'
                ]
            );

            if (global.invalidateApiCache) global.invalidateApiCache('/blog');

            res.status(201).json({ message: 'Blog post created successfully' });
        } catch (err) {
            serverError(res, err, 'Blog.createPost');
        }
    }

    
    static async updatePost(req, res) {
        try {
            const { id } = req.params;
            const { title, slug, content, excerpt, author, status } = req.body;
            let image = req.body.image;

            if (req.file) {
                image = `/uploads/${req.file.filename}`;
            }

            
            const [existing] = await pool.execute('SELECT image FROM blog_posts WHERE id = ?', [id]);
            const oldImage = existing[0] ? existing[0].image : null;

            if (req.file && oldImage) {
                deleteOldFile(oldImage);
            }

            await pool.execute(
                'UPDATE blog_posts SET title = ?, slug = ?, content = ?, excerpt = ?, author = ?, image = ?, status = ? WHERE id = ?',
                [
                    title        !== undefined ? title   : null,
                    slug         !== undefined ? slug    : null,
                    content      !== undefined ? content : null,
                    excerpt      || null,
                    author       || 'Admin',
                    image        !== undefined ? image   : null,
                    status       || 'Draft',
                    id
                ]
            );

            if (global.invalidateApiCache) global.invalidateApiCache('/blog');

            res.json({ message: 'Blog post updated successfully' });
        } catch (err) {
            serverError(res, err, 'Blog.updatePost');
        }
    }

    
    static async deletePost(req, res) {
        try {
            const { id } = req.params;

            
            const [rows] = await pool.execute('SELECT image FROM blog_posts WHERE id = ?', [id]);
            if (rows[0] && rows[0].image) {
                deleteOldFile(rows[0].image);
            }

            await pool.execute('DELETE FROM blog_posts WHERE id = ?', [id]);

            if (global.invalidateApiCache) global.invalidateApiCache('/blog');

            res.json({ message: 'Blog post deleted successfully' });
        } catch (err) {
            serverError(res, err, 'Blog.deletePost');
        }
    }

    
    static async getAllPosts(req, res) {
        try {
            const isAdmin = req.originalUrl.includes('/admin/');
            const query = isAdmin
                ? 'SELECT * FROM blog_posts ORDER BY created_at DESC'
                : 'SELECT * FROM blog_posts WHERE status = "Published" ORDER BY created_at DESC';

            const [rows] = await pool.execute(query);
            res.json(rows);
        } catch (err) {
            serverError(res, err, 'Blog.getAllPosts');
        }
    }

    
    static async getPostBySlug(req, res) {
        try {
            const { slug } = req.params;
            const [rows] = await pool.execute(
                'SELECT * FROM blog_posts WHERE slug = ? AND status = "Published"',
                [slug]
            );

            if (rows.length === 0) {
                return res.status(404).json({ message: 'Post not found' });
            }

            res.json(rows[0]);
        } catch (err) {
            serverError(res, err, 'Blog.getPostBySlug');
        }
    }
}

module.exports = BlogController;
