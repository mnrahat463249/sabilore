const fs = require('fs');
const path = require('path');

function repairFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    const original = content;

    
    content = content.replace(/rgba\(\s*,\s*,\s*,\s*\)/g, 'rgba(0,0,0,0.1)');
    
    
    content = content.replace(/@media\s*\(\s*min-width\s*:\s*(\d+)px\s*\)/g, '@media (width >= $1px)');
    content = content.replace(/@media\s*\(\s*max-width\s*:\s*(\d+)px\s*\)/g, '@media (width <= $1px)');

    
    content = content.replace(/rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)/g, (match, r, g, b, a) => {
        const alpha = Math.round(parseFloat(a) * 100);
        return `rgb(${r} ${g} ${b} / ${alpha}%)`;
    });
    
    
    content = content.replace(/rgb\(\s*(\d+)\s+(\d+)\s+(\d+)\s*\/\s*([\d.]+)\s*\)/g, (match, r, g, b, a) => {
        if (a.includes('%')) return match;
        const alpha = Math.round(parseFloat(a) * 100);
        return `rgb(${r} ${g} ${b} / ${alpha}%)`;
    });

    
    content = content.replace(/opacity\s*:\s*([01]\.?\d*)\s*(!important)?\s*;/g, (match, val, imp) => {
        if (val.includes('%')) return match;
        const pct = Math.round(parseFloat(val) * 100);
        return `opacity: ${pct}%${imp ? ' ' + imp : ''};`;
    });

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        
    }
}

function walk(dir) {
    if (!fs.existsSync(dir)) return;
    fs.readdirSync(dir).forEach(f => {
        let p = path.join(dir, f);
        if (fs.statSync(p).isDirectory()) {
            walk(p);
        } else if (f.endsWith('.css')) {
            repairFile(p);
        }
    });
}


walk('frontend/css');
walk('admin/css');

