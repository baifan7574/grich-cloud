// Cloudflare Pages Function: Dynamic defendant parameter replacement
export async function onRequest(context) {
    const { request } = context;
    const url = new URL(request.url);

    // 读取URL参数
    const defendant = url.searchParams.get('defendant');
    const caseId = url.searchParams.get('case');

    // 如果有case参数，返回case_template.html
    if (caseId) {
        // 读取静态HTML文件
        const response = await context.env.ASSETS.fetch(new URL('/case_template.html', url.origin));
        let html = await response.text();

        // 如果有defendant参数，替换HTML中的Store Name
        if (defendant) {
            // 替换第一个被告名（表格中的第一行）
            html = html.replace(
                /(<td class="p-3 font-bold text-black">)[^<]+(<\/td>)/,
                `$1${defendant}$2`
            );

            // 替换Section II的target name
            html = html.replace(
                /(id="report-target-name"[^>]*>)[^<]*(</,
                `$1${defendant}$2`
            );

            // 替换main title中的target name
            html = html.replace(
                /(id="target-name"[^>]*>)[^<]*(</,
                `$1${defendant}$2`
            );
        }

        return new Response(html, {
            headers: { 'Content-Type': 'text/html;charset=UTF-8' }
        });
    }

    // 默认返回index.html
    return context.env.ASSETS.fetch(request);
}
