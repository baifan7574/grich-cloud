export async function onRequest(context) {
    const { request, env, next } = context;
    const url = new URL(request.url);

    // 0. 全局统一重定向: 移除末尾斜杠 (解决重复收录和重定向链问题)
    if (url.pathname.endsWith('/') && url.pathname !== '/') {
        url.pathname = url.pathname.slice(0, -1);
        return Response.redirect(url.toString(), 301);
    }

    // 1. 路径匹配优化: 兼容 /case_template, /case_template.html 以及带斜杠的情况
    const isCaseTemplate = url.pathname.match(/^\/case_template(\.html)?$/);
    
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

            // 构造霸屏标题 (Dynamic SEO Title - English)
            const dynamicTitle = `[URGENT] Lawsuit Alert: ${get(lawsuitData, 'plaintiff')} Intellectual Property Litigation (Case: ${get(lawsuitData, 'case_number')}) | Jaxfamlaw`;

            // 构造富文本案件概述 (200 words SEO content - English)
            const seoSummary = `Case number ${get(lawsuitData, 'case_number')} is a federal intellectual property infringement lawsuit initiated by ${get(lawsuitData, 'plaintiff')}. This litigation was officially filed on ${get(lawsuitData, 'filed_date') || 'recently'} in the ${get(lawsuitData, 'court')}. The plaintiff is represented by ${get(lawsuitData, 'law_firm', 'specialized IP litigation counsel')}. If you are operating a cross-border e-commerce storefront on platforms such as Amazon, AliExpress, Temu, or Shein, and have discovered that your store funds are frozen or have received a platform infringement notice regarding this brand, you may be listed as a defendant in the court's sealed Schedule A. We strongly advise you to obtain the complete case dossier immediately to verify the evidence against your store and formulate a strategic response. Failure to respond may result in a default judgment, leading to the permanent forfeiture of all frozen assets.`;

            // 构造纯净的 Canonical URL (去掉 defendant 等多余参数)
            const canonicalUrl = `https://jaxfamlaw.com/case_template?case=${encodeURIComponent(get(lawsuitData, 'case_number'))}`;

            return new HTMLRewriter()
                .on('title', { element(el) { el.setInnerContent(dynamicTitle); } })
                .on('#canonical-url', { element(el) { el.setAttribute('href', canonicalUrl); } })
                .on('#seo-case-summary', { element(el) { el.setInnerContent(seoSummary); } })
                .on('#sidebar-case', { element(el) { el.setInnerContent(`#${get(lawsuitData, 'case_number').replace(/^1:/, '')}`) } })
                .on('#sidebar-court', { element(el) { el.setInnerContent(get(lawsuitData, 'court')) } })
                .on('#sidebar-judge', { element(el) { el.setInnerContent(get(lawsuitData, 'judge', '[PENDING ASSIGNMENT]')) } })
                .on('#sidebar-plaintiff', { element(el) { el.setInnerContent(get(lawsuitData, 'plaintiff')) } })
                .on('#sidebar-attorney', { element(el) { el.setInnerContent(get(lawsuitData, 'law_firm', 'GREER, BURNS & CRAIN, LTD.')) } })
                .on('#sidebar-date', { element(el) { el.setInnerContent(get(lawsuitData, 'filed_date')) } })
                .on('#alert-plaintiff', { element(el) { el.setInnerContent(get(lawsuitData, 'plaintiff')) } })
                .on('#case-brand', { element(el) { el.setInnerContent(get(lawsuitData, 'plaintiff').split(' ')[0]) } })
                .on('#main-case-header', { element(el) { el.setInnerContent(`${get(lawsuitData, 'plaintiff')} v. ${get(targetDefendant, 'defendant_name', 'COUNTERFEITS')}`) } })
                .on('#case-number', { element(el) { el.setInnerContent(get(lawsuitData, 'case_number').replace(/^1:/, '')) } })
                .on('#case-attorney', { element(el) { el.setInnerContent(get(lawsuitData, 'law_firm', 'GREER, BURNS & CRAIN, LTD.')) } })
                .on('#target-id-label', { element(el) { el.setInnerContent(get(targetDefendant, 'id', 'N/A').substring(0,8)) } })
                .on('#target-name', { element(el) { el.setInnerContent(get(targetDefendant, 'defendant_name', 'SEARCHING...')) } })
                .on('#target-platform', { element(el) { el.setInnerContent(get(targetDefendant, 'platform', 'N/A')) } })
                .on('#evidence-status', { element(el) { el.setInnerContent(targetDefendant ? 'EVIDENCE SECURED' : 'CONFIRMING...') } })
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
