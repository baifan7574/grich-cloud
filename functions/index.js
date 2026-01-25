// Cloudflare Pages Function: 根路径处理
// 读取defendant参数并动态替换HTML内容
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

    // 动态替换Store Name（表格中的第一个被告）
    // 匹配: <td class="p-3 font-bold text-black">任意内容</td>
    html = html.replace(
        /(<td class="p-3 font-bold text-black">)([^<]+)(<\/td>)/,
        `$1${defendant}$2$3`
    );

    // 替换Target Name
    html = html.replace(
        /(id="target-name"[^>]*>)([^<]*)(</,
        `$1${defendant}$3`
    );

    html = html.replace(
        /(id="report-target-name">)([^<]*)(</,
        `$1${defendant}$3`
    );

    // 返回修改后的HTML
    return new Response(html, {
        headers: response.headers
    });
}
