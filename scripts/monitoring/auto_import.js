#!/usr/bin/env node

/**
 * Auto Import - 自动导入被告人数据到Supabase
 * 功能: 将解析的被告人数据自动导入数据库
 * 运行: node auto_import.js
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';

// 从环境变量读取配置
const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Error: Missing Supabase credentials');
    console.log('   Set PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * 导入单个被告人
 */
async function importDefendant(defendant) {
    try {
        const { data, error } = await supabase
            .from('defendants')
            .insert(defendant)
            .select();

        if (error) {
            if (error.code === '23505') {
                // Unique constraint violation - 重复数据
                return { status: 'duplicate', error: null };
            }
            return { status: 'error', error: error.message };
        }

        return { status: 'success', error: null };

    } catch (err) {
        return { status: 'error', error: err.message };
    }
}

/**
 * 批量导入（带进度显示）
 */
async function batchImport(defendants) {
    console.log(`\n[*] Importing ${defendants.length} defendants to Supabase...`);
    console.log(`[*] Database: ${supabaseUrl.substring(0, 40)}...`);

    let successCount = 0;
    let duplicateCount = 0;
    let errorCount = 0;
    const errors = [];

    const total = defendants.length;

    for (let i = 0; i < total; i++) {
        const defendant = defendants[i];

        // 显示进度
        if (i % 10 === 0 || i === total - 1) {
            const progress = ((i + 1) / total * 100).toFixed(1);
            process.stdout.write(`\r[${i + 1}/${total}] Progress: ${progress}% | ✓ ${successCount} | ⏭ ${duplicateCount} | ✗ ${errorCount}`);
        }

        const result = await importDefendant(defendant);

        if (result.status === 'success') {
            successCount++;
        } else if (result.status === 'duplicate') {
            duplicateCount++;
        } else {
            errorCount++;
            errors.push({
                defendant: defendant.defendant_name,
                case: defendant.case_number,
                error: result.error
            });
        }

        // 延迟避免速率限制
        await new Promise(r => setTimeout(r, 50));
    }

    console.log('\n'); // 换行

    return {
        successCount,
        duplicateCount,
        errorCount,
        errors
    };
}

/**
 * 主函数
 */
async function main() {
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║      Auto Import - Supabase Defendant Uploader        ║');
    console.log('╚════════════════════════════════════════════════════════╝');

    // 读取解析结果
    if (!fs.existsSync('./parsed_defendants.json')) {
        console.error('\n❌ Error: parsed_defendants.json not found');
        console.log('   Please run excel_parser.js first\n');
        process.exit(1);
    }

    const data = JSON.parse(fs.readFileSync('./parsed_defendants.json', 'utf-8'));
    const defendants = data.defendants;

    if (defendants.length === 0) {
        console.log('\n⚠️  No defendants to import\n');
        process.exit(0);
    }

    // 执行导入
    const result = await batchImport(defendants);

    // 保存导入报告
    const report = {
        importDate: new Date().toISOString(),
        totalRecords: defendants.length,
        successCount: result.successCount,
        duplicateCount: result.duplicateCount,
        errorCount: result.errorCount,
        errors: result.errors
    };

    fs.writeFileSync('./import_report.json', JSON.stringify(report, null, 2));

    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║                   IMPORT COMPLETE                      ║');
    console.log('╚════════════════════════════════════════════════════════╝');
    console.log(`\n📊 Results:`);
    console.log(`   ✅ Successfully imported: ${result.successCount}`);
    console.log(`   ⏭️  Duplicates skipped: ${result.duplicateCount}`);
    console.log(`   ❌ Errors: ${result.errorCount}`);

    if (result.errors.length > 0) {
        console.log(`\n⚠️  First 5 errors:`);
        result.errors.slice(0, 5).forEach(err => {
            console.log(`   - ${err.defendant} (${err.case}): ${err.error}`);
        });
    }

    console.log(`\n📁 Full report saved to: import_report.json\n`);

    // 退出码
    process.exit(result.errorCount > 0 ? 1 : 0);
}

// 运行
main().catch(err => {
    console.error('\n❌ Fatal Error:', err);
    process.exit(1);
});
