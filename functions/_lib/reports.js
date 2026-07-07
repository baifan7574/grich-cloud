import { VERIFIED_CASE_PAGE_HTML } from "../verified_case_pages.js";
import { cleanText, escapeHtml, productForTier, sendResendEmail } from "./orders.js";

function caseToSlug(caseNumber) {
    return cleanText(caseNumber, 120)
        .toLowerCase()
        .replace(/:/g, "-")
        .replace(/[^a-z0-9-]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
}

function pick(html, regex) {
    const match = html.match(regex);
    return match ? match[1].replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").trim() : "";
}

export async function getCaseEvidence(env, caseNumber) {
    const cleanCase = cleanText(caseNumber, 120);
    if (!cleanCase) {
        return {
            status: "not_confirmed",
            case_number: "",
            source: "No case number provided"
        };
    }

    const slug = caseToSlug(cleanCase);
    const verifiedHtml = VERIFIED_CASE_PAGE_HTML[slug];
    if (verifiedHtml) {
        return {
            status: "confirmed",
            case_number: cleanCase,
            case_name: pick(verifiedHtml, /<dt[^>]*>Case name<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/i),
            plaintiff: pick(verifiedHtml, /<dt[^>]*>Plaintiff<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/i),
            filed_date: pick(verifiedHtml, /<dt[^>]*>Filed date<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/i),
            court: pick(verifiedHtml, /<div class="mt-2 font-black">([\s\S]*?)<\/div>\s*<div class="mt-1 text-sm text-slate-300">Court field/i) || "District Court, N.D. Illinois",
            source: "CourtListener RECAP",
            source_url: pick(verifiedHtml, /href="([^"]+)" rel="nofollow noopener" target="_blank">CourtListener RECAP/i),
            store_match: "not_confirmed"
        };
    }

    const sbUrl = env.PUBLIC_SUPABASE_URL?.trim().replace(/\/$/, "");
    const sbKey = (env.SUPABASE_SERVICE_ROLE_KEY || env.PUBLIC_SUPABASE_ANON_KEY)?.trim();
    if (!sbUrl || !sbKey) {
        return {
            status: "not_confirmed",
            case_number: cleanCase,
            source: "Search temporarily unavailable"
        };
    }

    try {
        const headers = { apikey: sbKey, Authorization: `Bearer ${sbKey}` };
        const query = `${sbUrl}/rest/v1/lawsuits?case_number=eq.${encodeURIComponent(cleanCase)}&select=case_number,plaintiff,court,law_firm,filed_date,raw_data_url&limit=1`;
        const response = await fetch(query, { headers });
        if (!response.ok) throw new Error(`Supabase ${response.status}`);
        const rows = await response.json();
        if (!rows.length) {
            return { status: "not_confirmed", case_number: cleanCase, source: "No matching public source in available database" };
        }
        return {
            status: "confirmed",
            case_number: rows[0].case_number,
            plaintiff: rows[0].plaintiff || "",
            court: rows[0].court || "",
            law_firm: rows[0].law_firm || "",
            filed_date: rows[0].filed_date || "",
            source: "Supabase public-record database",
            source_url: rows[0].raw_data_url || "",
            store_match: "not_confirmed"
        };
    } catch (error) {
        console.error("Case evidence lookup failed:", error);
        return {
            status: "not_confirmed",
            case_number: cleanCase,
            source: "Search temporarily unavailable"
        };
    }
}

function evidenceTable(order, evidence) {
    const confirmed = evidence.status === "confirmed";
    return [
        "| Item | Finding | Evidence label | Source |",
        "| --- | --- | --- | --- |",
        `| Case number | ${evidence.case_number || order.case_number || "-"} | ${confirmed ? "Confirmed from public source" : "Not confirmed"} | ${evidence.source_url || evidence.source || "-"} |`,
        `| Court | ${evidence.court || "-"} | ${evidence.court ? "Confirmed from public source" : "Not confirmed"} | ${evidence.source || "-"} |`,
        `| Plaintiff | ${evidence.plaintiff || "-"} | ${evidence.plaintiff ? "Confirmed from public source" : "Not confirmed"} | ${evidence.source || "-"} |`,
        `| Counsel / filer | ${evidence.law_firm || "-"} | ${evidence.law_firm ? "Confirmed from public source" : "Not confirmed"} | ${evidence.source || "-"} |`,
        `| Store name / seller ID | ${order.store_name || "-"} | User-provided notice | Customer intake |`,
        `| Notice details | ${order.notice_summary ? "Provided by customer" : "-"} | User-provided notice | Customer intake |`,
        `| Store appears in public material | - | Not confirmed / requires further review | Manual review needed |`
    ].join("\n");
}

