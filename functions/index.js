// Cloudflare Pages Function: 服务端暴力注入
// SEO强渲染 - 直接在HTML中插入defendant内容
export async function onRequest(context) {
    const { request, next } = context;
    const url = new URL(request.url);

    // 获取URL参数
    const defendant = url.searchParams.get('defendant');

    // 如果没有defendant参数，直接返回原始资源
    if (!defendant) {
        return await next();
    }

    // 获取原始响应
    const response = await next();

    // 只处理HTML响应
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) {
        return response;
    }

    // 读取HTML内容
    let html = await response.text();

    // 🔥 服务端暴力注入：直接往tbody里塞HTML
    // 找到空的 <tbody id="defendants-list">
    const tbodyPattern = /<tbody id="defendants-list">\s*<!-- Rows inserted by JS -->\s*<\/tbody>/;

    // 创建完整的表格行HTML
    const injectedRow = `<tbody id="defendants-list">
                        <tr class="border-b border-gray-200 hover:bg-gray-50">
                            <td class="p-3 font-mono text-gray-500">1</td>
                            <td class="p-3 font-bold text-black">${defendant}</td>
                            <td class="p-3 font-mono text-gray-700">N/A</td>
                            <td class="p-3 text-red-600 font-black">CRITICAL</td>
                        </tr>
                        <!-- Rows inserted by JS -->
                    </tbody>`;

    // 替换空tbody为包含defendant的tbody
    html = html.replace(tbodyPattern, injectedRow);

    // 同时替换其他显示目标名的地方
    // 替换 id="target-name"
    html = html.replace(
        /(id="target-name"[^>]*>)LOCATING TARGET\.\.\.(</,
        `$1${defendant}$3`
    );

    // 替换 Section II 中的 id="report-target-name"
    html = html.replace(
        /(id="report-target-name"><\/div>)/,
        `id="report-target-name">${defendant}</div>`
    );

    // 返回修改后的HTML
    return new Response(html, {
        headers: response.headers
    });
}
