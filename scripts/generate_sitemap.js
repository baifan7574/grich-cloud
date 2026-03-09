// ✅ Sitemap 极致优化版 - 适配 Google Search Console 严格校验
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL || "https://rdlmumybuwveaaeceohj.supabase.co";
const supabaseKey = process.env.SUPABASE_KEY || process.env.PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_aPXWTauRxJ88A88mwLDoPQ_puVi7PZj";
const supabase = createClient(supabaseUrl, supabaseKey);

const DOMAIN = "https://jaxfamlaw.com";
const OUTPUT_FILE = path.join(__dirname, '../public/sitemap_index.xml');
const OUTPUT_FILE_DIST = path.join(__dirname, '../dist/sitemap_index.xml');

// 获取当前日期 (YYYY-MM-DD)
const today = new Date().toISOString().split('T')[0];

async function generateSitemap() {
    console.log("🚀 正在生成高收录权重 Sitemap...");

    const { data: lawsuits } = await supabase.from('lawsuits').select('case_number, filed_date').order('created_at', { ascending: false });
    const { data: defendants } = await supabase.from('defendants').select('defendant_name, case_number').limit(3000);

    let urls = [];

    // 1. 基础页面 (最高优先级)
    urls.push({ loc: `${DOMAIN}/`, lastmod: today, changefreq: 'daily', priority: '1.0' });
    urls.push({ loc: `${DOMAIN}/guide_tro_frozen.html`, lastmod: today, changefreq: 'weekly', priority: '0.9' });
    urls.push({ loc: `${DOMAIN}/privacy.html`, lastmod: today, changefreq: 'monthly', priority: '0.5' });
    urls.push({ loc: `${DOMAIN}/terms.html`, lastmod: today, changefreq: 'monthly', priority: '0.5' });
    urls.push({ loc: `${DOMAIN}/refund.html`, lastmod: today, changefreq: 'monthly', priority: '0.5' });

    // 2. 案件页面 (仅生成 Canonical URL，避免 GSC 报重复收录错误)
    if (lawsuits) {
        lawsuits.forEach(suit => {
            if (suit.case_number && suit.case_number !== 'Unknown') {
                const cleanCase = suit.case_number.trim();
                urls.push({
                    loc: `${DOMAIN}/case_template?case=${encodeURIComponent(cleanCase)}`,
                    lastmod: suit.filed_date || today,
                    changefreq: 'weekly',
                    priority: '0.8'
                });
            }
        });
    }

    // 4. 构建标准化 XML (严格遵循 sitemap.org 协议)
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
    
    urls.forEach(u => {
        xml += `  <url>\n`;
        xml += `    <loc>${u.loc}</loc>\n`;
        xml += `    <lastmod>${u.lastmod}</lastmod>\n`;
        xml += `    <changefreq>${u.changefreq}</changefreq>\n`;
        xml += `    <priority>${u.priority}</priority>\n`;
        xml += `  </url>\n`;
    });

    xml += `</urlset>`;

    // 5. 双重写入
    [OUTPUT_FILE, OUTPUT_FILE_DIST].forEach(file => {
        const dir = path.dirname(file);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(file, xml);
    });

    console.log(`🎉 Sitemap 生成完毕! 有效 URL: ${urls.length}`);
}

generateSitemap();