function commonHeader(order, evidence) {
    const product = productForTier(order.product_tier);
    return [
        `# ${product.name} - ${order.store_name || "Marketplace Seller"}`,
        "",
        `Request ID: ${order.id}`,
        `Customer email: ${order.email}`,
        `Product tier: ${product.price} ${product.name}`,
        `Store name / seller ID: ${order.store_name || "-"}`,
        `Seller / company name: ${order.seller_name || "-"}`,
        `Platform: ${order.platform || "-"}`,
        `Country: ${order.country || "-"}`,
        `Case number provided: ${order.case_number || "-"}`,
        `Report date: ${new Date().toISOString().slice(0, 10)}`,
        "",
        "Evidence rule: confirmed public facts, customer-provided facts, and not-confirmed items are separated below.",
        "",
        "## Evidence Table",
        evidenceTable(order, evidence)
    ].join("\n");
}

function rapidReport(order, evidence) {
    const confirmed = evidence.status === "confirmed";
    const result = confirmed
        ? "Case number found, store match not confirmed"
        : "Notice provided by seller, public record not confirmed";
    return [
        commonHeader(order, evidence),
        "",
        "## Quick Result",
        result,
        "",
        "## Chinese Explanation",
        confirmed
            ? `我们在可用公开记录中找到了客户提供的案件号 ${evidence.case_number}。公开记录可确认的部分包括案件号、原告/法院等基础信息；店铺名、卖家ID、冻结金额和平台期限仍主要来自客户提供的通知，不能自动当作公开事实。这个结果适合先做材料整理，再决定是否需要进一步找美国律师核对。`
            : "目前没有在可用公开记录中确认该案件号。这不代表通知一定是假的，也可能是案件信息延迟、封存、号码格式不同，或客户提供的信息不完整。建议先保存原始平台通知、邮件头、店铺截图和资金冻结截图，再做下一步判断。",
        "",
        "## Urgency Level",
        order.notice_summary && /deadline|frozen|freeze|tro|schedule a|冻结|期限|资金/i.test(order.notice_summary)
            ? "High: notice text mentions deadline, TRO / Schedule A, frozen funds, or urgent account impact."
            : "Medium: case or notice needs manual review before relying on a store-name match.",
        "",
        "## 72-Hour Material Checklist",
        "- Original platform email / message screenshot",
        "- Full seller account name and store URL",
        "- Frozen amount or affected listing amount, if any",
        "- Case number and court name shown in the notice",
        "- Plaintiff / brand name shown in the notice",
        "- Any deadline shown by the platform",
        "- Product listing screenshots",
        "- Supplier invoice / authorization / license records, if any",
        "- Prior communication with platform or claimant, if any",
        "",
        "## Next Step Options",
        "- If only verification is needed, keep this report with the original notice.",
        "- If a fuller explanation is needed, request the Public Record Action Report.",
        "- If there is frozen funds or a deadline, prepare an attorney-ready packet.",
        "",
        "## Disclaimer",
        "JaxFamLaw Records is an independent public-record intelligence and document-organization service. We are not a law firm and do not provide legal advice. This report organizes public records and seller-provided materials for business reference and attorney preparation."
    ].join("\n");
}

function actionReport(order, evidence) {
    return [
        commonHeader(order, evidence),
        "",
        "## Page 1: Executive Summary",
        `The seller submitted a marketplace notice for ${order.store_name || "the store"} on ${order.platform || "the platform"}. The public-record check result is: ${evidence.status === "confirmed" ? "case number found from available public source" : "not confirmed from available public source"}. Store-name matching is not confirmed unless the seller notice or later public filing proves it.`,
        "",
        "## Page 2: Public Record Summary",
        `Case caption: ${evidence.case_name || "-"}`,
        `Court: ${evidence.court || "-"}`,
        `Case number: ${evidence.case_number || order.case_number || "-"}`,
        `Plaintiff: ${evidence.plaintiff || "-"}`,
        `Counsel: ${evidence.law_firm || "-"}`,
        `Filed date: ${evidence.filed_date || "-"}`,
        `Source: ${evidence.source_url || evidence.source || "-"}`,
        "",
        "Known limitations: public data may be incomplete, delayed, sealed, mismatched, or outdated. This report does not confirm liability or predict any platform/court result.",
        "",
        "## Page 3: Seller Notice Explanation",
        `Customer-provided notice summary: ${order.notice_summary || "-"}`,
        "The notice should be checked against the original platform email, visible deadline, listed case number, plaintiff, court, and counsel. Screenshots alone are weaker than original emails or downloadable notice files.",
        "",
        "## Page 4: Store / Defendant Matching Review",
        "| Matching item | Finding | Evidence label | Notes |",
        "| --- | --- | --- | --- |",
        `| Exact store name | ${order.store_name || "-"} | User-provided notice | Needs public filing or notice attachment review |`,
        "| Seller ID / merchant ID | - | Not confirmed | Not enough structured data in intake |",
        "| Product listing / ASIN / SKU | - | Not confirmed | Ask seller for listing screenshots |",
        "| Email or account identifier | - | Not confirmed | Needs original platform notice |",
        "",
        "Conclusion: possible match only if the customer notice ties the store/seller ID to the case. Public case-level data alone does not prove store inclusion.",
        "",
        "## Page 5: Business Impact Triage",
        order.notice_summary && /frozen|freeze|冻结|funds|deadline|期限/i.test(order.notice_summary)
            ? "Impact level: High. The customer text mentions frozen funds, deadline, or similar account impact."
            : "Impact level: Medium. There is not enough structured information to confirm frozen funds or deadline from the intake alone.",
        "",
        "## Page 6: Attorney Preparation Checklist",
        "- Platform notice PDF or screenshot",
        "- Full case number and court name",
        "- Store name / seller ID / platform account screenshot",
        "- Frozen amount and account balance screenshot",
        "- Product listings involved",
        "- Supplier invoices and authorization documents",
        "- Product images and source of images",
        "- Prior communication with claimant or platform",
        "- Timeline of events",
        "",
        "## Page 7: Questions for Attorney",
        "- Does the public case record match this store/account?",
        "- What deadlines matter from the notice?",
        "- What documents should be prepared before paid consultation?",
        "- What is the likely scope of attorney work?",
        "- What fees and timeline should the seller expect?",
        "",
        "## Disclaimer",
        "JaxFamLaw Records is an independent public-record intelligence and document-organization service. We are not a law firm and do not provide legal advice. This report does not predict case outcome, account recovery, fund release, or platform action."
    ].join("\n");
}

