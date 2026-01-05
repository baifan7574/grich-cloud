
import type { APIRoute } from 'astro';
import { supabase } from '../../lib/supabase';

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
    const url = new URL(request.url);
    const brand = url.searchParams.get('brand');
    // @ts-ignore
    const runtimeEnv = locals?.runtime?.env || {};
    const DEEPSEEK_API_KEY = import.meta.env.DEEPSEEK_API_KEY || runtimeEnv.DEEPSEEK_API_KEY || process.env.DEEPSEEK_API_KEY;

    if (!brand) {
        return new Response(JSON.stringify({ error: 'Brand is required' }), { status: 400 });
    }

    const decodedBrand = decodeURIComponent(brand).toUpperCase();

    // 1. Check Cache (Database)
    // We check if a report was created in the last 24 hours
    // For simplicity, we just check if ANY report exists for now (Permanent Cache for MVP)
    const { data: cachedReport } = await supabase
        .from('compliance_reports')
        .select('report_content')
        .eq('brand_name', decodedBrand)
        .single();

    if (cachedReport) {
        return new Response(JSON.stringify(cachedReport.report_content), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    // 2. Check if we even have lawsuit data for this brand
    const { data: lawsuitData } = await supabase
        .from('lawsuits')
        .select('*')
        .ilike('brand_name', decodedBrand)
        .limit(1);

    if (!lawsuitData || lawsuitData.length === 0) {
        return new Response(JSON.stringify({
            error: 'No lawsuit data found. Intelligence gathering pending.'
        }), { status: 404 });
    }

    // 3. Call DeepSeek API (The Brain)
    if (!DEEPSEEK_API_KEY) {
        return new Response(JSON.stringify({ error: 'System configuration error (Missing Key)' }), { status: 500 });
    }

    try {
        const prompt = SYSTEM_PROMPT
            .replace('{brand}', decodedBrand)
            .replace('{count}', 'Multiple') // Simplified for now
            .replace('{court}', lawsuitData[0].court || 'N.D. Illinois');

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
            return new Response(JSON.stringify({ error: 'Intelligence generation failed' }), { status: 502 });
        }

        const aiData = await response.json();
        const content = aiData.choices[0].message.content;
        const parsedContent = JSON.parse(content); // Validate JSON

        // 4. Save to Database (Cache)
        const { error: dbError } = await supabase
            .from('compliance_reports')
            .insert({
                brand_name: decodedBrand,
                report_content: parsedContent
            });

        if (dbError) {
            console.error('DB Insert Error:', dbError);
            // We continue even if cache fails, just return the data
        }

        return new Response(JSON.stringify(parsedContent), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('API Error:', error);
        return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
    }
};
