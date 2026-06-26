const DOMAIN = "https://jaxfamlaw.com";

function caseToSlug(caseNumber) {
    return String(caseNumber || "")
        .trim()
        .toLowerCase()
        .replace(/:/g, "-")
        .replace(/[^a-z0-9-]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
}

function slugToCase(slug) {
    const clean = decodeURIComponent(String(slug || ""))
        .trim()
        .replace(/\/+$/g, "");
    return clean.replace(/^([0-9]+)-/, "$1:");
}

function getValue(obj, key, fallback = "---") {
    return (obj && obj[key]) || fallback;
}

function escapeHeader(value) {
    return String(value || "").replace(/[\r\n"]/g, " ").slice(0, 300);
}

async function fetchAsset(context, pathname) {
    const assetUrl = new URL(context.request.url);
    assetUrl.pathname = pathname;
    assetUrl.search = "";

    if (context.env && context.env.ASSETS && context.env.ASSETS.fetch) {
        return context.env.ASSETS.fetch(new Request(assetUrl.toString(), context.request));
    }

    return context.next();
}

export async function onRequest(context) {
    const { request, env, next } = context;
    const url = new URL(request.url);

    if (url.pathname.endsWith("/") && url.pathname !== "/") {
        url.pathname = url.pathname.slice(0, -1);
        return Response.redirect(url.toString(), 301);
    }

    const casePathMatch = url.pathname.match(/^\/cases\/([^/]+)$/);
    const isLegacyCaseTemplate = /^\/case_template(\.html)?$/.test(url.pathname);
    const caseParam = casePathMatch ? slugToCase(casePathMatch[1]) : url.searchParams.get("case");

    if (!casePathMatch && !isLegacyCaseTemplate) {
        return next();
    }

    if (url.searchParams.has("debug_middleware")) {
        return new Response(JSON.stringify({
            status: "Middleware Active",
            pathname: url.pathname,
            caseParam,
            has_supabase_url: Boolean(env.PUBLIC_SUPABASE_URL),
            has_supabase_key: Boolean(env.PUBLIC_SUPABASE_ANON_KEY)
        }), { headers: { "Content-Type": "application/json" } });
    }

    if (!caseParam) {
        return next();
    }

    const sbUrl = env.PUBLIC_SUPABASE_URL?.trim().replace(/\/$/, "");
    const sbKey = env.PUBLIC_SUPABASE_ANON_KEY?.trim();

    if (!sbUrl || !sbKey) {
        return new Response("Server configuration is missing Supabase public URL or anon key.", { status: 500 });
    }

    const headers = { apikey: sbKey, Authorization: `Bearer ${sbKey}` };
    const cleanCaseParam = caseParam.trim();

    try {
        const lawsuitQuery = `${sbUrl}/rest/v1/lawsuits?case_number=eq.${encodeURIComponent(cleanCaseParam)}&select=*&limit=1`;
        const lawsuitResponse = await fetch(lawsuitQuery, { headers });

        if (!lawsuitResponse.ok) {
            const errorDetail = await lawsuitResponse.text();
            return new Response(`Database access failed: ${lawsuitResponse.status}. ${errorDetail}`, { status: 500 });
        }

        const lawsuitResult = await lawsuitResponse.json();
        if (!lawsuitResult.length) {
            return new Response(`Case not found: ${cleanCaseParam}`, { status: 404 });
        }

        const lawsuitData = lawsuitResult[0];
        const defendantsQuery = `${sbUrl}/rest/v1/defendants?case_number=eq.${encodeURIComponent(lawsuitData.case_number)}&select=*`;
        const defendantsResponse = await fetch(defendantsQuery, { headers });
        const defendantsData = defendantsResponse.ok ? await defendantsResponse.json() : [];

        let targetDefendant = null;
        if (defendantsData.length > 0) {
            const defNameParam = url.searchParams.get("defendant");
            targetDefendant = defendantsData.find(d => d.defendant_name === defNameParam) || defendantsData[0];
        }

        const response = casePathMatch
            ? await fetchAsset(context, "/case_template")
            : await next();

        const caseNumber = getValue(lawsuitData, "case_number");
        const plaintiff = getValue(lawsuitData, "plaintiff", "Unknown Plaintiff");
        const court = getValue(lawsuitData, "court", "US District Court");
        const lawFirm = getValue(lawsuitData, "law_firm", "specialized IP litigation counsel");
        const filedDate = getValue(lawsuitData, "filed_date", "recently");
        const canonicalUrl = `${DOMAIN}/cases/${caseToSlug(caseNumber)}`;
        const dynamicTitle = `${plaintiff} Public Court Record Summary | Case ${caseNumber}`;
        const dynamicDescription = `Public record summary for case ${caseNumber}: plaintiff, court, filing reference, law firm and seller-facing business reference notes. Not legal advice.`;
        const seoSummary = `Case number ${caseNumber} appears in public court record data connected to ${plaintiff}. The record was filed on ${filedDate} in the ${court}, with ${lawFirm} listed in the available data. JaxFamLaw organizes this information as a business reference for cross-border sellers. It does not confirm liability, does not guarantee completeness or accuracy, and is not a substitute for advice from a licensed attorney.`;

        return new HTMLRewriter()
            .on("title", { element(el) { el.setInnerContent(dynamicTitle); } })
            .on("#meta-description", { element(el) { el.setAttribute("content", escapeHeader(dynamicDescription)); } })
            .on("#canonical-url", { element(el) { el.setAttribute("href", canonicalUrl); } })
            .on("#seo-case-summary", { element(el) { el.setInnerContent(seoSummary); } })
            .on("#sidebar-case", { element(el) { el.setInnerContent(`#${caseNumber.replace(/^1:/, "")}`); } })
            .on("#sidebar-court", { element(el) { el.setInnerContent(court); } })
            .on("#sidebar-judge", { element(el) { el.setInnerContent(getValue(lawsuitData, "judge", "[PENDING ASSIGNMENT]")); } })
            .on("#sidebar-plaintiff", { element(el) { el.setInnerContent(plaintiff); } })
            .on("#sidebar-attorney", { element(el) { el.setInnerContent(lawFirm); } })
            .on("#sidebar-date", { element(el) { el.setInnerContent(filedDate); } })
            .on("#alert-plaintiff", { element(el) { el.setInnerContent(plaintiff); } })
            .on("#case-brand", { element(el) { el.setInnerContent(plaintiff.split(" ")[0]); } })
            .on("#main-case-header", { element(el) { el.setInnerContent(`${plaintiff} v. ${getValue(targetDefendant, "defendant_name", "COUNTERFEITS")}`); } })
            .on("#case-number", { element(el) { el.setInnerContent(caseNumber.replace(/^1:/, "")); } })
            .on("#case-attorney", { element(el) { el.setInnerContent(lawFirm); } })
            .on("#target-id-label", { element(el) { el.setInnerContent(getValue(targetDefendant, "id", "N/A").substring(0, 8)); } })
            .on("#target-name", { element(el) { el.setInnerContent(getValue(targetDefendant, "defendant_name", "SEARCHING...")); } })
            .on("#target-platform", { element(el) { el.setInnerContent(getValue(targetDefendant, "platform", "N/A")); } })
            .on("#evidence-status", { element(el) { el.setInnerContent(targetDefendant ? "PUBLIC RECORD MATCH" : "CONFIRMING..."); } })
            .transform(response);

    } catch (err) {
        console.error("Middleware runtime error:", err);
        const resp = await next();
        const h = new Headers(resp.headers);
        h.set("X-Middleware-Error", escapeHeader(err.message));
        return new Response(resp.body, { headers: h, status: resp.status });
    }
}