function urgentReport(order, evidence) {
    return [
        actionReport(order, evidence),
        "",
        "# One-Page English Case Brief",
        "",
        "## Seller Information",
        `Seller / company name: ${order.seller_name || "-"}`,
        `Store name / seller ID: ${order.store_name || "-"}`,
        `Platform: ${order.platform || "-"}`,
        `Country: ${order.country || "-"}`,
        `Contact email: ${order.email}`,
        "Preferred language: Chinese / English support requested",
        "",
        "## Notice Summary",
        `Case number shown: ${order.case_number || "-"}`,
        `Court shown: ${evidence.court || "-"}`,
        `Plaintiff shown: ${evidence.plaintiff || "-"}`,
        `Counsel shown: ${evidence.law_firm || "-"}`,
        `Notice notes: ${order.notice_summary || "-"}`,
        "",
        "## Attorney Inquiry Email Draft",
        `Subject: Request for review: marketplace seller notice / case ${order.case_number || ""}`,
        "",
        "Dear [Attorney Name],",
        "",
        `I am contacting you on behalf of a marketplace seller who received a platform notice referencing case ${order.case_number || "[case number]"}. We have organized the seller-provided notice, public-record references, store information, and available documents into the attached brief.`,
        "",
        "The seller is requesting attorney review of the notice, case match, deadlines, and next document requirements. The seller understands that your firm would provide any legal advice or representation separately after conflict check and engagement.",
        "",
        "Please let us know whether this matter appears to fall within your review scope, what additional documents you need, your estimated consultation or review fee, and your expected response timeline.",
        "",
        "Regards,",
        "JaxFamLaw Records",
        "",
        "## Urgent Document Checklist",
        "- Original platform notice",
        "- Full email headers if available",
        "- Platform account screenshot showing seller/store ID",
        "- Frozen funds screenshot, if any",
        "- Listing IDs / ASINs / SKUs involved",
        "- Product images and source files",
        "- Supplier invoice records",
        "- Authorization or license documents, if any",
        "- Prior communication with platform or claimant",
        "- Owner name, company name, country, and contact email"
    ].join("\n");
}

export async function buildReportDraft(env, order) {
    const evidence = await getCaseEvidence(env, order.case_number);
    if (order.product_tier === "urgent") return urgentReport(order, evidence);
    if (order.product_tier === "action") return actionReport(order, evidence);
    return rapidReport(order, evidence);
}

export async function saveReportDraft(db, orderId, draft, status = "drafted") {
    await db.prepare(`
        UPDATE intake_requests
        SET report_draft = ?,
            report_status = ?,
            review_status = CASE WHEN review_status IN ('new', 'paid') THEN ? ELSE review_status END,
            updated_at = ?
        WHERE id = ?
    `).bind(draft, status, status, new Date().toISOString(), orderId).run();
}

export async function sendReportEmail(env, order, draft) {
    const product = productForTier(order.product_tier);
    const html = `
        <h2>${escapeHtml(product.name)} delivered</h2>
        <p>Reference ID: <strong>${escapeHtml(order.id)}</strong></p>
        <p>This report separates confirmed public-source facts, customer-provided notice details, and not-confirmed items.</p>
        <pre style="white-space:pre-wrap;font-family:ui-monospace,Menlo,monospace;line-height:1.5">${escapeHtml(draft)}</pre>
        <p style="color:#475569">JaxFamLaw Records is not a law firm and does not provide legal advice.</p>
    `;
    const text = `${product.name} delivered\nReference ID: ${order.id}\n\n${draft}`;
    return sendResendEmail(env, {
        to: order.email,
        subject: `JaxFamLaw ${product.name} report - ${order.id}`,
        html,
        text
    });
}

export async function markReportSent(db, orderId) {
    const now = new Date().toISOString();
    await db.prepare(`
        UPDATE intake_requests
        SET report_status = 'sent',
            review_status = 'sent',
            report_sent_at = ?,
            updated_at = ?
        WHERE id = ?
    `).bind(now, now, orderId).run();
}

