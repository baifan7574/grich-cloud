import { VERIFIED_CASE_PAGE_HTML } from "./verified_case_pages.js";

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

function notConfirmedPage(caseParam, reason = "not_confirmed") {
    const safeCase = escapeHeader(caseParam || "requested case");
    const message = reason === "search_temporarily_unavailable"
        ? "Search is temporarily unavailable. You can still submit the notice for manual public-record review."
        : "This case was not confirmed in the currently available public-record database. This does not mean the notice is false.";
    return new Response(`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Case Not Confirmed | JaxFamLaw Records</title><meta name="robots" content="noindex,follow">
<script src="https://cdn.tailwindcss.com"></script></head>
<body class="bg-slate-950 text-white"><main class="max-w-3xl mx-auto px-5 py-16">
<a href="/" class="text-amber-400 font-black">JaxFamLaw Records</a>
<h1 class="mt-8 text-4xl font-black">Public record not confirmed</h1>
<p class="mt-4 text-slate-300">Case searched: <strong>${safeCase}</strong></p>
<p class="mt-4 text-slate-300">${message}</p>
<div class="mt-8 flex flex-col sm:flex-row gap-3">
<a href="/intake?case=${encodeURIComponent(caseParam || "")}" class="bg-green-600 px-5 py-3 rounded font-black text-center">Submit Notice for Manual Review</a>
<a href="/sample-report" class="border border-white/20 px-5 py-3 rounded font-black text-center">View Sample Report</a>
</div>
<p class="mt-8 text-xs text-slate-500">Not a law firm. Not legal advice. Public data may be sealed, delayed, incomplete, mismatched, or outdated.</p>
</main></body></html>`, {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" }
    });
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

    const isCasePathWithSlash = /^\/cases\/[^/]+\/$/.test(url.pathname);
    if (url.pathname.endsWith("/") && url.pathname !== "/" && !isCasePathWithSlash) {
        url.pathname = url.pathname.slice(0, -1);
        return Response.redirect(url.toString(), 301);
    }

    const casePathMatch = url.pathname.match(/^\/cases\/([^/]+)\/?$/);
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
        if (isLegacyCaseTemplate) {
            return Response.redirect(`${DOMAIN}/sample-report`, 301);
        }
        return next();
    }

    const cleanCaseParam = caseParam.trim();
    if (isLegacyCaseTemplate) {
        const redirectUrl = new URL(`${DOMAIN}/cases/${caseToSlug(cleanCaseParam)}/`);
        const defendant = url.searchParams.get("defendant");
        if (defendant) {
            redirectUrl.searchParams.set("defendant", defendant);
        }
        return Response.redirect(redirectUrl.toString(), 301);
    }

    if (casePathMatch) {
        const verifiedCaseHtml = VERIFIED_CASE_PAGE_HTML[casePathMatch[1]];
        if (verifiedCaseHtml) {
            return new Response(verifiedCaseHtml, {
                status: 200,
                headers: {
                    "Content-Type": "text/html; charset=utf-8",
                    "Cache-Control": "public, max-age=300"
                }
            });
        }
    }

    const sbUrl = env.PUBLIC_SUPABASE_URL?.trim().replace(/\/$/, "");
    const sbKey = (env.SUPABASE_SERVICE_ROLE_KEY || env.PUBLIC_SUPABASE_ANON_KEY)?.trim();

    if (!sbUrl || !sbKey) {
        return notConfirmedPage(cleanCaseParam, "search_temporarily_unavailable");
    }

    const headers = { apikey: sbKey, Authorization: `Bearer ${sbKey}` };

    try {
        const lawsuitQuery = `${sbUrl}/rest/v1/lawsuits?case_number=eq.${encodeURIComponent(cleanCaseParam)}&select=*&limit=1`;
        const lawsuitResponse = await fetch(lawsuitQuery, { headers });

        if (!lawsuitResponse.ok) {
            console.error("Database access failed:", lawsuitResponse.status, await lawsuitResponse.text());
            return notConfirmedPage(cleanCaseParam, "search_temporarily_unavailable");
        }

        const lawsuitResult = await lawsuitResponse.json();
        if (!lawsuitResult.length) {
            return notConfirmedPage(cleanCaseParam);
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
        const canonicalUrl = `${DOMAIN}/cases/${caseToSlug(caseNumber)}/`;
        const dynamicTitle = `${plaintiff} Public Court Record Summary | Case ${caseNumber}`;
        const dynamicDescription = `Public record summary for case ${caseNumber}: plaintiff, court, filing reference, law firm and seller-facing business reference notes. Not legal advice.`;
        const seoSummary = `Case number ${caseNumber} appears in public court record data connected to ${plaintiff}. The record was filed on ${filedDate} in the ${court}, with ${lawFirm} listed in the available data. JaxFamLaw organizes this information as a business reference for cross-border sellers. It does not confirm liability, does not promise completeness or accuracy, and is not a substitute for advice from a licensed attorney.`;

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
