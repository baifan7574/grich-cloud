#!/usr/bin/env node
/**
 * Cloudflare Pages 环境变量自动配置脚本
 * 
 * 使用方法:
 * 1. 获取 Cloudflare API Token: https://dash.cloudflare.com/profile/api-tokens
 *    需要权限: "Cloudflare Pages - Edit"
 * 2. 运行: CLOUDFLARE_API_TOKEN=your_token node setup-cloudflare-env.js
 */

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || '';
const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN || '';
const PROJECT_NAME = 'grich-cloud';

const ENV_VARS = {
    'PUBLIC_SUPABASE_URL': 'https://rdlmumybuwveaaeceohj.supabase.co',
    'PUBLIC_SUPABASE_ANON_KEY': 'sb_publishable_aPXWTauRxJ88A88mwLDoPQ_puVi7PZj',
    'DEEPSEEK_API_KEY': 'sk-zsfyaqkoqahmfltyduxwdaltkndxztjkwugxkikuzzgllvko',
    'COURTLISTENER_TOKEN': '7f4374db0b69b37c02779dd59ed9c3b0fb90883d'
};

async function setEnvironmentVariables() {
    if (!API_TOKEN) {
        console.error('❌ 错误: 缺少 CLOUDFLARE_API_TOKEN 环境变量');
        console.log('\n请按以下步骤操作:');
        console.log('1. 访问: https://dash.cloudflare.com/profile/api-tokens');
        console.log('2. 点击 "Create Token"');
        console.log('3. 选择 "Edit Cloudflare Workers" 模板');
        console.log('4. 运行: CLOUDFLARE_API_TOKEN=your_token node setup-cloudflare-env.js');
        process.exit(1);
    }

    console.log('🔧 开始配置 Cloudflare Pages 环境变量...\n');

    for (const [key, value] of Object.entries(ENV_VARS)) {
        try {
            const response = await fetch(
                `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/pages/projects/${PROJECT_NAME}/env`,
                {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${API_TOKEN}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        deployment_configs: {
                            production: {
                                env_vars: {
                                    [key]: {
                                        type: 'secret_text',
                                        value: value
                                    }
                                }
                            }
                        }
                    })
                }
            );

            if (response.ok) {
                console.log(`✅ ${key} 配置成功`);
            } else {
                const error = await response.json();
                console.error(`❌ ${key} 配置失败:`, error);
            }
        } catch (error) {
            console.error(`❌ ${key} 配置出错:`, error.message);
        }
    }

    console.log('\n🎉 环境变量配置完成!');
    console.log('请访问 Cloudflare Dashboard 触发重新部署。');
}

setEnvironmentVariables();
