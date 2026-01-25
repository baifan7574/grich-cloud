// Cloudflare Pages Functions: 全站拦截
// [[path]].js 捕获所有路径请求
export async function onRequest(context) {
    const { request, env } = context;
    const url = new URL(request.url);

    // 获取defendant参数
    const defendant = url.searchParams.get('defendant');

    // 获取原始静态页面
    const response = await env.ASSETS.fetch(request);

    // 如果没有defendant参数或不是HTML，直接返回
    const contentType = response.headers.get('content-type') || '';
    if (!defendant || !contentType.includes('text/html')) {
        return response;
    }

    // 🔥 使用HTMLRewriter服务端注入
    return new HTMLRewriter()
        // 替换表格中的第一个被告名
        .on('tbody#defendants-list', {
            element(element) {
                // 注入第一行表格数据
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
        // 替换target-name
        .on('#target-name', {
            element(element) {
                element.setInnerContent(defendant);
            }
        })
        // 替换report-target-name
        .on('#report-target-name', {
            element(element) {
                element.setInnerContent(defendant);
            }
        })
        .transform(response);
}
