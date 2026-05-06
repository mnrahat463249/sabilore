const fs = require('fs');
const path = require('path');

const filePath = 'f:/RAHAT-ALL-PROGRAMING/02-projects/nodejs-projects/SABILORE PROJECT/SABILORE_LATEST/sabilore/frontend/css/style.css';
let content = fs.readFileSync(filePath, 'utf8');



content = content.replace(/rgba\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d\.]+)\s*\)/g, (match, r, g, b, a) => {
    const alpha = parseFloat(a);
    const percentage = Math.round(alpha * 100);
    return `rgb(${r} ${g} ${b} / ${percentage}%)`;
});



content = content.replace(/opacity\s*:\s*([\d\.]+)\s*(!important)?\s*;/g, (match, val, imp) => {
    const alpha = parseFloat(val);
    const percentage = Math.round(alpha * 100);
    return `opacity: ${percentage}%${imp ? ' !important' : ''};`;
});

fs.writeFileSync(filePath, content);

