const fs = require('fs');
const path = require('path');
const CleanCSS = require('clean-css');
const UglifyJS = require('uglify-js');

const rootDir = path.join(__dirname, '..');
const FRONTEND_JS  = path.join(rootDir, 'frontend/js');
const FRONTEND_CSS = path.join(rootDir, 'frontend/css');
const ADMIN_JS     = path.join(rootDir, 'admin/js');
const ADMIN_CSS    = path.join(rootDir, 'admin/css');

function savings(oldLen, newLen) {
    if (oldLen === 0) return '0%';
    const save = ((oldLen - newLen) / oldLen) * 100;
    return `-${save.toFixed(1)}% (${(newLen / 1024).toFixed(1)}KB)`;
}

function minifyDir_CSS(dir, label) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.css') && !f.endsWith('.min.css'));
    if (files.length === 0) return;

    files.forEach(file => {
        const src  = path.join(dir, file);
        const dest = path.join(dir, file.replace('.css', '.min.css'));
        try {
            const original = fs.readFileSync(src, 'utf8');
            const result = new CleanCSS({
                level: { 1: { all: true }, 2: { all: false, mergeMedia: true, removeDuplicateFontRules: true, removeDuplicateMediaBlocks: true, removeDuplicateRules: true } },
                returnPromise: false,
            }).minify(original);

            if (result.errors.length > 0) {
                console.error(`  ❌ [${label}] CSS error in ${file}:`, result.errors.join(', '));
                return;
            }
            fs.writeFileSync(dest, result.styles);
            console.log(`  ✅ [${label}] Minified ${file} | ${savings(original.length, result.styles.length)}`);
        } catch (err) {
            console.error(`  ❌ [${label}] Failed to minify ${file}:`, err.message);
        }
    });
}

function minifyDir_JS(dir, label) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.js') && !f.endsWith('.min.js'));
    if (files.length === 0) return;

    files.forEach(file => {
        const src  = path.join(dir, file);
        const dest = path.join(dir, file.replace('.js', '.min.js'));
        try {
            const original = fs.readFileSync(src, 'utf8');
            const result = UglifyJS.minify(original, {
                compress: {
                    dead_code: true,
                    drop_debugger: true,
                    conditionals: true,
                    evaluate: true,
                    booleans: true,
                    loops: true,
                    unused: true,
                    if_return: true,
                    join_vars: true,
                },
                mangle: { toplevel: false },
                output: { comments: false },
            });

            if (result.error) {
                console.error(`  ❌ [${label}] JS error in ${file}:`, result.error.message || result.error);
                return;
            }
            fs.writeFileSync(dest, result.code);
            console.log(`  ✅ [${label}] Minified ${file} | ${savings(original.length, result.code.length)}`);
        } catch (err) {
            console.error(`  ❌ [${label}] Failed to minify ${file}:`, err.message);
        }
    });
}

console.log('🚀 Minifying Assets...');
minifyDir_CSS(FRONTEND_CSS, 'frontend/css');
minifyDir_JS(FRONTEND_JS, 'frontend/js');
minifyDir_CSS(ADMIN_CSS, 'admin/css');
minifyDir_JS(ADMIN_JS, 'admin/js');
console.log('✨ Asset minification complete.');
