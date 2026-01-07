#!/usr/bin/env node

/**
 * GBC Auto Sniper V2 - 带浏览器自动化的完整版本
 * 功能: 自动扫描、下载、解析、导入被告人数据
 * 运行: node gbc_full_auto.js
 */

import puppeteer from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';
import XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';

// 配置
const CONFIG = {
    SCAN_YEAR: 25,
    START_ID: 29,
    END_ID: 35,
    DELAY_MS: 2000,
    OUTPUT_DIR: './temp_downloads',
    HEADLESS: true  // 设为false可以看到浏览器操作
};

// Supabase配置
const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_KEY;

// 确保输出目录存在
if (!fs.existsSync(CONFIG.OUTPUT_DIR)) {
    fs.mkdirSync(CONFIG.OUTPUT_DIR, { recursive: true });
}

/**
 * 从案号推断品牌名
 */
function extractBrandName(caseNumber, pageTitle = '') {
    const brandKeywords = {
        'nike': 'Nike',
        'adidas': 'Adidas',
        'puma': 'Puma',
        'converse': 'Converse',
        'vans': 'Vans',
        'under armour': 'Under Armour',
        'new balance': 'New Balance',
        'daimler': 'Daimler Truck',
        'mercedes': 'Mercedes-Benz'
    };

    const searchText = (pageTitle + ' ' + caseNumber).toLowerCase();

    for (const [keyword, brandName] of Object.entries(brandKeywords)) {
        if (searchText.includes(keyword)) {
            return brandName;
        }
    }

    return 'Unknown Brand';
}

/**
 * 清洗被告人名字
 */
function cleanDefendantName(name) {
    if (!name) return '';
    let cleaned = String(name).trim();
    cleaned = cleaned.replace(/^(Mr\.|Mrs\.|Ms\.|Dr\.)\s+/i, '');
    cleaned = cleaned.replace(/\s+(Inc\.|LLC|Ltd\.|Corp\.)$/i, '');
    cleaned = cleaned.replace(/\s+/g, ' ');
    return cleaned;
}

/**
 * 解析Excel文件
 */
function parseExcelFile(filePath, caseNumber, brandName) {
    console.log(`    [*] Parsing: ${path.basename(filePath)}`);

    try {
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rawData = XLSX.utils.sheet_to_json(sheet);

        const defendants = [];

        for (const row of rawData) {
            const defendantName =
                row['Defendant Name'] ||
                row['Defendant'] ||
                row['Name'] ||
                row['Seller Name'] ||
                row['Store Name'] ||
                '';

            if (!defendantName) continue;

            const cleaned = cleanDefendantName(defendantName);
            if (!cleaned || cleaned.length < 2) continue;

            defendants.push({
                case_number: caseNumber,
                defendant_name: cleaned,
                defendant_email: row['Email'] || row['Contact Email'] || null,
                platform: row['Platform'] || row['Marketplace'] || 'Amazon',
                store_url: row['Store URL'] || row['URL'] || null,
                address: row['Address'] || row['Location'] || null,
                brand_name: brandName,
                source: 'GBC_Official'
            });
        }

        console.log(`    [+] Extracted ${defendants.length} defendants`);
        return defendants;

    } catch (err) {
        console.log(`    [x] Parse error: ${err.message}`);
        return [];
    }
}

/**
 * 导入到Supabase
 */
