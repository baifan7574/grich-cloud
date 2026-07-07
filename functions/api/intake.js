function jsonResponse(body, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-store"
        }
    });
}

function cleanText(value, maxLength = 2000) {
    return String(value || "").trim().slice(0, maxLength);
}

function validEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || ""));
}

const PRODUCT_DETAILS = {
    rapid: {
        name: "Rapid Case Check",
        price: "$49",
        envKey: "PAYHIP_RAPID_URL"
    },
    action: {
        name: "Public Record Action Report",
        price: "$299",
        envKey: "PAYHIP_ACTION_URL"
    },
    urgent: {
        name: "Urgent Attorney-Ready Brief",
        price: "$499",
        envKey: "PAYHIP_URGENT_URL"
    }
};

const FALLBACK_PAYMENT_URLS = {
    rapid: "https://payhip.com/order?link=2GJ5i&pricing_plan=APzDP3KkzE",
    action: "https://payhip.com/order?link=mbni6&pricing_plan=ZoWV5N89GA",
    urgent: "https://payhip.com/order?link=5yhtf&pricing_plan=q3BoKqAqBE"
};

function productForTier(tier) {
    return PRODUCT_DETAILS[tier] || PRODUCT_DETAILS.rapid;
}

function paymentUrlForTier(env, tier) {
    const product = productForTier(tier);
    return cleanText(env[product.envKey], 1000) || FALLBACK_PAYMENT_URLS[tier] || FALLBACK_PAYMENT_URLS.rapid;
}

function escapeHtml(value) {
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function intakeSummary(row, requestId) {
    return [
        `Request ID: ${requestId}`,
        `Tier: ${row.product_tier}`,
        `Email: ${row.email}`,
        `Seller name: ${row.seller_name || "-"}`,
        `Store name: ${row.store_name}`,
        `Platform: ${row.platform || "-"}`,
        `Country: ${row.country || "-"}`,
        `Case number: ${row.case_number || "-"}`,
        `File URL: ${row.uploaded_file_url || "-"}`,
        `Attorney referral requested: ${row.attorney_referral_requested ? "yes" : "no"}`,
        "",
        "Notice summary:",
        row.notice_summary || "-"
    ].join("\n");
}

function createRequestId() {
    const timestamp = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
    return `jfl-${timestamp}-${crypto.randomUUID().slice(0, 8)}`;
}

async function sendResendEmail(env, { to, subject, html, text }) {
    const apiKey = cleanText(env.RESEND_API_KEY, 300);
    if (!apiKey) return { skipped: true, reason: "missing_resend_api_key" };

    const from = cleanText(env.MAIL_FROM, 300) || "JaxFamLaw Records <support@jaxfamlaw.com>";
    const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ from, to, subject, html, text })
    });

    const body = await response.text();
    if (!response.ok) {
        console.error("Resend email failed:", response.status, body);
        return { skipped: false, ok: false, status: response.status };
    }
    return { skipped: false, ok: true };
}

