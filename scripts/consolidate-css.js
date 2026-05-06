const fs = require('fs');
const path = require('path');
const CleanCSS = require('clean-css');


function consolidateCSS(filePath) {
    if (!fs.existsSync(filePath)) {
        console.warn(`File not found: ${filePath}`);
        return;
    }

    
    const content = fs.readFileSync(filePath, 'utf8');
    
    const options = {
        level: {
            1: {
                all: true,
                specialComments: 'all' 
            },
            2: {
                all: true 
            }
        },
        format: {
            indentBy: 4,
            indentWith: 'space',
            breaks: {
                afterAtRule: true,
                afterBlockBegins: true,
                afterBlockEnds: true,
                afterComment: true,
                afterProperty: true,
                afterRuleBegins: true,
                afterRuleEnds: true,
                beforeBlockEnds: true,
                betweenSelectors: true
            },
            spaces: {
                aroundSelectorRelation: true,
                beforeBlockBegins: true,
                beforeValueQualifier: true
            },
            semicolonAfterLastProperty: true
        }
    };

    const output = new CleanCSS(options).minify(content);

    if (output.errors.length > 0) {
        console.error(`Errors in ${filePath}:`, output.errors);
        return;
    }
    
    
    const backupPath = filePath + '.bak';
    fs.writeFileSync(backupPath, content);

    fs.writeFileSync(filePath, output.styles);
    
    
    
    
}

const cssDir = path.join(__dirname, '../frontend/css');
const files = [
    path.join(cssDir, 'style.css'),
    path.join(cssDir, 'critical.css'),
    path.join(cssDir, 'shop.css'),
    path.join(cssDir, 'home-styles.css'),
    path.join(cssDir, 'checkout.css'),
    path.join(cssDir, 'profile.css')
];

files.forEach(f => consolidateCSS(f));
