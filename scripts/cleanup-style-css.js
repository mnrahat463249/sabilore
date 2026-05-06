const fs = require('fs');
const filePath = 'f:/RAHAT-ALL-PROGRAMING/02-projects/nodejs-projects/SABILORE PROJECT/SABILORE_LATEST/sabilore/frontend/css/style.css';
const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);



let foundIndex = -1;
for (let i = 1550; i < lines.length; i++) {
    if (lines[i].trim() === '.tracking-wider {') {
        foundIndex = i;
        break;
    }
}

if (foundIndex !== -1) {
    
    if (lines[foundIndex - 1].trim() === '') {
        lines.splice(foundIndex - 1, 4);
    } else {
        lines.splice(foundIndex, 3);
    }
}

fs.writeFileSync(filePath, lines.join('\n'));

