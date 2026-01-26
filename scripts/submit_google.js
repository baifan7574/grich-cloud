const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// 注意：此脚本需要 googleapis 库
// npm install googleapis

async function submitSitemap() {
    console.log('🚀 准备向 Google 提交最新 Sitemap...');

    const SITEMAP_URL = 'https://jaxfamlaw.com/sitemap.xml';
    const AUTH_FILE = path.join(__dirname, 'google-service-account.json');

    if (!fs.existsSync(AUTH_FILE)) {
        console.warn('⚠️ 未检测到 google-service-account.json，尝试使用环境变量方式提交...');
        // 如果没有 Service Account，退而求其次使用简单的 HTTP Ping
        // 虽然 Google 已不再推荐 Ping 方式，但作为兜底逻辑保留
        try {
            const fetch = (await import('node-fetch')).default;
            const res = await fetch(`https://www.google.com/ping?sitemap=${encodeURIComponent(SITEMAP_URL)}`);
            if (res.ok) {
                console.log('✅ Google Ping 提交成功 (Level 1: Passive)');
            } else {
                console.error('❌ Google Ping 失败');
            }
        } catch (err) {
            console.error('❌ 兜底提交失败:', err.message);
        }
        return;
    }

    try {
        const auth = new google.auth.GoogleAuth({
            keyFile: AUTH_FILE,
            scopes: ['https://www.googleapis.com/auth/webmasters.readonly', 'https://www.googleapis.com/auth/webmasters'],
        });

        const searchconsole = google.searchconsole({ version: 'v1', auth });

        // 提交 Sitemap
        await searchconsole.sitemaps.submit({
            siteUrl: 'https://jaxfamlaw.com/',
            feedpath: SITEMAP_URL,
        });

        console.log(`✅ 成功向 Search Console 提交: ${SITEMAP_URL} (Level 2: Active)`);
    } catch (error) {
        console.error('❌ Google API 提交错误:', error.message);
        console.log('💡 请确保 Google Service Account 已在 Search Console 中被添加为“所有者”或“完全控制者”。');
    }
}

submitSitemap();