async function sendIntakeEmails(env, row, requestId, paymentUrl) {
    const product = productForTier(row.product_tier);
    const adminEmail = cleanText(env.ADMIN_EMAIL, 300) || "support@jaxfamlaw.com";
    const summary = intakeSummary(row, requestId);
    const paymentLine = paymentUrl
        ? `Payment link: ${paymentUrl}`
        : "Payment link: not configured";

    const adminResult = await sendResendEmail(env, {
        to: adminEmail,
        subject: `[JaxFamLaw Intake] ${product.price} ${product.name} - ${row.store_name}`,
        text: `${summary}\n\n${paymentLine}`,
        html: `
            <h2>New JaxFamLaw intake request</h2>
            <pre style="white-space:pre-wrap;font-family:ui-monospace,Menlo,monospace">${escapeHtml(summary)}</pre>
            <p>${escapeHtml(paymentLine)}</p>
        `
    });

    const customerResult = await sendResendEmail(env, {
        to: row.email,
        subject: `JaxFamLaw Records received your review request ${requestId}`,
        text: [
            `We received your ${product.name} request.`,
            `Reference ID: ${requestId}`,
            "",
            paymentUrl
                ? `Next step: complete payment here: ${paymentUrl}`
                : "Next step: we will reply with payment and review instructions.",
            "",
            "We organize public records and seller-provided notices. We are not a law firm and do not provide legal advice."
        ].join("\n"),
        html: `
            <h2>Request received</h2>
            <p>We received your <strong>${escapeHtml(product.name)}</strong> request.</p>
            <p>Reference ID: <strong>${escapeHtml(requestId)}</strong></p>
            ${
                paymentUrl
                    ? `<p>Next step: <a href="${escapeHtml(paymentUrl)}">complete payment here</a>.</p>`
                    : "<p>Next step: we will reply with payment and review instructions.</p>"
            }
            <p style="color:#475569">We organize public records and seller-provided notices. We are not a law firm and do not provide legal advice.</p>
        `
    });

    return { admin: adminResult, customer: customerResult };
}

async function saveToSupabase(env, row) {
    const sbUrl = env.PUBLIC_SUPABASE_URL?.trim().replace(/\/$/, "");
    const sbKey = (env.SUPABASE_SERVICE_ROLE_KEY || env.PUBLIC_SUPABASE_ANON_KEY)?.trim();
    if (!sbUrl || !sbKey) {
        return { ok: false, unavailable: true, reason: "missing_supabase_config" };
    }

    const response = await fetch(`${sbUrl}/rest/v1/intake_requests`, {
        method: "POST",
        headers: {
            apikey: sbKey,
            Authorization: `Bearer ${sbKey}`,
            "Content-Type": "application/json",
            Prefer: "return=representation"
        },
        body: JSON.stringify(row)
    });

    const text = await response.text();
    if (!response.ok) {
        console.error("Intake insert failed:", response.status, text);
        return { ok: false, unavailable: true, status: response.status, body: text };
    }

    const data = JSON.parse(text);
    const saved = Array.isArray(data) ? data[0] : data;
    return { ok: true, id: saved?.id || null };
}

