const fs = require('fs');
const filePath = 'f:/RAHAT-ALL-PROGRAMING/02-projects/nodejs-projects/SABILORE PROJECT/SABILORE_LATEST/sabilore/frontend/css/style.css';
let content = fs.readFileSync(filePath, 'utf8');


content = content.replace(/\(max-width:\s*([^)]+)\)/g, '(width <= $1)');


content = content.replace(/\(min-width:\s*([^)]+)\)/g, '(width >= $1)');

fs.writeFileSync(filePath, content);

