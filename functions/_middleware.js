export async function onRequest(context) {
    const { request, env, next } = context;
    const url = new URL(request.url);

    // 仅拦截案件详情页的请求
    if (url.pathname.includes('case_template')) {
        const caseParam = url.searchParams.get('case');

        // 如果没有 'case' 参数, 则不进行任何处理，让前端页面显示错误
        if (!caseParam) {
            return next();
        }

        // --- 阶段一：安全、完整的数据抓取 ---
        const sbUrl = env.PUBLIC_SUPABASE_URL;
        const sbKey = env.SUPABASE_SERVICE_ROLE_KEY;

        // 如果 Cloudflare 环境变量中未设置密钥，则快速失败
        if (!sbUrl || !sbKey) {
            console.error("SSR 致命错误: Cloudflare 中未设置 Supabase 环境变量。");
            return new Response("服务器配置错误。", { status: 500 });
        }
        
        const headers = { "apikey": sbKey, "Authorization": `Bearer ${sbKey}` };

        try {
            // 1. 获取主要的案件记录 (使用更稳健的案号匹配)
            const cleanCaseParam = caseParam.trim();
            const orClause = `case_number.eq.${encodeURIComponent(cleanCaseParam)},case_number.eq.1:${encodeURIComponent(cleanCaseParam)}`;
            const lawsuitQuery = `${sbUrl}/rest/v1/lawsuits?or=(${orClause})&select=*&limit=1`;
            const lawsuitResponse = await fetch(lawsuitQuery, { headers });
            
            if (!lawsuitResponse.ok) throw new Error(`Supabase 案件抓取失败: ${lawsuitResponse.status}`);
            
            const lawsuitResult = await lawsuitResponse.json();
            if (lawsuitResult.length === 0) {
                 // 案件未找到，让客户端处理“未找到”的消息
                 return next();
            }
            const lawsuitData = lawsuitResult[0];

            // 2. 获取该案件所有相关的被告
            const defendantsQuery = `${sbUrl}/rest/v1/defendants?case_number=eq.${encodeURIComponent(caseParam)}&select=*`;
            const defendantsResponse = await fetch(defendantsQuery, { headers });

            if (!defendantsResponse.ok) throw new Error(`Supabase 被告抓取失败: ${defendantsResponse.status}`);

            const defendantsData = await defendantsResponse.json();

            // 3. 确定当前页面主要目标被告
            let targetDefendant = null;
            if (defendantsData.length > 0) {
                const defendantParam = url.searchParams.get('defendant');
                if (defendantParam) {
                    targetDefendant = defendantsData.find(d => d.defendant_name === defendantParam) || defendantsData[0];
                } else {
                    targetDefendant = defendantsData[0];
                }
            }

            // --- 阶段三：强化 SSR 注入 ---
            const response = await next();
            
            const get = (obj, path, fallback = '---') => path.split('.').reduce((acc, part) => acc && acc[part], obj) || fallback;

            return new HTMLRewriter()
                // 注入页面标题
                .on('title', {
                    element(el) {
                        const defendantName = get(targetDefendant, 'defendant_name', 'PENDING');
                        const plaintiff = get(lawsuitData, 'plaintiff', 'BRAND');
                        el.setInnerContent(`诉讼警报: ${defendantName} v. ${plaintiff} | 案件 #${get(lawsuitData, 'case_number')}`);
                    }
                })
                // 注入侧边栏数据
                .on('#sidebar-case', { element(el) { el.setInnerContent(`#${get(lawsuitData, 'case_number').replace('1:', '')}`) } })
                .on('#sidebar-court', { element(el) { el.setInnerContent(get(lawsuitData, 'court')) } })
                .on('#sidebar-judge', { element(el) { el.setInnerContent(get(lawsuitData, 'judge', '待分配')) } })
                .on('#sidebar-plaintiff', { element(el) { el.setInnerContent(get(lawsuitData, 'plaintiff')) } })
                .on('#sidebar-attorney', { element(el) { el.setInnerContent(get(lawsuitData, 'law_firm', '记录在案的律师')) } })
                .on('#sidebar-date', { element(el) { el.setInnerContent(get(lawsuitData, 'filed_date')) } })
                // 注入主内容区数据
                .on('#alert-plaintiff', { element(el) { el.setInnerContent(get(lawsuitData, 'plaintiff')) } })
                .on('#case-brand', { element(el) { el.setInnerContent(get(lawsuitData, 'plaintiff').split(' ')[0]) } })
                .on('#main-case-header', { element(el) { el.setInnerContent(`${get(lawsuitData, 'plaintiff')} v. ${get(targetDefendant, 'defendant_name', '假冒产品')}`) } })
                .on('#case-number', { element(el) { el.setInnerContent(get(lawsuitData, 'case_number').replace('1:', '')) } })
                .on('#case-attorney', { element(el) { el.setInnerContent(get(lawsuitData, 'law_firm', '记录在案的律师')) } })
                 // 注入目标被告信息
                .on('#target-id-label', { element(el) { el.setInnerContent(get(targetDefendant, 'id', 'N/A').substring(0,8)) } })
                .on('#target-name', { element(el) { el.setInnerContent(get(targetDefendant, 'defendant_name', '待验证')) } })
                .on('#target-platform', { element(el) { el.setInnerContent(get(targetDefendant, 'platform', 'N/A')) } })
                .transform(response);

        } catch (err) {
            console.error("SSR 中间件异常:", err);
            // 如果发生任何错误，则传递给原始页面处理
            return next();
        }
    }

    // 对于任何其他页面，直接传递
    return next();
}
