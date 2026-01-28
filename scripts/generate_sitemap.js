try { require('dotenv').config(); } catch (e) { }
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// 配置 Supabase
const supabaseUrl = process.env.SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL || "https://rdlmumybuwveaaeceohj.supabase.co";
const supabaseKey = process.env.SUPABASE_KEY || process.env.PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_aPXWTauRxJ88A88mwLDoPQ_puVi7PZj";
const supabase = createClient(supabaseUrl, supabaseKey);

const DOMAIN = "https://jaxfamlaw.com";
const OUTPUT_FILE = path.join(__dirname, '../public/sitemap.xml');

async function generateSitemap() {
    console.log("🚀 开始生成 Sitemap...");

    // 1. 获取所有案件
    console.log("📥 正在抓取案件数据...");
    const { data: lawsuits, error: err1 } = await supabase
        .from('lawsuits')
        .select('case_number, filed_date');

    if (err1) {
        console.error("❌ 获取案件失败:", err1);
        return;
    }
    console.log(`✅ 获取到 ${lawsuits.length} 个案件`);

    // 2. 获取所有被告 (限制数量防止内存溢出，生产环境应分页)
    console.log("📥 正在抓取被告数据 (Limit 1000)...");
    const { data: defendants, error: err2 } = await supabase
        .from('defendants')
        .select('defendant_name, case_number')
        .limit(1000); // 暂时限制，防止API超时

    if (err2) {
        console.error("❌ 获取被告失败:", err2);
        return;
    }
    console.log(`✅ 获取到 ${defendants.length} 个被告样本`);

    // 3. 构建 XML 内容
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <!-- Static Pages -->
    <url>
        <loc>${DOMAIN}/</loc>
        <changefreq>daily</changefreq>
        <priority>1.0</priority>
    </url>
    <url>
        <loc>${DOMAIN}/case_template.html</loc>
        <changefreq>monthly</changefreq>
        <priority>0.5</priority>
    </url>
`;

    // 4. 添加动态案件链接
    for (const suit of lawsuits) {
        const url = `${DOMAIN}/case_template.html?case=${encodeURIComponent(suit.case_number)}`;
        xml += `    <url>
        <loc>${url}</loc>
        <lastmod>${suit.filed_date || new Date().toISOString().split('T')[0]}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.8</priority>
    </url>
`;
    }

    // 5. 添加动态被告链接 (pSEO 核心)
    for (const def of defendants) {
        if (!def.defendant_name) continue;
        const caseNum = def.case_number || '12-cv-4316'; // Fallback
        const url = `${DOMAIN}/case_template.html?case=${encodeURIComponent(caseNum)}&amp;defendant=${encodeURIComponent(def.defendant_name)}`;
        xml += `    <url>
        <loc>${url}</loc>
        <changefreq>weekly</changefreq>
        <priority>0.9</priority>
    </url>
`;
    }

    xml += `</urlset>`;

    // 6. 写入文件
    // 确保 dist 目录存在
    const distDir = path.dirname(OUTPUT_FILE);
    if (!fs.existsSync(distDir)) {
        fs.mkdirSync(distDir, { recursive: true });
    }

    fs.writeFileSync(OUTPUT_FILE, xml);
    console.log(`🎉 Sitemap 生成完毕! 文件大小: ${(xml.length / 1024).toFixed(2)} KB`);
    console.log(`📁 输出路径: ${OUTPUT_FILE}`);
}

generateSitemap();
