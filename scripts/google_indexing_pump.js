const { google } = require('googleapis');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// 1. 配置
const supabaseUrl = process.env.PUBLIC_SUPABASE_URL || "https://rdlmumybuwveaaeceohj.supabase.co";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const DOMAIN = "https://jaxfamlaw.com";
// 云端运行使用环境变量指定的密钥文件路径
const KEY_PATH = process.env.GOOGLE_APPLICATION_CREDENTIALS || path.join(__dirname, '../google_key.json');

async function pumpToGoogle() {
    console.log("🚀 [Cloud SEO] 启动 Google Indexing API 深度推送任务...");

    // 战略调整：不仅推送 6 小时内新增的，还要随机补推老记录，确保 442 条案子全覆盖
    console.log("📡 [Cloud SEO] 正在从数据库抽取推送目标...");

    // 1. 获取过去 24 小时的新案子 (优先级最高)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    let { data: newLaws } = await supabase
        .from('lawsuits')
        .select('case_number')
        .gt('created_at', oneDayAgo)
        .limit(100);

    // 2. 获取老案子作为候补 (确保 400 多个案子能被轮流推送到谷歌)
    let { data: oldLaws } = await supabase
        .from('lawsuits')
        .select('case_number')
        .order('id', { ascending: false }) // 优先推最新的
        .limit(150);

    // 合并并去重
    const combined = [...(newLaws || []), ...(oldLaws || [])];
    const uniqueCases = Array.from(new Set(combined.map(a => a.case_number))).slice(0, 100); // 每次运行最多推 100 条，防止触碰 API 配额

    if (uniqueCases.length === 0) {
        console.log("ℹ️ [Cloud SEO] 仓库空空如也，无需推送。");
        return;
    }

    console.log(`✅ [Cloud SEO] 准备向谷歌汇报 ${uniqueCases.length} 个案件链接...`);

    // 3. 初始化 Google API
    let auth;
    try {
        auth = new google.auth.GoogleAuth({
            keyFile: KEY_PATH,
            scopes: ['https://www.googleapis.com/auth/indexing'],
        });
        const authClient = await auth.getClient();
        const indexing = google.indexing({ version: 'v3', auth: authClient });

        // 4. 逐个推送
        let successCount = 0;
        let failCount = 0;

        for (const caseNo of uniqueCases) {
            const urlToIndex = `${DOMAIN}/case_template.html?case=${encodeURIComponent(caseNo)}`;

            try {
                const res = await indexing.urlNotifications.publish({
                    requestBody: {
                        url: urlToIndex,
                        type: 'URL_UPDATED',
                    },
                });
                console.log(`   ✅ [ACCEPTED] ${caseNo} -> Google API`);
                successCount++;
            } catch (err) {
                console.error(`   ❌ [FAILED] ${caseNo}: ${err.message}`);
                failCount++;
            }

            // 为了防止请求过快被 Google 限制，增加微小延迟
            await new Promise(resolve => setTimeout(resolve, 200));
        }

        console.log("\n" + "=" * 50);
        console.log(`🎉 [Cloud SEO] 任务执行完毕！`);
        console.log(`📈 成功推送: ${successCount} 条`);
        console.log(`📉 失败记录: ${failCount} 条 (可能是配额用完)`);
        console.log("=" * 50);

    } catch (e) {
        console.error("❌ [Cloud SEO] Google API 鉴权失败，请检查密钥是否有效:", e.message);
    }
}

if (require.main === module) {
    pumpToGoogle();
}