async function importToSupabase(defendants) {
    if (!supabaseUrl || !supabaseKey) {
        console.log('    [!] Skipping import: No Supabase credentials');
        return { success: 0, duplicates: 0, errors: 0 };
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    let successCount = 0;
    let duplicateCount = 0;
    let errorCount = 0;

    for (const defendant of defendants) {
        try {
            const { error } = await supabase
                .from('defendants')
                .insert(defendant);

            if (error) {
                if (error.code === '23505') {
                    duplicateCount++;
                } else {
                    errorCount++;
                }
            } else {
                successCount++;
            }

            await new Promise(r => setTimeout(r, 50));

        } catch (err) {
            errorCount++;
        }
    }

    return { success: successCount, duplicates: duplicateCount, errors: errorCount };
}

/**
 * 使用Puppeteer下载SharePoint文件
 */
async function downloadFromSharePoint(page, sharePointUrl, caseNumber) {
    try {
        console.log(`    [*] Opening SharePoint: ${sharePointUrl.substring(0, 60)}...`);

        // 访问SharePoint链接
        await page.goto(sharePointUrl, {
            waitUntil: 'networkidle2',
            timeout: 30000
        });

        // 等待页面加载
        await page.waitForTimeout(3000);

        // 查找Excel文件或下载按钮
        const downloadPath = path.join(process.cwd(), CONFIG.OUTPUT_DIR, `case_${caseNumber.replace(/[:/]/g, '-')}_${Date.now()}.xlsx`);

        // 尝试找到Excel文件链接
        const excelLinks = await page.$$eval('a', links =>
            links
                .filter(a => a.href && (a.href.includes('.xlsx') || a.href.includes('.xls')))
                .map(a => ({ href: a.href, text: a.innerText }))
        );

        if (excelLinks.length > 0) {
            console.log(`    [+] Found ${excelLinks.length} Excel file(s)`);

            // 下载第一个Excel文件
            const fileUrl = excelLinks[0].href;
            const response = await page.goto(fileUrl);
            const buffer = await response.buffer();

            fs.writeFileSync(downloadPath, buffer);
            console.log(`    [+] Downloaded: ${path.basename(downloadPath)}`);

            return downloadPath;
        }

        // 如果没有直接的Excel链接，尝试点击下载按钮
        const downloadButton = await page.$('button[aria-label*="下载"], button[aria-label*="Download"]');

        if (downloadButton) {
            console.log(`    [*] Clicking download button...`);

            // 设置下载路径
            const client = await page.target().createCDPSession();
            await client.send('Page.setDownloadBehavior', {
                behavior: 'allow',
                downloadPath: CONFIG.OUTPUT_DIR
            });

            await downloadButton.click();
            await page.waitForTimeout(5000);

            // 查找下载的文件
            const files = fs.readdirSync(CONFIG.OUTPUT_DIR);
            const latestFile = files
                .filter(f => f.endsWith('.xlsx') || f.endsWith('.xls'))
                .sort((a, b) => {
                    const statA = fs.statSync(path.join(CONFIG.OUTPUT_DIR, a));
                    const statB = fs.statSync(path.join(CONFIG.OUTPUT_DIR, b));
                    return statB.mtimeMs - statA.mtimeMs;
                })[0];

            if (latestFile) {
                const filePath = path.join(CONFIG.OUTPUT_DIR, latestFile);
                console.log(`    [+] Downloaded: ${latestFile}`);
                return filePath;
            }
        }

        console.log(`    [!] No Excel files found on this SharePoint page`);
        return null;

    } catch (err) {
        console.log(`    [x] SharePoint download failed: ${err.message}`);
        return null;
    }
}

/**
 * 扫描单个案件
 */
async function scanCase(browser, caseId) {
    const page = await browser.newPage();

    try {
        const url = `http://gbcinternetenforcement.net/${CONFIG.SCAN_YEAR}-${caseId}/`;

        await page.goto(url, {
            waitUntil: 'networkidle2',
            timeout: 15000
        });

        // 获取页面标题（用于提取品牌名）
        const pageTitle = await page.title();

        // 查找SharePoint链接
        const sharePointLinks = await page.$$eval('a', links =>
            links
                .filter(a => a.href && a.href.includes('sharepoint.com'))
                .map(a => a.href)
        );

        if (sharePointLinks.length === 0) {
            await page.close();
            return null;
        }

        const caseNumber = `1:20${CONFIG.SCAN_YEAR}-cv-${String(caseId).padStart(5, '0')}`;
        const brandName = extractBrandName(caseNumber, pageTitle);

        console.log(`\n[!!!] FOUND: Case ${caseNumber} (${brandName})`);
        console.log(`    URL: ${url}`);
        console.log(`    SharePoint links: ${sharePointLinks.length}`);

        const allDefendants = [];

        // 尝试下载每个SharePoint链接
        for (const sharePointUrl of sharePointLinks) {
            const filePath = await downloadFromSharePoint(page, sharePointUrl, caseNumber);

            if (filePath && fs.existsSync(filePath)) {
                const defendants = parseExcelFile(filePath, caseNumber, brandName);
                allDefendants.push(...defendants);
            }
        }

        await page.close();

        if (allDefendants.length > 0) {
            console.log(`    [*] Importing ${allDefendants.length} defendants to Supabase...`);
            const result = await importToSupabase(allDefendants);
            console.log(`    [+] Import: ✓${result.success} ⏭${result.duplicates} ✗${result.errors}`);
        }

        return {
            caseNumber,
            brandName,
            defendantsFound: allDefendants.length
        };

    } catch (err) {
        await page.close();
        return null;
    }
}

/**
 * 主函数
 */
async function main() {
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║     GBC FULL AUTO - Complete Automation System        ║');
    console.log('╚════════════════════════════════════════════════════════╝');
    console.log(`\n[*] Scanning Year: 20${CONFIG.SCAN_YEAR}`);
    console.log(`[*] Range: ${CONFIG.START_ID} to ${CONFIG.END_ID}`);
    console.log(`[*] Mode: ${CONFIG.HEADLESS ? 'Headless' : 'Visible Browser'}\n`);

    // 启动浏览器
    console.log('[*] Launching browser...');
    const browser = await puppeteer.launch({
        headless: CONFIG.HEADLESS,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const results = [];
    let totalDefendants = 0;

    for (let i = CONFIG.START_ID; i <= CONFIG.END_ID; i++) {
        process.stdout.write(`[${i}/${CONFIG.END_ID}] Scanning case ${i}...`);

        const result = await scanCase(browser, i);

        if (result) {
            results.push(result);
            totalDefendants += result.defendantsFound;
            console.log(` ✓`);
        } else {
            process.stdout.write(`\r`);
        }

        if (i < CONFIG.END_ID) {
            await new Promise(r => setTimeout(r, CONFIG.DELAY_MS));
        }
    }

    await browser.close();

    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║                  AUTOMATION COMPLETE                   ║');
    console.log('╚════════════════════════════════════════════════════════╝');
    console.log(`\n📊 Final Statistics:`);
    console.log(`   Cases Scanned: ${CONFIG.END_ID - CONFIG.START_ID + 1}`);
    console.log(`   Cases Found: ${results.length}`);
    console.log(`   Total Defendants: ${totalDefendants}`);
    console.log(`\n✅ All data has been automatically imported to Supabase!\n`);
}

// 运行
main().catch(err => {
    console.error('\n❌ Fatal Error:', err);
    process.exit(1);
});
