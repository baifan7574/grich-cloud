
import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

// Environment Variables
const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
const deepseekKey = import.meta.env.DEEPSEEK_API_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

export const GET: APIRoute = async ({ request }) => {
    const url = new URL(request.url);
    const brand = url.searchParams.get('brand');

    if (!brand) {
        return new Response(JSON.stringify({ error: 'Brand is required' }), { status: 400 });
    }

    // 1. Check Cache (Supabase)
    const { data: existing, error: fetchError } = await supabase
        .from('reports')
        .select('*')
        .eq('brand_name', brand)
        .single();

    if (existing) {
        console.log(`🧠 Cache Hit for: ${brand}`);
        return new Response(JSON.stringify(existing.full_content), { status: 200 });
    }

    console.log(`🧠 Cache Miss for: ${brand}. Calling DeepSeek...`);

    // 2. Call DeepSeek AI
    if (!deepseekKey) {
        return new Response(JSON.stringify({ error: 'DeepSeek configuration missing' }), { status: 500 });
    }

    const systemPrompt = `You are a Senior Legal Analyst with 20 years of experience in US Trademark Law (Lanham Act).
Your task is to generate a tactical 'Defense Strategy Summary' for a client accused of trademark infringement.
The output must be strictly valid JSON format.

Structure:
{
  "summary": "2-3 sentences summarizing the high-level risk.",
  "risk_level": "Extreme",
  "jurisdiction_note": "Likely N.D. Illinois (SAD Scheme) or Florida.",
  "action_deadline": "48-72 hours",
  "recommended_actions": [
    "Action 1",
    "Action 2",
    "Action 3"
  ]
}

Do not include markdown blocks like \`\`\`json. Just the raw JSON string.`;

    const userPrompt = `Analyze the brand: "${brand}". Assume it is involved in a Schedule A TRO lawsuit.`;

    try {
        const aiResponse = await fetch('https://api.deepseek.com/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${deepseekKey}`
            },
            body: JSON.stringify({
                model: 'deepseek-chat',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                temperature: 1.3
            })
        });

        const aiJson = await aiResponse.json();

        if (aiJson.error) {
            throw new Error(aiJson.error.message);
        }

        const contentRaw = aiJson.choices[0].message.content;
        // Strip markdown if present
        const cleanContent = contentRaw.replace(/```json/g, '').replace(/```/g, '').trim();
        const finalData = JSON.parse(cleanContent);

        // 3. Save to Cache (Supabase)
        const { error: saveError } = await supabase.from('reports').insert({
            brand_name: brand,
            summary: finalData.summary,
            full_content: finalData,
            risk_score: 90
        });

        if (saveError) {
            console.error("Cache Save Error:", saveError);
        }

        return new Response(JSON.stringify(finalData), { status: 200 });

    } catch (err: any) {
        console.error("AI Generation Error:", err);
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
};
