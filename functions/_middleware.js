// Cloudflare Pages Functions Middleware
// _middleware.js 会被自动识别并应用到所有路由
export async function onRequest(context) {
    const { request, env, next } = context;
    const url = new URL(request.url);

    // 获取defendant参数
    const defendant = url.searchParams.get('defendant');

    // 如果没有defendant参数，直接通过
    if (!defendant) {
        return await next();
    }

    // 获取原始响应
    const response = await next();

    // 只处理HTML
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) {
        return response;
    }

    // 使用HTMLRewriter注入
    return new HTMLRewriter()
        .on('tbody#defendants-list', {
            element(element) {
                element.prepend(`
                    <tr class="border-b border-gray-200 hover:bg-gray-50">
                        <td class="p-3 font-mono text-gray-500">1</td>
                        <td class="p-3 font-bold text-black">${defendant}</td>
                        <td class="p-3 font-mono text-gray-700">N/A</td>
                        <td class="p-3 text-red-600 font-black">CRITICAL</td>
                    </tr>
                `, { html: true });
            }
        })
        .on('#target-name', {
            element(element) {
                element.setInnerContent(defendant);
            }
        })
        .on('#report-target-name', {
            element(element) {
                element.setInnerContent(defendant);
            }
        })
        .transform(response);
}
