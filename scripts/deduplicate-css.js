const fs = require('fs');
const path = require('path');

const stylePath = path.join(__dirname, '..', 'frontend', 'css', 'style.css');

if (!fs.existsSync(stylePath)) {
    console.error('style.css not found');
    process.exit(1);
}

let content = fs.readFileSync(stylePath, 'utf8');





const rules = content.split('}').map(r => r.trim()).filter(r => r.length > 0);

const seenSelectors = new Map();
const uniqueRules = [];
let duplicatesFound = 0;

rules.forEach(rule => {
    const parts = rule.split('{');
    if (parts.length !== 2) {
        uniqueRules.push(rule + '}');
        return;
    }

    const selector = parts[0].trim();
    const properties = parts[1].trim();

    
    
    
    

    if (seenSelectors.has(selector)) {
        if (seenSelectors.get(selector) === properties) {
            duplicatesFound++;
            
            return;
        }
    }

    seenSelectors.set(selector, properties);
    uniqueRules.push(rule + '}');
});

if (duplicatesFound > 0) {
    fs.writeFileSync(stylePath, uniqueRules.join('\n'), 'utf8');
    
} else {
    
}
