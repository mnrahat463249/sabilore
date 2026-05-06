const { PurgeCSS } = require('purgecss');
const fs = require('fs');
const path = require('path');

async function runPurge() {
    
    
    const rootDir = path.resolve(__dirname, '..');
    const cssPath = path.join(rootDir, 'frontend/css/style.css');
    
    if (!fs.existsSync(cssPath)) {
        console.error(`❌ CSS file not found at ${cssPath}`);
        return;
    }

    function getFiles(dir, ext) {
        if (!fs.existsSync(dir)) return [];
        return fs.readdirSync(dir)
            .filter(f => f.endsWith(ext))
            .map(f => path.join(dir, f).replace(/\\/g, '/'));
    }

    const contentPaths = [
        ...getFiles(path.join(rootDir, 'frontend/pages'), '.html'),
        ...getFiles(path.join(rootDir, 'frontend/includes'), '.html'),
        ...getFiles(path.join(rootDir, 'frontend/js'), '.js'),
        path.join(rootDir, 'backend/app.js').replace(/\\/g, '/')
    ];
    
    

    try {
        
        const purgecssResult = await new PurgeCSS().purge({
            content: contentPaths,
            css: [cssPath],
            safelist: {
                standard: [
                    'active', 'show', 'ticker-hidden', 'page-loaded', 
                    'dropdown-menu', 'dropdown-item', 'collapsing', 'collapse',
                    'navbar-collapse', 'fade', 'modal-backdrop', 'modal-open',
                    'skeleton-loader', 'skeleton-loading',
                    /^navbar-/, /^nav-/, /^btn-/, /^modal-/, /^carousel-/, /^swiper-/
                ],
                deep: [/^dropdown-/, /^collapse/],
                greedy: [/data-theme/]
            },
            keyframes: true,
            variables: true,
            fontFace: true
        });

        
        if (purgecssResult.length > 0) {
            const result = purgecssResult[0];
            const originalSize = fs.statSync(cssPath).size;
            const purgedSize = result.css.length;
            const savings = (((originalSize - purgedSize) / originalSize) * 100).toFixed(1);

            const outputPath = path.join(rootDir, 'frontend/css/style.css'); 
            fs.writeFileSync(outputPath, result.css);
            
            
        } else {
            console.warn('⚠️ No CSS returned from PurgeCSS.');
        }
    } catch (err) {
        console.error('❌ PurgeCSS failed:', err);
    }
}

runPurge();
