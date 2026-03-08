// ✅ SKILL.md 第 37 章增强版 - 剔除无效链接，优化 Google 收录质量
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// 配置 Supabase
const supabaseUrl = process.env.SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL || "https://rdlmumybuwveaaeceohj.supabase.co";
const supabaseKey = process.env.SUPABASE_KEY || process.env.PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_aPXWTauRxJ88A88mwLDoPQ_puVi7PZj";
const supabase = createClient(supabaseUrl, supabaseKey);

const DOMAIN = "https://jaxfamlaw.com";
const OUTPUT_FILE = path.join(__dirname, '../public/sitemap.xml');
const OUTPUT_FILE_DIST = path.join(__dirname, '../dist/sitemap.xml');

async function generateSitemap() {
    console.log("🚀 开始生成优化版 Sitemap...");

    // 1. 获取案件与被告数据
    const { data: lawsuits } = await supabase.from('lawsuits').select('case_number, filed_date');
    const { data: defendants } = await supabase.from('defendants').select('defendant_name, case_number').limit(3000);

    let urlSet = new Set(); // 使用 Set 自动去重

    // 2. 添加静态法律页面 (提高 Google Ads 信任度)
    urlSet.add(`${DOMAIN}/`);
    urlSet.add(`${DOMAIN}/privacy.html`);
    urlSet.add(`${DOMAIN}/terms.html`);
    urlSet.add(`${DOMAIN}/refund.html`);

    // 3. 添加案件链接 (剔除 Unknown 和重复项)
    if (lawsuits) {
        lawsuits.forEach(suit => {
            if (suit.case_number && suit.case_number !== 'Unknown') {
                urlSet.add(`${DOMAIN}/case_template?case=${encodeURIComponent(suit.case_number)}`);
            }
        });
    }

    // 4. 添加被告链接 (pSEO 核心)
    if (defendants) {
        defendants.forEach(def => {
            if (def.defendant_name && def.case_number && def.case_number !== 'Unknown') {
                urlSet.add(`${DOMAIN}/case_template?case=${encodeURIComponent(def.case_number)}&defendant=${encodeURIComponent(def.defendant_name)}`);
            }
        });
    }

    // 5. 构建 XML
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
    
    urlSet.forEach(url => {
        const priority = url === `${DOMAIN}/` ? "1.0" : (url.includes('defendant') ? "0.9" : "0.8");
        xml += `    <url>\n        <loc>${url}</loc>\n        <changefreq>weekly</changefreq>\n        <priority>${priority}</priority>\n    </url>\n`;
    });

    xml += `</urlset>`;

    // 6. 写入文件
    [OUTPUT_FILE, OUTPUT_FILE_DIST].forEach(file => {
        const dir = path.dirname(file);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(file, xml);
    });

    console.log(`🎉 Sitemap 生成完毕! 总计有效链接: ${urlSet.size}`);
}

generateSitemap();
