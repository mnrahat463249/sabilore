const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.join(__dirname, '..');
const folders = ['backend', 'scripts', 'admin/js', 'frontend/js'];

function checkSyntax(filePath) {
    try {
        execSync(`node -c "${filePath}"`, { stdio: 'pipe' });
        return null;
    } catch (e) {
        return e.stderr.toString();
    }
}

function traverse(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            if (file !== 'node_modules' && file !== '.git') {
                traverse(fullPath);
            }
        } else if (file.endsWith('.js')) {
            const error = checkSyntax(fullPath);
            if (error) {
                console.log(`\n❌ Syntax Error in ${fullPath.replace(rootDir, '')}:`);
                console.log(error.split('\n')[0]); // Just the first line of error
                
                // Try to find the line number
                const match = error.match(/:(\d+)\n/);
                if (match) {
                    const lineNum = parseInt(match[1]);
                    const lines = fs.readFileSync(fullPath, 'utf8').split('\n');
                    console.log(`   Line ${lineNum}: ${lines[lineNum - 1].trim()}`);
                }
            }
        }
    }
}

console.log('Starting syntax audit of JavaScript files...');
folders.forEach(f => {
    const dir = path.join(rootDir, f);
    if (fs.existsSync(dir)) traverse(dir);
});
console.log('Audit complete.');
