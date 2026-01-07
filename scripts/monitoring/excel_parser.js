#!/usr/bin/env node

/**
 * Excel Parser - 自动解析被告人Excel文件
 * 功能: 解析下载的Excel文件，提取被告人信息
 * 运行: node excel_parser.js
 */

import XLSX from 'xlsx';
import fs from 'node:fs';
import path from 'node:path';

/**
 * 从案号推断品牌名
 */
function extractBrandName(caseNumber, fileName = '') {
    // 品牌关键词映射
    const brandKeywords = {
        'nike': 'Nike',
        'adidas': 'Adidas',
        'puma': 'Puma',
        'converse': 'Converse',
        'vans': 'Vans',
        'under armour': 'Under Armour',
        'new balance': 'New Balance',
        'skechers': 'Skechers',
        'crye': 'Crye Precision'
    };

    // 从文件名或案号中查找品牌关键词
    const searchText = (fileName + ' ' + caseNumber).toLowerCase();

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

    // 转换为字符串并清理
    let cleaned = String(name).trim();

    // 移除常见的前缀/后缀
    cleaned = cleaned.replace(/^(Mr\.|Mrs\.|Ms\.|Dr\.)\s+/i, '');
    cleaned = cleaned.replace(/\s+(Inc\.|LLC|Ltd\.|Corp\.)$/i, '');

    // 移除多余空格
    cleaned = cleaned.replace(/\s+/g, ' ');

    return cleaned;
}

/**
 * 解析单个Excel文件
 */
function parseExcelFile(filePath, caseInfo) {
    console.log(`\n[*] Parsing: ${path.basename(filePath)}`);

    try {
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        // 转换为JSON
        const rawData = XLSX.utils.sheet_to_json(sheet);

        console.log(`    Found ${rawData.length} rows`);

        const defendants = [];

        for (const row of rawData) {
            // 尝试多种可能的列名
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

            const defendant = {
                case_number: caseInfo.caseNumber,
                defendant_name: cleaned,
                defendant_email: row['Email'] || row['Contact Email'] || null,
                platform: row['Platform'] || row['Marketplace'] || 'Amazon',
                store_url: row['Store URL'] || row['URL'] || null,
                address: row['Address'] || row['Location'] || null,
                brand_name: extractBrandName(caseInfo.caseNumber, filePath),
                source: 'GBC_Official'
            };

            defendants.push(defendant);
        }

        console.log(`    [+] Extracted ${defendants.length} valid defendants`);
        return defendants;

    } catch (err) {
        console.log(`    [x] Parse error: ${err.message}`);
        return [];
    }
}

/**
 * 主函数
 */
async function main() {
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║         Excel Parser - Defendant Data Extraction      ║');
    console.log('╚════════════════════════════════════════════════════════╝');

    // 读取下载清单
    if (!fs.existsSync('./download_manifest.json')) {
        console.error('\n❌ Error: download_manifest.json not found');
        console.log('   Please run gbc_auto_sniper.js first\n');
        process.exit(1);
    }

    const manifest = JSON.parse(fs.readFileSync('./download_manifest.json', 'utf-8'));

    console.log(`\n[*] Processing ${manifest.filesDownloaded} files...`);

    const allDefendants = [];
    let successCount = 0;
    let errorCount = 0;

    for (const fileInfo of manifest.files) {
        if (!fs.existsSync(fileInfo.filePath)) {
            console.log(`\n[x] File not found: ${fileInfo.filePath}`);
            errorCount++;
            continue;
        }

        const defendants = parseExcelFile(fileInfo.filePath, fileInfo);

        if (defendants.length > 0) {
            allDefendants.push(...defendants);
            successCount++;
        } else {
            errorCount++;
        }
    }

    // 去重（基于案号+姓名）
    const uniqueDefendants = [];
    const seen = new Set();

    for (const defendant of allDefendants) {
        const key = `${defendant.case_number}:${defendant.defendant_name}`;
        if (!seen.has(key)) {
            seen.add(key);
            uniqueDefendants.push(defendant);
        }
    }

    // 保存解析结果
    const output = {
        parseDate: new Date().toISOString(),
        filesProcessed: successCount,
        filesFailed: errorCount,
        totalDefendants: uniqueDefendants.length,
        defendants: uniqueDefendants
    };

    fs.writeFileSync('./parsed_defendants.json', JSON.stringify(output, null, 2));

    // 统计品牌分布
    const brandStats = {};
    for (const defendant of uniqueDefendants) {
        brandStats[defendant.brand_name] = (brandStats[defendant.brand_name] || 0) + 1;
    }

    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║                   PARSING COMPLETE                     ║');
    console.log('╚════════════════════════════════════════════════════════╝');
    console.log(`\n📊 Statistics:`);
    console.log(`   Files Processed: ${successCount}`);
    console.log(`   Files Failed: ${errorCount}`);
    console.log(`   Total Defendants: ${uniqueDefendants.length}`);
    console.log(`\n📈 Brand Distribution:`);

    for (const [brand, count] of Object.entries(brandStats).sort((a, b) => b[1] - a[1])) {
        console.log(`   ${brand}: ${count}`);
    }

    console.log(`\n📁 Output saved to: parsed_defendants.json\n`);
}

// 运行
main().catch(err => {
    console.error('\n❌ Fatal Error:', err);
    process.exit(1);
});
