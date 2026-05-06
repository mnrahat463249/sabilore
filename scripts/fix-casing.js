const fs = require('fs');
const filePath = 'f:/RAHAT-ALL-PROGRAMING/02-projects/nodejs-projects/SABILORE PROJECT/SABILORE_LATEST/sabilore/frontend/css/style.css';
let content = fs.readFileSync(filePath, 'utf8');


content = content.replace(/currentColor/g, 'currentcolor');

fs.writeFileSync(filePath, content);

