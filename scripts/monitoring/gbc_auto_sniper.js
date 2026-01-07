#!/usr/bin/env node

/**
 * GBC Auto Sniper - 全自动律所狙击脚本
 * 功能: 自动扫描GBC律所网站，下载被告人Excel文件
 * 运行: node gbc_auto_sniper.js
 */

import fs from 'node:fs';
import https from 'node:https';
import http from 'node:http';
import { URL } from 'node:url';

const BASE_URL = 'http://gbcinternetenforcement.net';

// 配置
const CONFIG = {
    SCAN_YEAR: 25,      // 2025年
    START_ID: 1,
    END_ID: 100,        // 扫描前100个案件
    DELAY_MS: 2000,     // 每次请求间隔2秒
    OUTPUT_DIR: './temp_downloads'
};

// 确保输出目录存在
if (!fs.existsSync(CONFIG.OUTPUT_DIR)) {
    fs.mkdirSync(CONFIG.OUTPUT_DIR, { recursive: true });
}

/**
 * 下载SharePoint文件
 */
async function downloadSharePointFile(sharePointUrl, caseNumber) {
    console.log(`    [*] Downloading Excel from SharePoint...`);

    return new Promise((resolve, reject) => {
        const downloadUrl = new URL(sharePointUrl);
        const protocol = downloadUrl.protocol === 'https:' ? https : http;

        const options = {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        };

        protocol.get(sharePointUrl, options, (res) => {
            // 处理重定向
            if (res.statusCode === 302 || res.statusCode === 301) {
                const redirectUrl = res.headers.location;
                console.log(`    -> Following redirect...`);
                return downloadSharePointFile(redirectUrl, caseNumber)
                    .then(resolve)
                    .catch(reject);
            }

            if (res.statusCode !== 200) {
                return reject(new Error(`HTTP ${res.statusCode}`));
            }

            const fileName = `defendants_${caseNumber.replace(/[:/]/g, '-')}_${Date.now()}.xlsx`;
            const filePath = `${CONFIG.OUTPUT_DIR}/${fileName}`;
            const fileStream = fs.createWriteStream(filePath);

            res.pipe(fileStream);

            fileStream.on('finish', () => {
                fileStream.close();
                console.log(`    [+] Downloaded: ${fileName}`);
                resolve(filePath);
            });

            fileStream.on('error', reject);
        }).on('error', reject);
    });
}

/**
 * 获取网页内容
 */
function fetchPage(url) {
    return new Promise((resolve) => {
        http.get(url, (res) => {
            if (res.statusCode !== 200) {
                res.resume();
                return resolve(null);
            }

            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
        }).on('error', () => resolve(null));
    });
}

/**
 * 扫描单个案件
 */
async function scanCase(caseId) {
    const variations = [
        `${BASE_URL}/${CONFIG.SCAN_YEAR}-${caseId}/`,
        `${BASE_URL}/${CONFIG.SCAN_YEAR}-cv-${caseId}/`,
        `${BASE_URL}/${CONFIG.SCAN_YEAR}-cv-${String(caseId).padStart(5, '0')}/`
    ];

    for (const url of variations) {
        try {
            const html = await fetchPage(url);
            if (!html) continue;

            // 提取SharePoint链接
            const sharePointRegex = /https:\/\/gbcnet-my\.sharepoint\.com[^\s"'<>]+/gi;
            const links = html.match(sharePointRegex);

            if (links && links.length > 0) {
                console.log(`\n[!!!] FOUND: Case 20${CONFIG.SCAN_YEAR}-cv-${caseId}`);
                console.log(`    URL: ${url}`);

                const downloadedFiles = [];

                for (const link of links) {
                    // 只下载Excel文件链接
                    if (link.includes('.xlsx') || link.includes(':x:') || link.includes(':f:')) {
                        try {
                            const filePath = await downloadSharePointFile(link, `${CONFIG.SCAN_YEAR}-${caseId}`);
                            downloadedFiles.push({
                                caseNumber: `1:20${CONFIG.SCAN_YEAR}-cv-${String(caseId).padStart(5, '0')}`,
                                filePath: filePath,
                                sourceUrl: url,
                                sharePointUrl: link
                            });
                        } catch (err) {
                            console.log(`    [x] Download failed: ${err.message}`);
                        }
                    }
                }

                return downloadedFiles;
            }
        } catch (err) {
            // 继续尝试下一个URL格式
        }
    }

    return [];
}

/**
 * 主函数
 */
async function main() {
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║  GBC AUTO SNIPER - Fully Automated Defendant Scraper  ║');
    console.log('╚════════════════════════════════════════════════════════╝');
    console.log(`\n[*] Scanning Year: 20${CONFIG.SCAN_YEAR}`);
    console.log(`[*] Range: ${CONFIG.START_ID} to ${CONFIG.END_ID}`);
    console.log(`[*] Delay: ${CONFIG.DELAY_MS}ms between requests\n`);

    const allDownloadedFiles = [];
    let foundCount = 0;

    for (let i = CONFIG.START_ID; i <= CONFIG.END_ID; i++) {
        process.stdout.write(`[${i}/${CONFIG.END_ID}] Scanning case ${i}...`);

        const files = await scanCase(i);

        if (files.length > 0) {
            foundCount++;
            allDownloadedFiles.push(...files);
            console.log(` ✓`);
        } else {
            process.stdout.write(`\r`); // 清除当前行
        }

        // 延迟避免被封IP
        if (i < CONFIG.END_ID) {
            await new Promise(r => setTimeout(r, CONFIG.DELAY_MS));
        }
    }

    // 保存下载清单
    const manifest = {
        scanDate: new Date().toISOString(),
        scanYear: CONFIG.SCAN_YEAR,
        casesScanned: CONFIG.END_ID - CONFIG.START_ID + 1,
        casesFound: foundCount,
        filesDownloaded: allDownloadedFiles.length,
        files: allDownloadedFiles
    };

    fs.writeFileSync('./download_manifest.json', JSON.stringify(manifest, null, 2));

    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║                    SCAN COMPLETE                       ║');
    console.log('╚════════════════════════════════════════════════════════╝');
    console.log(`\n📊 Statistics:`);
    console.log(`   Cases Scanned: ${manifest.casesScanned}`);
    console.log(`   Cases Found: ${manifest.casesFound}`);
    console.log(`   Files Downloaded: ${manifest.filesDownloaded}`);
    console.log(`\n📁 Manifest saved to: download_manifest.json`);
    console.log(`📂 Files saved to: ${CONFIG.OUTPUT_DIR}/\n`);
}

// 运行
main().catch(err => {
    console.error('\n❌ Fatal Error:', err);
    process.exit(1);
});
