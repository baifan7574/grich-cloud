import { ensureOrderSchema, getOrderById, jsonResponse, requireAdmin } from "../../_lib/orders.js";
import { buildReportDraft, markReportSent, saveReportDraft, sendReportEmail } from "../../_lib/reports.js";

export async function onRequestPost(context) {
    const { request, env } = context;
    const auth = requireAdmin(request, env);
    if (!auth.ok) return jsonResponse({ error: auth.error }, auth.status);

    const db = env.INTAKE_DB;
    if (!db || typeof db.prepare !== "function") {
        return jsonResponse({ error: "INTAKE_DB is not configured." }, 503);
    }

    const body = await request.json().catch(() => ({}));
    const requestId = String(body.request_id || "").trim();
    if (!requestId) return jsonResponse({ error: "request_id is required." }, 400);

    await ensureOrderSchema(db);
    const order = await getOrderById(db, requestId);
    if (!order) return jsonResponse({ error: "Order not found." }, 404);

    const draft = String(body.draft || order.report_draft || "").trim() || await buildReportDraft(env, order);
    await saveReportDraft(db, order.id, draft, "drafted");
    const emailResult = await sendReportEmail(env, order, draft);
    if (!emailResult.ok) {
        return jsonResponse({ status: "send_failed", request_id: order.id, email_result: emailResult }, 502);
    }
    await markReportSent(db, order.id);
    return jsonResponse({ status: "sent", request_id: order.id });
}

