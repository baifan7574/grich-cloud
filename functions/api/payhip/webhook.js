import {
    cleanText,
    ensureOrderSchema,
    findMatchingOrder,
    jsonResponse,
    markOrderPaid,
    savePaymentEvent,
    sha256Hex,
    tierFromPayhipPayload
} from "../../_lib/orders.js";
import {
    buildReportDraft,
    markReportSent,
    saveReportDraft,
    sendReportEmail
} from "../../_lib/reports.js";

async function verifyPayhipSignature(env, payload) {
    const apiKey = cleanText(env.PAYHIP_API_KEY, 500);
    if (!apiKey) return { ok: false, error: "PAYHIP_API_KEY is not configured." };
    const expected = await sha256Hex(apiKey);
    return {
        ok: cleanText(payload.signature, 200) === expected,
        error: "Invalid Payhip signature."
    };
}

export async function onRequestPost(context) {
    const { request, env } = context;
    const db = env.INTAKE_DB;
    if (!db || typeof db.prepare !== "function") {
        return jsonResponse({ error: "INTAKE_DB is not configured." }, 503);
    }

    let payload;
    try {
        payload = await request.json();
    } catch {
        return jsonResponse({ error: "Invalid JSON payload." }, 400);
    }

    const signature = await verifyPayhipSignature(env, payload);
    if (!signature.ok) {
        return jsonResponse({ error: signature.error }, signature.error.includes("configured") ? 503 : 401);
    }

    await ensureOrderSchema(db);

    const eventType = cleanText(payload.type, 80);
    const email = cleanText(payload.email, 240).toLowerCase();
    const tier = tierFromPayhipPayload(payload);

    if (eventType === "refunded") {
        const order = await findMatchingOrder(db, { email, tier, paymentId: cleanText(payload.id, 100) });
        await savePaymentEvent(db, payload, order?.id || null);
        if (order) {
            await db.prepare(`
                UPDATE intake_requests
                SET payment_status = 'refunded',
                    review_status = 'refunded',
                    payment_payload = ?,
                    updated_at = ?
                WHERE id = ?
            `).bind(JSON.stringify(payload), new Date().toISOString(), order.id).run();
        }
        return jsonResponse({ status: "refunded_recorded", matched_request_id: order?.id || null });
    }

    if (eventType !== "paid") {
        await savePaymentEvent(db, payload, null);
        return jsonResponse({ status: "ignored", event_type: eventType });
    }

    const order = await findMatchingOrder(db, { email, tier, paymentId: cleanText(payload.id, 100) });
    await savePaymentEvent(db, payload, order?.id || null);

    if (!order) {
        return jsonResponse({
            status: "paid_unmatched",
            message: "Payment was valid, but no matching intake request was found by email and tier.",
            email,
            product_tier: tier
        }, 202);
    }

    const paidOrder = await markOrderPaid(db, order, payload);
    const draft = await buildReportDraft(env, paidOrder);
    await saveReportDraft(db, paidOrder.id, draft, "drafted");

    const autoSend = cleanText(env.AUTO_SEND_REPORTS, 20).toLowerCase() !== "false";
    let emailResult = { skipped: true, reason: "auto_send_disabled" };
    if (autoSend) {
        emailResult = await sendReportEmail(env, paidOrder, draft);
        if (emailResult.ok) {
            await markReportSent(db, paidOrder.id);
        }
    }

    return jsonResponse({
        status: emailResult.ok ? "paid_report_sent" : "paid_report_drafted",
        request_id: paidOrder.id,
        product_tier: paidOrder.product_tier,
        email_status: emailResult.ok ? "sent" : emailResult.skipped ? "skipped" : "failed"
    });
}

