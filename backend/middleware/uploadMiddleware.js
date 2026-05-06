const multer = require('multer');
const path = require('node:path');
const fs = require('node:fs');


const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}


let sharp = null;
try {
    sharp = require('sharp');
} catch {
    console.warn('⚠️  sharp not available — images will not be auto-converted to WebP.');
}






const VIDEO_EXTS = new Set(['.mp4', '.webm', '.ogg', '.mov']);
const SVG_EXTS  = new Set(['.svg']);

async function autoResizeImage(sourcePath, isProductImage = false) {
    if (!sharp) return sourcePath;

    const ext = path.extname(sourcePath).toLowerCase();
    if (VIDEO_EXTS.has(ext) || SVG_EXTS.has(ext)) return sourcePath; 

    try {
        const destPathBase  = sourcePath.replace(/\.[^.]+$/, '');
        const defaultDestPath = `${destPathBase}.webp`;

        if (isProductImage) {
            
            const sizes = [
                { width: 600,  height: 800,  suffix: '-600' },
                { width: 900,  height: 1200, suffix: '' },      
                { width: 1200, height: 1600, suffix: '-1920' },
            ];

            await Promise.all(sizes.flatMap(size => {
                const base = `${destPathBase}${size.suffix}`;
                return [
                    sharp(sourcePath)
                        .resize(size.width, size.height, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
                        .avif({ quality: 65, effort: 6 })
                        .toFile(`${base}.avif`),
                    sharp(sourcePath)
                        .resize(size.width, size.height, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
                        .webp({ quality: 82, effort: 6 })
                        .toFile(`${base}.webp`)
                ];
            }));
        } else {
            
            await Promise.all([
                sharp(sourcePath).avif({ quality: 65, effort: 6 }).toFile(`${destPathBase}.avif`),
                sharp(sourcePath).webp({ quality: 82, effort: 6 }).toFile(`${destPathBase}.webp`)
            ]);
        }

        
        if (defaultDestPath !== sourcePath) {
            try { fs.unlinkSync(sourcePath); } catch (err) { console.warn('Failed to delete temp upload file:', err.message); }
        }

        return defaultDestPath;
    } catch (err) {
        console.error('Image convert/resize error:', err.message);
        return sourcePath; 
    }
}




const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    },
});

const fileFilter = (req, file, cb) => {
    const allowed = ['.png', '.svg', '.jpg', '.jpeg', '.ico', '.webp', '.gif',
                     '.mp4', '.webm', '.ogg', '.mov'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
        cb(null, true);
    } else {
        cb(new Error(`Format not supported! (Allowed: ${allowed.join(', ')})`), false);
    }
};

const upload = multer({
    storage,
    limits: { fileSize: 50 * 1024 * 1024, fieldSize: 20 * 1024 * 1024 }, 
    fileFilter,
});


const logoUpload = multer({
    storage,
    limits: { fileSize: 50 * 1024 * 1024, fieldSize: 20 * 1024 * 1024 }, 
    fileFilter,
});




async function convertAllFiles(req, isProduct = false) {
    if (!sharp) return;

    
    if (req.file) {
        const newPath = await autoResizeImage(req.file.path, isProduct);
        req.file.path     = newPath;
        req.file.filename = path.basename(newPath);
    }

    
    if (req.files) {
        if (Array.isArray(req.files)) {
            
            for (const file of req.files) {
                const newPath = await autoResizeImage(file.path, isProduct);
                file.path     = newPath;
                file.filename = path.basename(newPath);
            }
        } else {
            
            for (const field of Object.keys(req.files)) {
                for (const file of req.files[field]) {
                    const newPath = await autoResizeImage(file.path, isProduct);
                    file.path     = newPath;
                    file.filename = path.basename(newPath);
                }
            }
        }
    }
}





function singleUpload(fieldName) {
    return async (req, res, next) => {
        upload.single(fieldName)(req, res, async (err) => {
            if (err) return next(err);
            await convertAllFiles(req, false);
            next();
        });
    };
}





function fieldsUpload(fields) {
    return async (req, res, next) => {
        upload.fields(fields)(req, res, async (err) => {
            if (err) return next(err);
            await convertAllFiles(req, false);
            next();
        });
    };
}




const _rawProductUpload = upload.fields([
    { name: 'image',           maxCount: 1 },
    { name: 'image2',          maxCount: 1 },
    { name: 'image3',          maxCount: 1 },
    { name: 'image4',          maxCount: 1 },
    { name: 'size_guide_image', maxCount: 1 },
]);

const productUpload = async (req, res, next) => {
    _rawProductUpload(req, res, async (err) => {
        if (err) return next(err);
        if (!req.files || !sharp) return next();

        const productImageFields = ['image', 'image2', 'image3', 'image4'];
        for (const field of productImageFields) {
            if (req.files[field]) {
                const file    = req.files[field][0];
                const newPath = await autoResizeImage(file.path, true);
                file.path     = newPath;
                file.filename = path.basename(newPath);
            }
        }

        
        if (req.files['size_guide_image']) {
            const file    = req.files['size_guide_image'][0];
            const newPath = await autoResizeImage(file.path, false);
            file.path     = newPath;
            file.filename = path.basename(newPath);
        }

        next();
    });
};




const variantUpload = async (req, res, next) => {
    upload.single('image')(req, res, async (err) => {
        if (err) return next(err);
        if (!req.file || !sharp) return next();
        const newPath     = await autoResizeImage(req.file.path, true);
        req.file.path     = newPath;
        req.file.filename = path.basename(newPath);
        next();
    });
};

module.exports = { upload, logoUpload, singleUpload, fieldsUpload, productUpload, variantUpload, autoResizeImage };
