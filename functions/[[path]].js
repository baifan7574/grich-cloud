// Cloudflare Pages Functions: 全站拦截修正版
export async function onRequest(context) {
    const { request, next, env } = context;
    const url = new URL(request.url);

    // 获取defendant参数
    const defendant = url.searchParams.get('defendant');

    // 如果没有defendant参数，直接返回原始页面
    if (!defendant) {
        return await next();
    }

    // 获取原始响应 - 使用next()而不是env.ASSETS
    const response = await next();

    // 只处理HTML
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) {
        return response;
    }

    // 🔥 使用HTMLRewriter服务端注入
    return new HTMLRewriter()
        // 在tbody中注入第一行
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
        // 替换target-name的文本内容
        .on('div#target-name', {
            element(element) {
                element.setInnerContent(defendant);
            }
        })
        .transform(response);
}
