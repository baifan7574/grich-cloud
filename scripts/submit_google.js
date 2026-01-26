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
    const ENV_CREDENTIALS = process.env.GOOGLE_JSON_KEY;

    let authConfig = null;

    if (ENV_CREDENTIALS) {
        console.log('🔑 检测到 GOOGLE_JSON_KEY 环境变量，使用内存凭证...');
        try {
            authConfig = {
                credentials: JSON.parse(ENV_CREDENTIALS),
                scopes: ['https://www.googleapis.com/auth/webmasters.readonly', 'https://www.googleapis.com/auth/webmasters']
            };
        } catch (e) {
            console.error('❌ 环境变量 JSON 解析失败');
        }
    }

    if (!authConfig && fs.existsSync(AUTH_FILE)) {
        console.log('📂 检测到本地 Key 文件，使用文件凭证...');
        authConfig = {
            keyFile: AUTH_FILE,
            scopes: ['https://www.googleapis.com/auth/webmasters.readonly', 'https://www.googleapis.com/auth/webmasters']
        };
    }

    if (!authConfig) {
        console.warn('⚠️ 未检测到有效凭证 (Env/File)，尝试降级为 Ping...');
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
        const auth = new google.auth.GoogleAuth(authConfig);
        const searchconsole = google.searchconsole({ version: 'v1', auth });

        // 提交 Sitemap
        await searchconsole.sitemaps.submit({
            siteUrl: 'https://jaxfamlaw.com/',
            feedpath: SITEMAP_URL,
        });

        console.log(`✅ [SUCCESS] 成功向 Search Console 提交: ${SITEMAP_URL}`);
        console.log(`📡 Google 索引爬虫已被激活。请密切关注 "Discovered pages" 数据。`);
    } catch (error) {
        console.error('❌ Google API 提交错误:', error.message);
        console.log('💡 常见原因：Service Account 未在 Search Console 中添加为 "Owner"。');
    }
}

submitSitemap();
