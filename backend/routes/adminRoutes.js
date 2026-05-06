const express = require('express');
const router = express.Router();
const AdminController = require('../controllers/adminController');

const adminAuthMiddleware = require('../middleware/adminAuthMiddleware');
const activityLogger = require('../middleware/activityLogger');
const { fieldsUpload, productUpload, variantUpload, logoUpload, singleUpload } = require('../middleware/uploadMiddleware');

const contactRoutes = require('../controllers/contactController');
const colorRoutes = require('../routes/colorRoutes');




router.post('/login', AdminController.adminLogin);
router.get('/settings', (req, res, next) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    next();
}, AdminController.getSettings);
router.post('/size-guide/recommend', AdminController.getRecommendation);


router.post('/forgot-password', AdminController.forgotPassword);
router.post('/reset-password', AdminController.resetPassword);



router.use(adminAuthMiddleware);

const NewsletterController = require('../controllers/newsletterController');


router.post('/clear-cache', AdminController.clearSystemCache);

router.get('/stats', AdminController.getStats);



router.post('/upload', variantUpload, AdminController.uploadImage);


router.use('/colors', colorRoutes);
router.get('/newsletter', NewsletterController.getAll);
router.delete('/newsletter/:id', NewsletterController.delete);


router.get('/products', AdminController.getAllProducts);
router.post('/products', productUpload, AdminController.addProduct);
router.put('/products/:id', productUpload, AdminController.updateProduct);
router.delete('/products/:id', AdminController.deleteProduct);


router.get('/products/:productId/variants', AdminController.getProductVariants);
router.post('/products/:productId/variants', activityLogger('Add Variant'), AdminController.addVariant);
router.put('/variants/:id', activityLogger('Update Variant'), AdminController.updateVariant);
router.delete('/variants/:id', activityLogger('Delete Variant'), AdminController.deleteVariant);


router.get('/orders', AdminController.getAllOrders);
router.get('/orders/:id', AdminController.getOrderDetails);
router.put('/orders/:id/status', activityLogger('Update Order Status'), AdminController.updateOrderStatus);
router.put('/orders/:id/charge', activityLogger('Update Delivery Charge'), AdminController.updateOrderCharge);
router.put('/orders/:id/total', activityLogger('Update Order Total'), AdminController.updateOrderTotal);
router.put('/orders/:id/link-customer', activityLogger('Link Order to Customer'), AdminController.linkOrderToCustomer);
router.delete('/orders/:id', activityLogger('Delete Order'), AdminController.deleteOrder);


const orderController = require('../controllers/orderController');
router.get('/returns', orderController.getAllReturns);
router.put('/returns/:id', activityLogger('Update Return Status'), orderController.updateReturnStatus);
router.delete('/returns/:id', activityLogger('Delete Return Request'), orderController.deleteReturnRequest);


router.get('/customers', AdminController.getAllCustomers);
router.put('/customers/:id/status', AdminController.updateCustomerStatus);
router.delete('/customers/:id', activityLogger('Delete Customer'), AdminController.deleteCustomer);


router.get('/categories', AdminController.getAllCategories);
router.post('/categories', fieldsUpload([{ name: 'image', maxCount: 1 }, { name: 'video', maxCount: 1 }]), activityLogger('Add Category'), AdminController.addCategory);
router.delete('/categories/bulk-delete', activityLogger('Bulk Delete Categories'), AdminController.bulkDeleteCategories);
router.put('/categories/:id', fieldsUpload([{ name: 'image', maxCount: 1 }, { name: 'video', maxCount: 1 }]), activityLogger('Update Category'), AdminController.updateCategory);
router.delete('/categories/:id', activityLogger('Delete Category'), AdminController.deleteCategory);
router.put('/categories/:id/image', fieldsUpload([{ name: 'image', maxCount: 1 }]), activityLogger('Update Category Image'), AdminController.updateCategoryImage);


router.get('/categories/:categoryId/size-chart', AdminController.getSizeChart);
router.post('/size-chart', fieldsUpload([{ name: 'image', maxCount: 1 }]), activityLogger('Update Size Chart'), AdminController.updateSizeChart);


router.post('/settings', (req, res, next) => {
    
    logoUpload.fields([
        { name: 'site_logo', maxCount: 1 },
        { name: 'site_logo_desktop', maxCount: 1 },
        { name: 'site_favicon', maxCount: 1 },
        { name: 'hero_image', maxCount: 1 },
        { name: 'hero_video', maxCount: 1 },
        { name: 'hero_image_mobile', maxCount: 1 },
        { name: 'hero_video_mobile', maxCount: 1 },
        { name: 'tummy_flatter_img', maxCount: 1 },
        { name: 'tummy_average_img', maxCount: 1 },
        { name: 'tummy_curvier_img', maxCount: 1 }
    ])(req, res, (err) => {
        if (err) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(413).json({ message: "File too large. Max limit for branding/hero assets is 50MB." });
            }
            return next(err);
        }
        next();
    });
}, async (req, res, next) => {
    try {
        
        if (req.files && Object.keys(req.files).length > 0) {
            const path = require('node:path');
            const { autoResizeImage } = require('../middleware/uploadMiddleware');
            
            for (const field of Object.keys(req.files)) {
                for (const file of req.files[field]) {
                    const ext = path.extname(file.path).toLowerCase();
                    const isVideo = ['.mp4','.webm','.ogg','.mov'].includes(ext);
                    if (!isVideo && ext !== '.svg') {
                        const newPath = await autoResizeImage(file.path, false);
                        file.path = newPath;
                        file.filename = path.basename(newPath);
                    }
                }
            }
        }
        next();
    } catch (err) {
        console.error('[AdminRoutes] Settings image processing error:', err);
        next(err);
    }
}, activityLogger('Update Settings'), AdminController.updateSettings);


router.get('/activity-logs', AdminController.getActivityLogs);


router.get('/contact-messages', contactRoutes.getAllMessages);
router.patch('/contact-messages/:id/read', contactRoutes.markAsRead);
router.delete('/contact-messages/:id', contactRoutes.deleteMessage);


router.get('/size-guides', AdminController.getSizeGuides);
router.post('/size-guides', activityLogger('Add Size Guide Rule'), AdminController.addSizeGuide);
router.delete('/size-guides/:id', activityLogger('Delete Size Guide Rule'), AdminController.deleteSizeGuide);


const blogController = require('../controllers/blogController');
router.get('/blog', blogController.getAllPosts);
router.post('/blog', singleUpload('image'), activityLogger('Create Blog Post'), blogController.createPost);
router.put('/blog/:id', singleUpload('image'), activityLogger('Update Blog Post'), blogController.updatePost);
router.delete('/blog/:id', activityLogger('Delete Blog Post'), blogController.deletePost);


router.get('/coupons', AdminController.getCoupons);
router.post('/coupons', activityLogger('Create Coupon'), AdminController.createCoupon);
router.put('/coupons/:id', activityLogger('Update Coupon'), AdminController.updateCoupon);
router.delete('/coupons/:id', activityLogger('Delete Coupon'), AdminController.deleteCoupon);


router.get('/reports', AdminController.getReports);

module.exports = router;
