const fs = require('fs');
const path = require('path');


function deleteOldFile(relativePath) {
    if (!relativePath) return;

    try {
        
        const cleanRelativePath = relativePath.split('?')[0];

        
        if (!cleanRelativePath.includes('/uploads/')) return;

        
        const fileName = path.basename(cleanRelativePath);
        if (!fileName) return;

        const uploadsDir = path.join(__dirname, '../../uploads');
        const absolutePath = path.join(uploadsDir, fileName);

        
        if (fs.existsSync(absolutePath)) {
            fs.unlinkSync(absolutePath);
            
        }

        
        
        
        
        const ext = path.extname(absolutePath);
        const baseNameNoExt = path.basename(absolutePath, ext);

        
        const variantSuffixes = ['-600', '-1920'];

        for (const suffix of variantSuffixes) {
            
            
            const variantAbsolutePath = path.join(uploadsDir, `${baseNameNoExt}${suffix}${ext}`);
            if (fs.existsSync(variantAbsolutePath)) {
                fs.unlinkSync(variantAbsolutePath);
                
            }
        }

    } catch (error) {
        console.error(`[File Cleanup] Failed to delete file ${relativePath}:`, error.message);
    }
}

module.exports = { deleteOldFile };
