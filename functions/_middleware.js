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
                const sbUrl = env.PUBLIC_SUPABASE_URL || "https://rdlmumybuwveaaeceohj.supabase.co";
                const sbKey = env.PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_aPXWTauRxJ88A88mwLDoPQ_puVi7PZj";

                // 案号归一化处理
                const cleanCase = caseParam.trim();
                const possibleCases = [
                    cleanCase,
                    cleanCase.toLowerCase(),
                    cleanCase.toUpperCase(),
                    `1:${cleanCase}`,
                    `1:${cleanCase.toLowerCase()}`
                ];

                const orClause = possibleCases.map(c => `case_number.eq.${encodeURIComponent(c)}`).join(',');
                const queryUrl = `${sbUrl}/rest/v1/defendants?or=(${orClause})&select=defendant_name,brand_name&limit=1`;

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
                    }
                }
            } catch (err) {
                console.error("Supabase SSR Exception:", err);
            }
        }

        const response = await context.next();

        // 物理强力注入：在 HTML 离开 CF 节点前，硬编码所有 SEO 关键词
        // 哪怕数据库挂了，如果有被告参数，也要注入
        const finalDefendant = (defendantName || url.searchParams.get('defendant') || "").toUpperCase();
        const finalBrand = (brandName || url.searchParams.get('brand') || "BRAND").toUpperCase();
        const finalCase = (caseParam || "").replace('1:', '').toUpperCase();

        if (finalDefendant || finalCase) {
            return new HTMLRewriter()
                .on('title', {
                    element(el) {
                        el.setInnerContent(`LITIGATION ALERT: ${finalDefendant || 'PENDING'} v. ${finalBrand} | Case #${finalCase}`);
                    }
                })
                .on('#target-name', {
                    element(el) {
                        el.setInnerContent(finalDefendant || "PENDING VERIFICATION");
                    }
                })
                .on('#case-number', {
                    element(el) {
                        el.setInnerContent(finalCase);
                    }
                })
                .on('#sidebar-case', {
                    element(el) {
                        el.setInnerContent(`#${finalCase}`);
                    }
                })
                .on('#alert-plaintiff', {
                    element(el) {
                        el.setInnerContent(finalBrand);
                    }
                })
                .on('#sidebar-plaintiff', {
                    element(el) {
                        el.setInnerContent(finalBrand);
                    }
                })
                .on('#case-brand', {
                    element(el) {
                        el.setInnerContent(finalBrand.split(' ')[0]);
                    }
                })
                .on('#main-case-header', {
                    element(el) {
                        if (finalDefendant) {
                            el.setInnerContent(`${finalBrand.split(' ')[0]} v. ${finalDefendant}`);
                        }
                    }
                })
                .transform(response);
        }

    }

    return context.next();
}