async function saveToD1(env, row, requestId) {
    const db = env.INTAKE_DB;
    if (!db || typeof db.prepare !== "function") {
        return { ok: false, unavailable: true, reason: "missing_d1_binding" };
    }

    try {
        await db.prepare(`
            CREATE TABLE IF NOT EXISTS intake_requests (
                id TEXT PRIMARY KEY,
                email TEXT NOT NULL,
                seller_name TEXT,
                store_name TEXT NOT NULL,
                platform TEXT,
                country TEXT,
                case_number TEXT,
                notice_summary TEXT,
                uploaded_file_url TEXT,
                product_tier TEXT NOT NULL,
                payment_status TEXT NOT NULL DEFAULT 'pending',
                review_status TEXT NOT NULL DEFAULT 'new',
                attorney_referral_requested INTEGER NOT NULL DEFAULT 0,
                raw_payload TEXT,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            )
        `).run();

        await db.prepare(`
            INSERT INTO intake_requests (
                id,
                email,
                seller_name,
                store_name,
                platform,
                country,
                case_number,
                notice_summary,
                uploaded_file_url,
                product_tier,
                payment_status,
                review_status,
                attorney_referral_requested,
                raw_payload
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
            requestId,
            row.email,
            row.seller_name,
            row.store_name,
            row.platform,
            row.country,
            row.case_number,
            row.notice_summary,
            row.uploaded_file_url,
            row.product_tier,
            row.payment_status,
            row.review_status,
            row.attorney_referral_requested ? 1 : 0,
            JSON.stringify(row)
        ).run();

        return { ok: true, id: requestId, backend: "cloudflare_d1" };
    } catch (error) {
        console.error("D1 intake insert failed:", error);
        return { ok: false, unavailable: true, reason: "d1_insert_failed" };
    }
}

async function saveIntakeRequest(env, row, requestId) {
    const d1Result = await saveToD1(env, row, requestId);
    if (d1Result.ok) return d1Result;

    const supabaseEnabled = cleanText(env.ENABLE_SUPABASE_INTAKE, 10).toLowerCase() === "true";
    if (!supabaseEnabled) {
        return { ok: false, unavailable: true, reason: d1Result.reason || "primary_storage_not_configured" };
    }

    const supabaseResult = await saveToSupabase(env, row);
    if (supabaseResult.ok) {
        return { ok: true, id: supabaseResult.id || requestId, backend: "supabase" };
    }
    return supabaseResult;
}

export async function onRequestPost(context) {
    const { request, env } = context;

    try {
        const payload = await request.json();
        const email = cleanText(payload.email, 240).toLowerCase();
        const storeName = cleanText(payload.store_name, 300);
        const productTier = cleanText(payload.product_tier, 40) || "rapid";

        if (!validEmail(email)) {
            return jsonResponse({ error: "A valid email is required." }, 400);
        }
        if (!storeName) {
            return jsonResponse({ error: "Store name or seller ID is required." }, 400);
        }
        if (!["rapid", "action", "urgent"].includes(productTier)) {
            return jsonResponse({ error: "Invalid product tier." }, 400);
        }

        const row = {
            email,
            seller_name: cleanText(payload.seller_name, 300),
            store_name: storeName,
            platform: cleanText(payload.platform, 120),
            country: cleanText(payload.country, 120),
            case_number: cleanText(payload.case_number, 120),
            notice_summary: cleanText(payload.notice_summary, 4000),
            uploaded_file_url: cleanText(payload.uploaded_file_url, 1000),
            product_tier: productTier,
            payment_status: "pending",
            review_status: "new",
            attorney_referral_requested: Boolean(payload.attorney_referral_requested)
        };

        const paymentUrl = paymentUrlForTier(env, productTier);
        const product = productForTier(productTier);
        const requestId = createRequestId();
        const saveResult = await saveIntakeRequest(env, row, requestId);
        const emailResult = await sendIntakeEmails(env, row, requestId, paymentUrl);

        if (!saveResult.ok && emailResult.admin?.ok) {
            return jsonResponse({
                status: "received_email_backup",
                request_id: requestId,
                product_name: product.name,
                product_price: product.price,
                payment_url: paymentUrl || null,
                next_step: paymentUrl
                    ? "Please complete payment. Your intake was captured by email backup because the database is temporarily unavailable."
                    : "Your intake was captured by email backup. Payment instructions will be sent by email.",
                storage_warning: "database_temporarily_unavailable",
                storage_backend: "email_backup"
            }, 202);
        }

        if (!saveResult.ok) {
            return jsonResponse({
                status: "payment_available_email_required",
                request_id: requestId,
                product_name: product.name,
                product_price: product.price,
                payment_url: paymentUrl || null,
                next_step: "Database and email capture are temporarily unavailable. Please email support@jaxfamlaw.com with your notice details, then complete payment for the selected review tier.",
                storage_warning: "database_and_email_temporarily_unavailable"
            }, 202);
        }

        return jsonResponse({
            status: "received",
            request_id: requestId,
            product_name: product.name,
            product_price: product.price,
            payment_url: paymentUrl || null,
            next_step: paymentUrl
                ? "Please complete payment. Manual public-record review starts after payment is confirmed."
                : "Manual public-record review request was saved. Payment instructions will be sent by email.",
            email_status: {
                admin: emailResult.admin?.ok ? "sent" : emailResult.admin?.skipped ? "not_configured" : "failed",
                customer: emailResult.customer?.ok ? "sent" : emailResult.customer?.skipped ? "not_configured" : "failed"
            },
            storage_backend: saveResult.backend || "primary_storage"
        });
    } catch (error) {
        console.error("Intake runtime error:", error);
        return jsonResponse({ error: "Invalid request payload." }, 400);
    }
}
