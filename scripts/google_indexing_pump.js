const { google } = require('googleapis');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// 1. 配置
const supabaseUrl = process.env.PUBLIC_SUPABASE_URL || "https://rdlmumybuwveaaeceohj.supabase.co";
const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const DOMAIN = "https://jaxfamlaw.com";
const KEY_PATH = process.env.GOOGLE_APPLICATION_CREDENTIALS || path.join(__dirname, '../.agent/skills/seo-deployer/references/gen-lang-client-0846513202-3d6c54387cae.json');

async function pumpToGoogle() {
    console.log("🚀 [Cloud] 启动 Google Indexing API 强制推送任务...");

    // 1. 查找过去 6 小时内新增的记录
    const timeLimit = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
    console.log(`📡 [Cloud] 正在查询自 ${timeLimit} 以来新增的数据...`);

    const { data: laws, error } = await supabase
        .from('lawsuits')
        .select('case_number')
        .gt('created_at', timeLimit);

    if (error) {
        console.error("❌ [Cloud] 获取数据失败:", error);
        return;
    }

    if (!laws || laws.length === 0) {
        console.log("ℹ️ [Cloud] 过去 6 小时无新数据，推送任务结束。");
        return;
    }

    console.log(`✅ [Cloud] 发现 ${laws.length} 条新货源，准备推送 URL 到 Google...`);

    // 2. 初始化 Google API
    const auth = new google.auth.GoogleAuth({
        keyFile: KEY_PATH,
        scopes: ['https://www.googleapis.com/auth/indexing'],
    });
    const authClient = await auth.getClient();
    const indexing = google.indexing({ version: 'v3', auth: authClient });

    // 3. 逐个推送
    for (const item of laws) {
        const urlToIndex = `${DOMAIN}/case_template.html?case=${encodeURIComponent(item.case_number)}`;
        console.log(`🔗 [Pushing] ${urlToIndex}`);

        try {
            const res = await indexing.urlNotifications.publish({
                requestBody: {
                    url: urlToIndex,
                    type: 'URL_UPDATED',
                },
            });
            console.log(`   ✅ Success: ${res.data.urlNotificationMetadata.latestUpdate.type}`);
        } catch (err) {
            console.error(`   ❌ Failed: ${err.message}`);
        }
    }

    console.log("🎉 [Cloud] 推送任务圆满完成！");
}

if (require.main === module) {
    pumpToGoogle();
}
