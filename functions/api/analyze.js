
export async function onRequestPost(context) {
    const { request, env } = context;

    try {
        const { brand, case_id, plaintiff, court } = await request.json();

        if (!brand) {
            return new Response(JSON.stringify({ error: 'Brand is required' }), { status: 400 });
        }

        const apiKey = env.DEEPSEEK_API_KEY;
        if (!apiKey) {
            return new Response(JSON.stringify({ error: 'Configuration Error: Missing API Key' }), { status: 500 });
        }

        // System Prompt adapted from the archived script
        const systemPrompt = `You are a Senior International Trade Attorney specializing in IP litigation. 
        User is inquiring about the brand/defendant "${brand}" involved in Case "${case_id}" (Plaintiff: ${plaintiff}, Court: ${court}).
        
        Task:
        1. Generate a "preliminary risk assessment" report.
        2. Tone: Professional, urgent, objective, authoritative.
        3. Structure:
           - [RISK LEVEL]: Critical/High/Medium (Decide based on Schedule A context).
           - [POTENTIAL DAMAGES]: Estimate range (e.g., $100k-$2M per mark) based on statutory damages.
           - [IMMEDIATE ACTIONS]: 3 bullet points on what the merchant should do (e.g., withdraw funds, preserve logs).
           - [SETTLEMENT FORECAST]: Likely settlement range % of frozen funds.
        
        Output format: Pure text with markdown headers. Keep it under 300 words.`;

        // Call DeepSeek API
        const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "deepseek-chat",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: `Generate legal risk report for defendant brand: ${brand}` }
                ],
                stream: false
                // We use non-streaming for simplicity in this version, 
                // or we can implement streaming if the client supports it. 
                // For now, let's return JSON to be safe with CF Workers execution time.
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error('DeepSeek API Error:', errText);
            return new Response(JSON.stringify({ error: `AI Provider Error: ${response.status}` }), { status: 502 });
        }

        const data = await response.json();
        const reportContent = data.choices[0].message.content;

        return new Response(JSON.stringify({ report: reportContent }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (err) {
        console.error('Worker Error:', err);
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
}
