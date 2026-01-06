import fs from 'fs';
import path from 'path';

// Read JSON
const jsonPath = path.join(process.cwd(), 'sql', 'brands_1000.json');
const brands = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

// Generate SQL
let sqlContent = `-- Bulk Seed Brands (Engine A) \n`;
sqlContent += `INSERT INTO keywords (brand_name, status, source_url) VALUES \n`;

const values = brands.map(brand => {
    // Escape single quotes in brand names (e.g. Levi's)
    const safeBrand = brand.replace(/'/g, "''");
    return `('${safeBrand}', 'active', 'bulk_import')`;
});

sqlContent += values.join(',\n');
sqlContent += `\nON CONFLICT (brand_name) DO NOTHING;`;

// Write File
const outPath = path.join(process.cwd(), 'sql', 'seed_brands_bulk.sql');
fs.writeFileSync(outPath, sqlContent);

console.log(`✅ SQL Generated at: ${outPath}`);
console.log(`📦 Count: ${brands.length} brands`);
