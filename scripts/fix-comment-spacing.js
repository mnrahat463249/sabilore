const fs = require('fs');
const filePath = 'f:/RAHAT-ALL-PROGRAMING/02-projects/nodejs-projects/SABILORE PROJECT/SABILORE_LATEST/sabilore/frontend/css/style.css';
const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);


let inDarkTheme = false;
for (let i = 200; i < 300; i++) {
    if (lines[i].includes("html[data-theme='dark']")) {
        inDarkTheme = true;
        continue;
    }
    if (inDarkTheme) {
        if (lines[i].includes('}')) {
            inDarkTheme = false;
            continue;
        }
        
        if (lines[i].trim().startsWith('/*') && lines[i-1].trim() !== '' && !lines[i-1].trim().startsWith('/*')) {
            lines.splice(i, 0, '');
            i++; 
        }
    }
}

fs.writeFileSync(filePath, lines.join('\n'));

