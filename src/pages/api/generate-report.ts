
import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

// System prompt for the AI "Legal Analyst"
const SYSTEM_PROMPT = `
You are a senior enforcement analyst for the Global Compliance Database. 
Your task is to analyze trademark infringement signals and generate a "Compliance Alert" for a specific brand.

Goal: Create a high-converting, urgent, but factually grounded summary that convinces a seller they are at risk.

Input Data:
- Brand Name: {brand}
- Lawsuit Count: {count}
- Jurisdiction: {court} (Usually N.D. Illinois)

Output JSON Format (Strict):
{
  "risk_level": "High" | "Critical",
  "summary": "2-3 sentences explaining that {brand} has initiated enforcement actions targeting unauthorized sellers on platforms like Amazon/TikTok. Mention that 'Schedule A' filings typically lead to account freezes.",
  "likely_triggers": [
    "Selling goods with '{brand}' keywords in title",
    "Using '{brand}' logo in product images",
    "Counterfeit/Replica sales detected"
  ],
  "jurisdiction_note": "N.D. Illinois (SAD Scheme) - Known for rapid TRO issuance.",
  "action_deadline": "48 Hours"
}

Tone: Professional, Urgent, Authoritative (No "AI" language).
`;

export const GET: APIRoute = async ({ request, locals }) => {
    try {
        const url = new URL(request.url);
        const brand = url.searchParams.get('brand');

        // Robustly get Env Vars in Cloudflare Runtime
        // @ts-ignore
        const runtimeEnv = locals?.runtime?.env || {};

        // 1. Get Keys (Avoid process.env in Cloudflare to prevent ReferenceError)
        // Order: Cloudflare Runtime > Build Time > Empty
        const DEEPSEEK_API_KEY = runtimeEnv.DEEPSEEK_API_KEY || import.meta.env.DEEPSEEK_API_KEY;
        const SUPABASE_URL = runtimeEnv.PUBLIC_SUPABASE_URL || import.meta.env.PUBLIC_SUPABASE_URL;
        const SUPABASE_KEY = runtimeEnv.PUBLIC_SUPABASE_ANON_KEY || import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

        // DEBUG INFO (Return this to frontend to diagnose)
        // Redact keys for security, just show presence
        const debugInfo = {
            hasDeepSeek: !!DEEPSEEK_API_KEY,
            deepSeekPrefix: DEEPSEEK_API_KEY ? DEEPSEEK_API_KEY.substring(0, 3) : 'N/A',
            hasSupabaseUrl: !!SUPABASE_URL,
            hasSupabaseKey: !!SUPABASE_KEY,
            brand: brand
        };

        if (!brand) {
            return new Response(JSON.stringify({ error: 'Brand is required', debug: debugInfo }), { status: 400 });
        }

        if (!SUPABASE_URL || !SUPABASE_KEY) {
            console.error('Missing Supabase Config');
            return new Response(JSON.stringify({ error: 'Server Config Error (DB)', debug: debugInfo }), { status: 500 });
        }

        // 2. Initialize Supabase Logic ONLY inside the handler (Lazy Load)
        const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

        const decodedBrand = decodeURIComponent(brand).toUpperCase();

        // 3. Check Cache (Database)
        const { data: cachedReport, error: cacheError } = await supabase
            .from('compliance_reports')
            .select('report_content')
            .eq('brand_name', decodedBrand)
            .single();

        if (cacheError && cacheError.code !== 'PGRST116') { // PGRST116 is "Row not found"
            console.warn("Cache Lookup Error:", cacheError);
        }

        if (cachedReport) {
            return new Response(JSON.stringify(cachedReport.report_content), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 4. Check if we even have lawsuit data for this brand
        const { data: lawsuitData, error: lawsuitError } = await supabase
            .from('lawsuits')
            .select('*')
            .ilike('brand_name', decodedBrand)
            .limit(1);

        if (lawsuitError) {
            return new Response(JSON.stringify({ error: 'DB Read Error', details: lawsuitError, debug: debugInfo }), { status: 500 });
        }

        if (!lawsuitData || lawsuitData.length === 0) {
            return new Response(JSON.stringify({
                error: 'No lawsuit data found. Intelligence gathering pending.',
                debug: debugInfo
            }), { status: 404 });
        }

        // 5. Call DeepSeek API (The Brain)
        if (!DEEPSEEK_API_KEY) {
            return new Response(JSON.stringify({ error: 'System configuration error (Missing DeepSeek Key)', debug: debugInfo }), { status: 500 });
        }

        const defendant = url.searchParams.get('defendant');
        const decodedDefendant = defendant ? decodeURIComponent(defendant) : null;

        let prompt = SYSTEM_PROMPT // Use base prompt
            .replace('{brand}', decodedBrand)
            .replace('{count}', 'Multiple')
            .replace('{court}', lawsuitData[0].court || 'N.D. Illinois');

        // Dynamic Prompt Injection for "Sniper Mode"
        if (decodedDefendant) {
            prompt += `\n\nCRITICAL CONTEXT UPDATE: The user is a specific seller named "${decodedDefendant}". 
            Modify the report to directly address them. 
            Confirm that "${decodedDefendant}" has been identified in the "Schedule A" defendant list. 
            Change "summary" to be extremely urgent: "Store '${decodedDefendant}' is listed as a defendant in Case ${lawsuitData[0].case_number || 'Pending'}".`;
        } else {
            prompt += `\n\nContext: General analysis for brand "${decodedBrand}".`;
        }

        const response = await fetch('https://api.deepseek.com/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
            },
            body: JSON.stringify({
                model: 'deepseek-chat',
                messages: [
                    { role: 'system', content: 'You are a helpful assistant that outputs strict JSON.' },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.3,
                response_format: { type: 'json_object' }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('DeepSeek Error:', errorText);
            return new Response(JSON.stringify({ error: 'Intelligence generation failed', upstream: errorText, debug: debugInfo }), { status: 502 });
        }

        const aiData = await response.json();
        const content = aiData.choices[0].message.content;
        let parsedContent;
        try {
            parsedContent = JSON.parse(content);
        } catch (e) {
            return new Response(JSON.stringify({ error: 'Invalid JSON from AI', raw: content, debug: debugInfo }), { status: 500 });
        }

        // 6. Save to Database (Cache)
        const { error: dbError } = await supabase
            .from('compliance_reports')
            .insert({
                brand_name: decodedBrand,
                report_content: parsedContent
            });

        if (dbError) {
            console.error('DB Insert Error:', dbError);
        }

        return new Response(JSON.stringify(parsedContent), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (globalError: any) {
        // GLOBAL CATCH: Ensure we never return 502 without explanation
        return new Response(JSON.stringify({
            error: 'CRITICAL FUNCTION CRASH',
            message: globalError.message,
            stack: globalError.stack,
            type: typeof globalError
        }), { status: 200 }); // Return 200 so we can read the error body
    }
};
