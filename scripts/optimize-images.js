const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function optimizeDirectory(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);

    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stats = fs.statSync(fullPath);

        if (stats.isDirectory()) {
            await optimizeDirectory(fullPath);
            continue;
        }

        const ext = path.extname(file).toLowerCase();
        if (['.jpg', '.jpeg', '.png'].includes(ext)) {
            const baseName = fullPath.replace(/\.[^.]+$/, '');
            const webpPath = baseName + '.webp';
            const avifPath = baseName + '.avif';
            const webp600 = baseName + '-600.webp';
            const webp1920 = baseName + '-1920.webp';

            
            if (!fs.existsSync(webpPath)) {
                try {
                    await sharp(fullPath).webp({ quality: 82, effort: 6 }).toFile(webpPath);
                    
                } catch (e) {
                    console.error(`❌ WebP Failed: ${file}`, e.message);
                }
            }

            
            if (!fs.existsSync(webp600)) {
                try {
                    await sharp(fullPath).resize(600).webp({ quality: 80 }).toFile(webp600);
                    
                } catch (e) {
                    console.error(`❌ 600w WebP Failed: ${file}`, e.message);
                }
            }

            if (!fs.existsSync(webp1920)) {
                try {
                    await sharp(fullPath).resize(1920, null, { withoutEnlargement: true }).webp({ quality: 75 }).toFile(webp1920);
                    
                } catch (e) {
                    console.error(`❌ 1920w WebP Failed: ${file}`, e.message);
                }
            }

            
            if (!fs.existsSync(avifPath)) {
                try {
                    await sharp(fullPath).avif({ quality: 65, effort: 6 }).toFile(avifPath);
                    
                } catch (e) {
                    console.error(`❌ AVIF Failed: ${file}`, e.message);
                }
            }
        }
    }
}

async function run() {
    
    const rootDir = path.join(__dirname, '..');
    
    
    await optimizeDirectory(path.join(rootDir, 'uploads'));
    
    
    await optimizeDirectory(path.join(rootDir, 'frontend/img'));
    
    
}

run();
