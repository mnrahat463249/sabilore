const js = require("@eslint/js");

module.exports = [
    js.configs.recommended,
    {
        files: ["**/*.js"],
        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "commonjs",
            globals: {
                // Browser & Service Worker globals
                window: "readonly",
                document: "readonly",
                navigator: "readonly",
                sessionStorage: "readonly",
                localStorage: "readonly",
                fetch: "readonly",
                self: "readonly",
                caches: "readonly",
                addEventListener: "readonly",
                removeEventListener: "readonly",
                Image: "readonly",
                Blob: "readonly",
                FormData: "readonly",
                URL: "readonly",
                URLSearchParams: "readonly",
                IntersectionObserver: "readonly",
                requestIdleCallback: "readonly",
                // Node.js globals
                process: "readonly",
                __dirname: "readonly",
                require: "readonly",
                module: "readonly",
                console: "readonly",
                setTimeout: "readonly",
                setInterval: "readonly",
                clearTimeout: "readonly",
                clearInterval: "readonly",
                Buffer: "readonly"
            }
        },
        rules: {
            "no-unused-vars": "warn",
            "no-console": "off",
            "no-undef": "off"
        }
    },
    {
        ignores: [
            "node_modules/**",
            "**/*.min.js",
            "**/*.min.css",
            "uploads/**",
            "logs/**"
        ]
    }
];
