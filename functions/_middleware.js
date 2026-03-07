export async function onRequest(context) {
    const { request, env, next } = context;
    const url = new URL(request.url);

    // 1. 路径匹配优化: 兼容 /case_template, /case_template.html 以及带斜杠的情况
    const isCaseTemplate = url.pathname.match(/^\/case_template(\.html)?\/?$/);
    
    if (isCaseTemplate) {
        // DEBUG 模式: 通过 ?debug_middleware=1 激活
        const isDebug = url.searchParams.has('debug_middleware');
        const caseParam = url.searchParams.get('case');

        if (isDebug) {
            return new Response(JSON.stringify({
                status: "Middleware Active",
                pathname: url.pathname,
                caseParam: caseParam,
                supabase_url: env.PUBLIC_SUPABASE_URL ? `${env.PUBLIC_SUPABASE_URL.substring(0, 15)}...` : "MISSING",
                supabase_key_prefix: env.PUBLIC_SUPABASE_ANON_KEY ? `${env.PUBLIC_SUPABASE_ANON_KEY.substring(0, 5)}...` : "MISSING",
                env_keys: Object.keys(env)
            }), { headers: { "Content-Type": "application/json" } });
        }

        if (!caseParam) {
            return next();
        }

        // --- 阶段一：安全、完整的数据抓取 ---
        const sbUrl = env.PUBLIC_SUPABASE_URL?.trim().replace(/\/$/, ""); 
        const sbKey = env.PUBLIC_SUPABASE_ANON_KEY?.trim();

        if (!sbUrl || !sbKey) {
            return new Response(`服务器配置缺失: URL=${!!sbUrl}, KEY=${!!sbKey}`, { status: 500 });
        }
        
        const headers = { "apikey": sbKey, "Authorization": `Bearer ${sbKey}` };

        try {
            // 1. 获取案件记录 (简化查询以防 500)
            const cleanCaseParam = caseParam.trim();
            
            // 直接使用精准匹配，如果失败再报错
            const lawsuitQuery = `${sbUrl}/rest/v1/lawsuits?case_number=eq.${encodeURIComponent(cleanCaseParam)}&select=*&limit=1`;
            const lawsuitResponse = await fetch(lawsuitQuery, { headers });
            
            if (!lawsuitResponse.ok) {
                const errorDetail = await lawsuitResponse.text();
                return new Response(`数据库拒绝访问: ${lawsuitResponse.status}. 详情: ${errorDetail}`, { status: 500 });
            }
            
            const lawsuitResult = await lawsuitResponse.json();
            if (lawsuitResult.length === 0) {
                 // 强制报错，不要显示 CASE_PENDING 误导用户
                 return new Response(`未找到案号: ${cleanCaseParam}. 请核对数据库。`, { status: 404 });
            }
            const lawsuitData = lawsuitResult[0];

            // 2. 获取被告信息
            const defendantsQuery = `${sbUrl}/rest/v1/defendants?case_number=eq.${encodeURIComponent(lawsuitData.case_number)}&select=*`;
            const defendantsResponse = await fetch(defendantsQuery, { headers });
            const defendantsData = defendantsResponse.ok ? await defendantsResponse.json() : [];

            // 3. 确定目标被告
            let targetDefendant = null;
            if (defendantsData.length > 0) {
                const defNameParam = url.searchParams.get('defendant');
                targetDefendant = defendantsData.find(d => d.defendant_name === defNameParam) || defendantsData[0];
            }

            // --- 阶段三：SSR 注入 ---
            const response = await next();
            const get = (obj, path, fallback = '---') => path.split('.').reduce((acc, part) => acc && acc[part], obj) || fallback;

            return new HTMLRewriter()
                .on('title', {
                    element(el) {
                        const name = get(targetDefendant, 'defendant_name', 'PENDING');
                        el.setInnerContent(`法律警报: ${name} v. ${get(lawsuitData, 'plaintiff')} | 案件 #${get(lawsuitData, 'case_number')}`);
                    }
                })
                .on('#sidebar-case', { element(el) { el.setInnerContent(`#${get(lawsuitData, 'case_number').replace(/^1:/, '')}`) } })
                .on('#sidebar-court', { element(el) { el.setInnerContent(get(lawsuitData, 'court')) } })
                .on('#sidebar-judge', { element(el) { el.setInnerContent(get(lawsuitData, 'judge', '待分配')) } })
                .on('#sidebar-plaintiff', { element(el) { el.setInnerContent(get(lawsuitData, 'plaintiff')) } })
                .on('#sidebar-attorney', { element(el) { el.setInnerContent(get(lawsuitData, 'law_firm', '记录在案的律师')) } })
                .on('#sidebar-date', { element(el) { el.setInnerContent(get(lawsuitData, 'filed_date')) } })
                .on('#alert-plaintiff', { element(el) { el.setInnerContent(get(lawsuitData, 'plaintiff')) } })
                .on('#case-brand', { element(el) { el.setInnerContent(get(lawsuitData, 'plaintiff').split(' ')[0]) } })
                .on('#main-case-header', { element(el) { el.setInnerContent(`${get(lawsuitData, 'plaintiff')} v. ${get(targetDefendant, 'defendant_name', '待定被告')}`) } })
                .on('#case-number', { element(el) { el.setInnerContent(get(lawsuitData, 'case_number').replace(/^1:/, '')) } })
                .on('#case-attorney', { element(el) { el.setInnerContent(get(lawsuitData, 'law_firm', '记录在案的律师')) } })
                .on('#target-id-label', { element(el) { el.setInnerContent(get(targetDefendant, 'id', 'N/A').substring(0,8)) } })
                .on('#target-name', { element(el) { el.setInnerContent(get(targetDefendant, 'defendant_name', '加载中...')) } })
                .on('#target-platform', { element(el) { el.setInnerContent(get(targetDefendant, 'platform', 'N/A')) } })
                .on('#evidence-status', { element(el) { el.setInnerContent(targetDefendant ? '已取证' : '核验中...') } })
                .transform(response);

        } catch (err) {
            console.error("SSR 运行异常:", err);
            const resp = await next();
            const h = new Headers(resp.headers);
            h.set("X-Middleware-Error", err.message);
            return new Response(resp.body, { headers: h });
        }
    }

    return next();
}
