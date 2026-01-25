// Cloudflare Worker - SSR 动态渲染
// 符合 SKILL.md 第6章和第7章要求

export default {
    async fetch(request, env) {
        const url = new URL(request.url);

        // 读取URL参数
        const defendant = url.searchParams.get('defendant');
        const caseParam = url.searchParams.get('case');

        // 1. 获取静态HTML
        const response = await env.ASSETS.fetch(request);

        // 如果不是HTML或没有参数，直接返回
        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('text/html') || (!defendant && !caseParam)) {
            return response;
        }

        // 2. 🔥 SEO强渲染：服务端暴力注入
        return new HTMLRewriter()
            // 注入被告名到tbody（如果有defendant参数）
            .on('tbody#defendants-list', {
                element(element) {
                    if (defendant) {
                        // 暴力注入第一行
                        element.prepend(`
              <tr class="border-b border-gray-200 hover:bg-gray-50">
                <td class="p-3 font-mono text-gray-500">1</td>
                <td class="p-3 font-bold text-black">${defendant}</td>
                <td class="p-3 font-mono text-gray-700">N/A</td>
                <td class="p-3 text-red-600 font-black">CRITICAL</td>
              </tr>
            `, { html: true });
                    }
                }
            })
            // 注入到target-name
            .on('div#target-name', {
                element(element) {
                    if (defendant) {
                        element.setInnerContent(defendant);
                    }
                }
            })
            // 修改title（SEO关键）
            .on('title', {
                element(element) {
                    if (defendant && caseParam) {
                        element.setInnerContent(`${defendant} - Case ${caseParam} | GRICH Legal Intelligence`);
                    } else if (defendant) {
                        element.setInnerContent(`${defendant} Litigation Check | GRICH`);
                    }
                }
            })
            // 修改meta description
            .on('meta[name="description"]', {
                element(element) {
                    if (defendant) {
                        element.setAttribute('content',
                            `Official legal notice: ${defendant} has been identified in federal trademark litigation. Verify risk status and access full case documentation.`
                        );
                    }
                }
            })
            .transform(response);
    }
};
