const fs = require('fs');

const file = 'frontend/css/style.css';
let css = fs.readFileSync(file, 'utf8');






css = css.replace(
    /\.footer-drawer-body \{([^}]*?)color: rgba\(0,0,0,0\.1\);/g,
    '.footer-drawer-body {$1color: rgba(255, 255, 255, 0.8);'
);


css = css.replace(
    /\.faq-question \{([^}]*?)color: rgba\(0,0,0,0\.1\);/g,
    '.faq-question {$1color: rgba(255, 255, 255, 0.7);'
);


css = css.replace(
    /\.faq-num \{([^}]*?)border: 1px solid rgba\(0,0,0,0\.1\);/g,
    '.faq-num {$1border: 1px solid rgba(255, 255, 255, 0.2);'
);


css = css.replace(
    /\.faq-answer \{([^}]*?)color: rgba\(0,0,0,0\.1\);/g,
    '.faq-answer {$1color: rgba(255, 255, 255, 0.65);'
);


css = css.replace(
    /\.faq-item \{([^}]*?)border-bottom: 1px solid rgba\(0,0,0,0\.1\);/g,
    '.faq-item {$1border-bottom: 1px solid rgba(255, 255, 255, 0.1);'
);


css = css.replace(
    /\.footer-drawer-header \{([^}]*?)border-bottom: 1px solid rgba\(0,0,0,0\.1\);/g,
    '.footer-drawer-header {$1border-bottom: 1px solid rgba(255, 255, 255, 0.1);'
);






css = css.replace(
    /\[data-theme="light"\] \.footer-drawer-body \{([^}]*?)color: rgba\(0,0,0,0\.1\);/g,
    '[data-theme="light"] .footer-drawer-body {$1color: rgba(0, 0, 0, 0.7);'
);


css = css.replace(
    /\[data-theme="light"\] \.faq-question \{([^}]*?)color: rgba\(0,0,0,0\.1\);/g,
    '[data-theme="light"] .faq-question {$1color: rgba(0, 0, 0, 0.65);'
);


css = css.replace(
    /\[data-theme="light"\] \.faq-num \{([^}]*?)border: 1px solid rgba\(0,0,0,0\.1\);/g,
    '[data-theme="light"] .faq-num {$1border: 1px solid rgba(0, 0, 0, 0.15);'
);


css = css.replace(
    /\[data-theme="light"\] \.faq-answer \{([^}]*?)color: rgba\(0,0,0,0\.1\);/g,
    '[data-theme="light"] .faq-answer {$1color: rgba(0, 0, 0, 0.6);'
);


css = css.replace(
    /\[data-theme="light"\] \.faq-item \{([^}]*?)border-bottom: 1px solid rgba\(0,0,0,0\.1\);/g,
    '[data-theme="light"] .faq-item {$1border-bottom: 1px solid rgba(0, 0, 0, 0.1);'
);


css = css.replace(
    /\[data-theme="light"\] \.footer-drawer-header \{([^}]*?)border-bottom: 1px solid rgba\(0,0,0,0\.1\);/g,
    '[data-theme="light"] .footer-drawer-header {$1border-bottom: 1px solid rgba(0, 0, 0, 0.1);'
);




css = css.replace(
    '--header-bg: rgba(255, 255, 255, 0.9);',
    '--header-bg: rgba(10, 5, 20, 0.97);'
);




css = css.replace(
    /html\[data-theme='dark'\] \.theme-text-muted,\r?\nhtml\[data-theme='dark'\] \.text-muted,\r?\nhtml\[data-theme='dark'\] \.text-white-50 \{\r?\n {4}color: rgba\(0, 0, 0, 0\.5\) !important;\r?\n\}/,
    `html[data-theme='dark'] .theme-text-muted,
html[data-theme='dark'] .text-muted,
html[data-theme='dark'] .text-white-50 {
    color: rgba(255, 255, 255, 0.5) !important;
}`
);


css = css.replace(
    /html\[data-theme='dark'\] \.theme-text-muted \{\r?\n {4}color: rgba\(0, 0, 0, 0\.5\) !important;\r?\n\}/g,
    `html[data-theme='dark'] .theme-text-muted {
    color: rgba(255, 255, 255, 0.5) !important;
}`
);





css = css.replace(
    /footer \.text-white-50 \{\r?\n    color: rgba\(0, 0, 0, 0\.5\) !important;\r?\n\}/,
    `footer .text-white-50 {
    color: rgba(255, 255, 255, 0.5) !important;
}`
);








css = css.replace(
    /\.sale-countdown-sublabel \{\r?\n    color: rgba\(0,0,0,0\.1\);/,
    `.sale-countdown-sublabel {
    color: rgba(255, 255, 255, 0.6);`
);




css = css.replace(/@media\s*\(\s*width\s*<=\s*([\d.]+)px\s*\)/g, '@media (max-width: $1px)');
css = css.replace(/@media\s*\(\s*width\s*>=\s*([\d.]+)px\s*\)/g, '@media (min-width: $1px)');
css = css.replace(/@media\s*\(\s*height\s*<=\s*([\d.]+)px\s*\)/g, '@media (max-height: $1px)');
css = css.replace(/@media\s*\(\s*height\s*>=\s*([\d.]+)px\s*\)/g, '@media (min-height: $1px)');




css = css.replace(
    /html\[data-theme=dark\] \.legal-rich-text \{\r?\n    color: rgba\(0,0,0,0\.1\);\r?\n\}/,
    `html[data-theme=dark] .legal-rich-text {
    color: rgba(255, 255, 255, 0.85);
}`
);



css = css.replace(
    /\[data-theme=light\] \.faq-answer,\s*\[data-theme=light\] \.faq-question,\s*\[data-theme=light\] \.footer-drawer-body \{\r?\n    color: rgba\(0,0,0,0\.1\);\r?\n\}/,
    `[data-theme=light] .faq-answer,
[data-theme=light] .faq-question,
[data-theme=light] .footer-drawer-body {
    color: rgba(0, 0, 0, 0.7);
}`
);

fs.writeFileSync(file, css, 'utf8');



let critical = fs.readFileSync('frontend/css/critical.css', 'utf8');
critical = critical.replace(
    /:root, html\[data-theme='dark'\] \{\s*--header-bg: rgba\(0,0,0,0\.1\);\s*\}/,
    `:root { --header-bg: #fff; }
html[data-theme='dark'] { --header-bg: rgba(10, 5, 20, 0.97); }`
);

critical = critical.replace(/@media\s*\(\s*width\s*<=\s*([\d.]+)px\s*\)/g, '@media (max-width: $1px)');
critical = critical.replace(/@media\s*\(\s*width\s*>=\s*([\d.]+)px\s*\)/g, '@media (min-width: $1px)');
fs.writeFileSync('frontend/css/critical.css', critical, 'utf8');

