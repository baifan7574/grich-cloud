function jsonResponse(body, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-store"
        }
    });
}

function cleanCase(value) {
    return String(value || "").trim().slice(0, 120);
}

function slugToCase(value) {
    const clean = decodeURIComponent(cleanCase(value)).replace(/\/+$/g, "");
    return clean.replace(/^([0-9]+)-/, "$1:");
}

export async function onRequestGet(context) {
    const { request, env } = context;
    const url = new URL(request.url);
    const caseParam = slugToCase(url.searchParams.get("case"));

    if (!caseParam) {
        return jsonResponse({ status: "not_confirmed", reason: "missing_case" }, 400);
    }

    const sbUrl = env.PUBLIC_SUPABASE_URL?.trim().replace(/\/$/, "");
    const sbKey = (env.SUPABASE_SERVICE_ROLE_KEY || env.PUBLIC_SUPABASE_ANON_KEY)?.trim();
    if (!sbUrl || !sbKey) {
        return jsonResponse({ status: "not_confirmed", reason: "search_temporarily_unavailable" });
    }

    try {
        const headers = { apikey: sbKey, Authorization: `Bearer ${sbKey}` };
        const query = `${sbUrl}/rest/v1/lawsuits?case_number=eq.${encodeURIComponent(caseParam)}&select=case_number,plaintiff,court,law_firm,filed_date,raw_data_url&limit=1`;
        const response = await fetch(query, { headers });
        if (!response.ok) {
            console.error("Case check failed:", response.status, await response.text());
            return jsonResponse({ status: "not_confirmed", reason: "search_temporarily_unavailable" });
        }
        const rows = await response.json();
        if (!rows.length) {
            return jsonResponse({ status: "not_confirmed", case_number: caseParam });
        }
        return jsonResponse({
            status: "confirmed",
            case_number: rows[0].case_number,
            plaintiff: rows[0].plaintiff || null,
            court: rows[0].court || null,
            law_firm: rows[0].law_firm || null,
            filed_date: rows[0].filed_date || null,
            source_url: rows[0].raw_data_url || null
        });
    } catch (error) {
        console.error("Case check runtime error:", error);
        return jsonResponse({ status: "not_confirmed", reason: "search_temporarily_unavailable" });
    }
}
