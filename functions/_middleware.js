export async function onRequest(context) {
    const { request, env } = context;
    const url = new URL(request.url);

    // 仅拦截详情页 (case_template.html)
    // 支持带 .html 和不带后缀的情况
    if (url.pathname.includes('case_template')) {
        const caseParam = url.searchParams.get('case') || '';
        let defendantName = url.searchParams.get('defendant') || '';
        let brandName = url.searchParams.get('brand') || 'BRAND';

        // 🏆 核心升级：如果 URL 没有被告名，但有案号，物理穿透到 Supabase 查询
        if (caseParam && !defendantName) {
            try {
                // 1. 获取连接信息 (优先使用环境变量，其次使用硬编码兜底)
                const sbUrl = env.PUBLIC_SUPABASE_URL || "https://rdlmumybuwveaaeceohj.supabase.co";
                const sbKey = env.PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_aPXWTauRxJ88A88mwLDoPQ_puVi7PZj";

                // 2. 精准查询数据库
                // 我们需要查询该案号下的一个典型被告。案号格式兼容性处理 (1:25-cv-...)
                const searchCase = caseParam.includes(':') ? caseParam : `1:${caseParam}`;
                const queryUrl = `${sbUrl}/rest/v1/defendants?or=(case_number.eq.${encodeURIComponent(caseParam)},case_number.eq.${encodeURIComponent(searchCase)})&select=defendant_name,brand_name&limit=1`;

                const sbResponse = await fetch(queryUrl, {
                    headers: {
                        "apikey": sbKey,
                        "Authorization": `Bearer ${sbKey}`,
                        "Content-Type": "application/json"
                    }
                });

                if (sbResponse.ok) {
                    const data = await sbResponse.json();
                    if (data && data.length > 0) {
                        defendantName = data[0].defendant_name;
                        brandName = data[0].brand_name || brandName;
                        console.log(`✅ SSR Success: Resolved ${caseParam} -> ${defendantName}`);
                    } else {
                        console.warn(`⚠️ SSR Warning: No defendant found for case ${caseParam}`);
                    }
                } else {
                    console.error(`❌ Supabase API Error: ${sbResponse.status}`);
                }
            } catch (err) {
                console.error("Supabase SSR Lookup Exception:", err);
            }
        }

        const response = await context.next();

        // 物理焊接：即便客户端 JS 没加载，源码也必须是真数据
        if (defendantName) {
            return new HTMLRewriter()
                .on('title', {
                    element(el) {
                        el.setInnerContent(`LITIGATION ALERT: ${defendantName.toUpperCase()} v. ${brandName.toUpperCase()} | GRICH Official`);
                    }
                })
                .on('#target-name', {
                    element(el) {
                        el.setInnerContent(defendantName.toUpperCase());
                    }
                })
                .on('#case-number', {
                    element(el) {
                        el.setInnerContent(caseParam.replace('1:', ''));
                    }
                })
                .on('#sidebar-case', {
                    element(el) {
                        el.setInnerContent(`#${caseParam.replace('1:', '')}`);
                    }
                })
                .on('#alert-plaintiff', {
                    element(el) {
                        el.setInnerContent(brandName.toUpperCase());
                    }
                })
                .on('#sidebar-plaintiff', {
                    element(el) {
                        el.setInnerContent(brandName.toUpperCase());
                    }
                })
                .transform(response);
        }
    }

    return context.next();
}
