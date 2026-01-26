export async function onRequest(context) {
    const { request } = context;
    const url = new URL(request.url);

    // 仅拦截详情页
    if (url.pathname.includes('case_template')) {
        const caseParam = url.searchParams.get('case') || '';
        const defendantParam = url.searchParams.get('defendant') || '';
        const brandParam = url.searchParams.get('brand') || 'BRAND';

        const response = await context.next();

        // 物理焊接：即便 JS 没动，源码也必须变
        return new HTMLRewriter()
            .on('title', {
                element(el) {
                    if (defendantParam) {
                        el.setInnerContent(`LITIGATION ALERT: ${defendantParam.toUpperCase()} v. ${brandParam} | GRICH Official`);
                    }
                }
            })
            .on('#target-name', {
                element(el) {
                    if (defendantParam) {
                        el.setInnerContent(defendantParam.toUpperCase());
                    }
                }
            })
            .on('#case-number', {
                element(el) {
                    if (caseParam) {
                        el.setInnerContent(caseParam.replace('1:', ''));
                    }
                }
            })
            .on('#sidebar-case', {
                element(el) {
                    if (caseParam) {
                        el.setInnerContent(`#${caseParam.replace('1:', '')}`);
                    }
                }
            })
            .on('#alert-plaintiff', {
                element(el) {
                    if (brandParam) el.setInnerContent(brandParam);
                }
            })
            .transform(response);
    }

    return context.next();
}
