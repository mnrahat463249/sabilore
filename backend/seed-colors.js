
const db = require('./config/db');

const COLORS = [
    
    { name: 'Jet Black', hex: '#0A0A0A' },
    { name: 'Midnight Black', hex: '#1C1C1C' },
    { name: 'Charcoal', hex: '#36454F' },
    { name: 'Gunmetal', hex: '#2A3439' },
    { name: 'Slate Gray', hex: '#708090' },
    { name: 'Ash Gray', hex: '#B2BEB5' },
    { name: 'Silver', hex: '#C0C0C0' },
    { name: 'Platinum', hex: '#E5E4E2' },
    { name: 'Smoke', hex: '#848884' },
    { name: 'Iron', hex: '#48494B' },

    
    { name: 'Pure White', hex: '#FFFFFF' },
    { name: 'Off White', hex: '#FAF9F6' },
    { name: 'Ivory', hex: '#FFFFF0' },
    { name: 'Cream', hex: '#FFFDD0' },
    { name: 'Pearl', hex: '#FDEEF4' },
    { name: 'Snow', hex: '#FFFAFA' },
    { name: 'Linen', hex: '#FAF0E6' },
    { name: 'Bone', hex: '#E3DAC9' },

    
    { name: 'Crimson', hex: '#DC143C' },
    { name: 'Scarlet', hex: '#FF2400' },
    { name: 'Ruby', hex: '#E0115F' },
    { name: 'Burgundy', hex: '#800020' },
    { name: 'Maroon', hex: '#800000' },
    { name: 'Wine', hex: '#722F37' },
    { name: 'Cherry', hex: '#DE3163' },
    { name: 'Rosewood', hex: '#65000B' },
    { name: 'Brick Red', hex: '#CB4154' },
    { name: 'Vermillion', hex: '#E34234' },

    
    { name: 'Blush Pink', hex: '#F9C6CF' },
    { name: 'Rose', hex: '#FF007F' },
    { name: 'Hot Pink', hex: '#FF69B4' },
    { name: 'Fuchsia', hex: '#FF00FF' },
    { name: 'Salmon', hex: '#FA8072' },
    { name: 'Coral Pink', hex: '#F88379' },
    { name: 'Dusty Rose', hex: '#DCAE96' },
    { name: 'Mauve', hex: '#E0B0FF' },
    { name: 'Magenta', hex: '#FF0090' },
    { name: 'Bubblegum', hex: '#FFC1CC' },

    
    { name: 'Tangerine', hex: '#FF9966' },
    { name: 'Burnt Orange', hex: '#CC5500' },
    { name: 'Rust', hex: '#B7410E' },
    { name: 'Terracotta', hex: '#E2725B' },
    { name: 'Amber', hex: '#FFBF00' },
    { name: 'Peach', hex: '#FFDAB9' },
    { name: 'Apricot', hex: '#FBCEB1' },
    { name: 'Coral', hex: '#FF7F50' },
    { name: 'Copper', hex: '#B87333' },

    
    { name: 'Sunflower', hex: '#FFDA03' },
    { name: 'Mustard', hex: '#FFDB58' },
    { name: 'Gold', hex: '#FFD700' },
    { name: 'Lemon', hex: '#FFF44F' },
    { name: 'Honey', hex: '#EB9605' },
    { name: 'Champagne', hex: '#F7E7CE' },
    { name: 'Saffron', hex: '#F4C430' },
    { name: 'Butter', hex: '#FFFF99' },

    
    { name: 'Forest Green', hex: '#228B22' },
    { name: 'Emerald', hex: '#50C878' },
    { name: 'Sage', hex: '#B2AC88' },
    { name: 'Olive', hex: '#808000' },
    { name: 'Mint', hex: '#98FB98' },
    { name: 'Hunter Green', hex: '#355E3B' },
    { name: 'Moss', hex: '#8A9A5B' },
    { name: 'Jade', hex: '#00A86B' },
    { name: 'Lime', hex: '#32CD32' },
    { name: 'Army Green', hex: '#4B5320' },
    { name: 'Pistachio', hex: '#93C572' },
    { name: 'Teal', hex: '#008080' },

    
    { name: 'Navy Blue', hex: '#000080' },
    { name: 'Royal Blue', hex: '#4169E1' },
    { name: 'Cobalt', hex: '#0047AB' },
    { name: 'Sky Blue', hex: '#87CEEB' },
    { name: 'Baby Blue', hex: '#89CFF0' },
    { name: 'Denim', hex: '#1560BD' },
    { name: 'Powder Blue', hex: '#B0E0E6' },
    { name: 'Steel Blue', hex: '#4682B4' },
    { name: 'Indigo', hex: '#4B0082' },
    { name: 'Sapphire', hex: '#0F52BA' },
    { name: 'Cerulean', hex: '#007BA7' },
    { name: 'Aqua', hex: '#00FFFF' },
    { name: 'Turquoise', hex: '#40E0D0' },

    
    { name: 'Lavender', hex: '#E6E6FA' },
    { name: 'Plum', hex: '#8E4585' },
    { name: 'Grape', hex: '#6F2DA8' },
    { name: 'Violet', hex: '#7F00FF' },
    { name: 'Lilac', hex: '#C8A2C8' },
    { name: 'Orchid', hex: '#DA70D6' },
    { name: 'Amethyst', hex: '#9966CC' },
    { name: 'Eggplant', hex: '#614051' },

    
    { name: 'Chocolate', hex: '#7B3F00' },
    { name: 'Caramel', hex: '#FFD59A' },
    { name: 'Tan', hex: '#D2B48C' },
    { name: 'Khaki', hex: '#C3B091' },
    { name: 'Sand', hex: '#C2B280' },
    { name: 'Taupe', hex: '#483C32' },
    { name: 'Mocha', hex: '#967969' },
    { name: 'Espresso', hex: '#3C1414' },
    { name: 'Cinnamon', hex: '#D2691E' },
    { name: 'Beige', hex: '#F5F5DC' },
    { name: 'Camel', hex: '#C19A6B' },
    { name: 'Sienna', hex: '#A0522D' },
];

(async () => {
    try {
        

        
        await db.execute(`
            CREATE TABLE IF NOT EXISTS colors (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL UNIQUE,
                hex_code VARCHAR(7) NOT NULL,
                status ENUM('active', 'inactive') DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        let inserted = 0, skipped = 0;
        for (const c of COLORS) {
            try {
                await db.execute(
                    'INSERT INTO colors (name, hex_code, status) VALUES (?, ?, ?)',
                    [c.name, c.hex, 'active']
                );
                inserted++;
            } catch (err) {
                if (err.code === 'ER_DUP_ENTRY') {
                    skipped++;
                } else {
                    console.error(`  ❌ Failed: ${c.name}:`, err.message);
                }
            }
        }

        process.exit(0);
    } catch (err) {
        console.error('Seed failed:', err);
        process.exit(1);
    }
})();
