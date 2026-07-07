import {
    cleanText,
    ensureOrderSchema,
    getOrderById,
    jsonResponse,
    markOrderPaid,
    requireAdmin
} from "../../_lib/orders.js";

export async function onRequestGet(context) {
    const { request, env } = context;
    const auth = requireAdmin(request, env);
    if (!auth.ok) return jsonResponse({ error: auth.error }, auth.status);

    const db = env.INTAKE_DB;
    if (!db || typeof db.prepare !== "function") {
        return jsonResponse({ error: "INTAKE_DB is not configured." }, 503);
    }

    await ensureOrderSchema(db);
    const url = new URL(request.url);
    const limit = Math.min(Math.max(Number(url.searchParams.get("limit") || 50), 1), 100);
    const status = cleanText(url.searchParams.get("status"), 40);
    const query = status
        ? `SELECT * FROM intake_requests WHERE payment_status = ? ORDER BY created_at DESC LIMIT ?`
        : `SELECT * FROM intake_requests ORDER BY created_at DESC LIMIT ?`;
    const result = status
        ? await db.prepare(query).bind(status, limit).all()
        : await db.prepare(query).bind(limit).all();

    return jsonResponse({
        orders: (result.results || []).map(row => ({
            id: row.id,
            email: row.email,
            store_name: row.store_name,
            platform: row.platform,
            case_number: row.case_number,
            product_tier: row.product_tier,
            payment_status: row.payment_status,
            review_status: row.review_status,
            report_status: row.report_status || null,
            payment_id: row.payment_id || null,
            paid_at: row.paid_at || null,
            report_sent_at: row.report_sent_at || null,
            created_at: row.created_at
        }))
    });
}

export async function onRequestPost(context) {
    const { request, env } = context;
    const auth = requireAdmin(request, env);
    if (!auth.ok) return jsonResponse({ error: auth.error }, auth.status);

    const db = env.INTAKE_DB;
    if (!db || typeof db.prepare !== "function") {
        return jsonResponse({ error: "INTAKE_DB is not configured." }, 503);
    }

    const body = await request.json().catch(() => ({}));
    const action = cleanText(body.action, 80);
    const requestId = cleanText(body.request_id, 120);
    if (!requestId) return jsonResponse({ error: "request_id is required." }, 400);

    await ensureOrderSchema(db);
    const order = await getOrderById(db, requestId);
    if (!order) return jsonResponse({ error: "Order not found." }, 404);

    if (action === "mark_paid") {
        const paid = await markOrderPaid(db, order, {
            id: cleanText(body.payment_id, 100) || `manual-${Date.now()}`,
            type: "paid",
            email: order.email,
            manual: true
        });
        return jsonResponse({ status: "marked_paid", order: paid });
    }

    return jsonResponse({ error: "Unsupported action." }, 400);
}

