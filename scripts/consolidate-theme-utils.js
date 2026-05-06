const fs = require('fs');
const filePath = 'f:/RAHAT-ALL-PROGRAMING/02-projects/nodejs-projects/SABILORE PROJECT/SABILORE_LATEST/sabilore/frontend/css/style.css';
const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);



const targetsToRemove = [
    '.theme-text-muted {',
    '    color: var(--secondary) !important;',
    '    opacity: 90%;',
    '}',
    '',
    "html[data-theme='dark'] .theme-text-muted {",
    '    color: #f8f9fa !important;',
    "    ",
    '    opacity: 100%;',
    '}',
    '',
    '.bg-theme-light {',
    '    background-color: #f8f9fa !important;',
    '}'
];


let newLines = [];
let skip = false;
let removedAnything = false;

for (let i = 0; i < lines.length; i++) {
    if (i >= 1140 && i <= 1160 && lines[i].trim() === '.theme-text-muted {') {
        skip = true;
        removedAnything = true;
    }
    
    if (skip) {
        if (lines[i].trim() === '}' && (i > 1150)) {
             
             if (lines[i+1] && lines[i+1].trim() === '') {
                 i++; 
             }
             skip = false;
             continue;
        }
        continue;
    }
    newLines.push(lines[i]);
}



let utilityIndex = -1;
for (let i = 0; i < newLines.length; i++) {
    if (newLines[i].includes('THEME-AWARE UTILITY CLASSES')) {
        utilityIndex = i;
        break;
    }
}

if (utilityIndex !== -1) {
    
    const consolidated = [
        '.theme-text-main {',
        '    color: var(--text-main) !important;',
        '}',
        '',
        '.theme-text-muted {',
        '    color: var(--secondary) !important;',
        '    opacity: 90%;',
        '}',
        '',
        "html[data-theme='dark'] .theme-text-muted {",
        '    color: #f8f9fa !important;',
        '    opacity: 100%;',
        '}',
        '',
        '.bg-theme-aware {',
        '    background-color: var(--card-bg) !important;',
        '    border-color: var(--border-color) !important;',
        '}',
        '',
        '.bg-theme-light {',
        '    background-color: var(--light-gray) !important;',
        '}',
        '',
        '.color-inherit {',
        '    color: inherit !important;',
        '}'
    ];
    
    
    let startReplace = -1;
    for (let j = utilityIndex; j < newLines.length; j++) {
        if (newLines[j].trim() === '.theme-text-main {') {
            startReplace = j;
            break;
        }
    }
    
    if (startReplace !== -1) {
        
        let endReplace = startReplace;
        while (endReplace < newLines.length && !newLines[endReplace].includes('}')) {
            endReplace++;
        }
        
        
        for (let k = startReplace; k < newLines.length; k++) {
            if (newLines[k].includes('.color-inherit {')) {
                while (k < newLines.length && !newLines[k].includes('}')) k++;
                endReplace = k;
                break;
            }
        }
        
        newLines.splice(startReplace, endReplace - startReplace + 1, ...consolidated);
    }
}

fs.writeFileSync(filePath, newLines.join('\n'));

