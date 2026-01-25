// Cloudflare Pages Function for case_template.html
// 专门处理 case_template.html 的动态注入
export async function onRequest(context) {
    const { request, next } = context;
    const url = new URL(request.url);

    // 获取defendant参数
    const defendant = url.searchParams.get('defendant');

    // 如果没有defendant参数，直接返回原始文件
    if (!defendant) {
        return await next();
    }

    // 获取原始HTML
    const response = await next();
    let html = await response.text();

    // 🔥 服务端暴力注入
    // 替换空的tbody
    const tbodyPattern = /<tbody id="defendants-list">\s*<!-- Rows inserted by JS -->\s*<\/tbody>/;

    const injectedRow = `<tbody id="defendants-list">
                        <tr class="border-b border-gray-200 hover:bg-gray-50">
                            <td class="p-3 font-mono text-gray-500">1</td>
                            <td class="p-3 font-bold text-black">${defendant}</td>
                            <td class="p-3 font-mono text-gray-700">N/A</td>
                            <td class="p-3 text-red-600 font-black">CRITICAL</td>
                        </tr>
                        <!-- Rows inserted by JS -->
                    </tbody>`;

    html = html.replace(tbodyPattern, injectedRow);

    // 替换Target Name
    html = html.replace(
        /(id="target-name"[^>]*>)LOCATING TARGET\.\.\.(</,
        `$1${defendant}$3`
    );

    return new Response(html, {
        headers: response.headers
    });
}
