export function jsonResponse(body, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-store"
        }
    });
}

export function cleanText(value, maxLength = 2000) {
    return String(value || "").trim().slice(0, maxLength);
}

export function escapeHtml(value) {
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

export function productForTier(tier) {
    const products = {
        rapid: { tier: "rapid", name: "Rapid Case Check", price: "$49", productKeys: ["2GJ5i"] },
        action: { tier: "action", name: "Public Record Action Report", price: "$299", productKeys: ["mbni6"] },
        urgent: { tier: "urgent", name: "Urgent Attorney-Ready Brief", price: "$499", productKeys: ["5yhtf"] }
    };
    return products[tier] || products.rapid;
}

export function tierFromPayhipPayload(payload) {
    const item = Array.isArray(payload?.items) ? payload.items[0] : null;
    const key = cleanText(item?.product_key, 40);
    const name = cleanText(item?.product_name, 200).toLowerCase();
    if (key === "2GJ5i" || name.includes("rapid")) return "rapid";
    if (key === "mbni6" || name.includes("action")) return "action";
    if (key === "5yhtf" || name.includes("urgent")) return "urgent";
    if (Number(payload?.price) >= 49900) return "urgent";
    if (Number(payload?.price) >= 29900) return "action";
    return "rapid";
}

export async function sha256Hex(value) {
    const bytes = new TextEncoder().encode(value);
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, "0")).join("");
}

export function requireAdmin(request, env) {
    const token = cleanText(env.ADMIN_API_TOKEN, 500);
    if (!token) return { ok: false, status: 503, error: "ADMIN_API_TOKEN is not configured." };
    const header = cleanText(request.headers.get("Authorization"), 600);
    const bearer = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
    if (bearer !== token) return { ok: false, status: 401, error: "Unauthorized." };
    return { ok: true };
}

export async function sendResendEmail(env, { to, subject, html, text }) {
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
        return { skipped: false, ok: false, status: response.status, body };
    }
    return { skipped: false, ok: true };
}

export async function ensureOrderSchema(db) {
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
        CREATE TABLE IF NOT EXISTS payment_events (
            id TEXT PRIMARY KEY,
            event_type TEXT NOT NULL,
            email TEXT,
            product_tier TEXT,
            request_id TEXT,
            payload TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
    `).run();

    const existing = await db.prepare("PRAGMA table_info(intake_requests)").all();
    const columns = new Set((existing.results || []).map(row => row.name));
    const additions = [
        ["paid_at", "TEXT"],
        ["payment_provider", "TEXT"],
        ["payment_id", "TEXT"],
        ["payment_payload", "TEXT"],
        ["report_status", "TEXT"],
        ["report_draft", "TEXT"],
        ["report_sent_at", "TEXT"],
        ["updated_at", "TEXT"]
    ];
    for (const [name, type] of additions) {
        if (!columns.has(name)) {
            await db.prepare(`ALTER TABLE intake_requests ADD COLUMN ${name} ${type}`).run();
        }
    }
}

export async function getOrderById(db, requestId) {
    const result = await db.prepare("SELECT * FROM intake_requests WHERE id = ? LIMIT 1")
        .bind(requestId)
        .first();
    return result || null;
}

export async function findMatchingOrder(db, { email, tier, paymentId }) {
    if (paymentId) {
        const byPayment = await db.prepare("SELECT * FROM intake_requests WHERE payment_id = ? LIMIT 1")
            .bind(paymentId)
            .first();
        if (byPayment) return byPayment;
    }

    const byEmailTier = await db.prepare(`
        SELECT * FROM intake_requests
        WHERE lower(email) = lower(?) AND product_tier = ?
        ORDER BY
            CASE payment_status WHEN 'pending' THEN 0 ELSE 1 END,
            created_at DESC
        LIMIT 1
    `).bind(email, tier).first();

    return byEmailTier || null;
}

export async function markOrderPaid(db, order, payload) {
    const now = new Date().toISOString();
    await db.prepare(`
        UPDATE intake_requests
        SET payment_status = 'paid',
            review_status = CASE WHEN review_status = 'new' THEN 'paid' ELSE review_status END,
            paid_at = COALESCE(paid_at, ?),
            payment_provider = 'payhip',
            payment_id = ?,
            payment_payload = ?,
            updated_at = ?
        WHERE id = ?
    `).bind(
        now,
        cleanText(payload?.id, 100),
        JSON.stringify(payload || {}),
        now,
        order.id
    ).run();
    return getOrderById(db, order.id);
}

export async function savePaymentEvent(db, payload, requestId = null) {
    const id = cleanText(payload?.id, 100) || crypto.randomUUID();
    await db.prepare(`
        INSERT OR REPLACE INTO payment_events (id, event_type, email, product_tier, request_id, payload)
        VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
        id,
        cleanText(payload?.type, 80) || "unknown",
        cleanText(payload?.email, 240).toLowerCase(),
        tierFromPayhipPayload(payload),
        requestId,
        JSON.stringify(payload || {})
    ).run();
}

