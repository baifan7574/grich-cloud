


export async function onRequestPost(context) {
    const { request, env } = context;

    try {
        const { brand, case_id, plaintiff, court, attorney } = await request.json();

        if (!brand) return new Response(JSON.stringify({ error: 'Brand is required' }), { status: 400 });

        // --- INTELLIGENCE ROUTING ---
        // Priority 1: DeepSeek (Top Tier Legal Logic)
        // Priority 2: Gemini (Google Infrastructure Fallback)
        const dsKey = env.DEEPSEEK_API_KEY;
        const geminiKey = env.GEMINI_API_KEY;
        
        let provider = dsKey ? "DEEPSEEK" : (geminiKey ? "GEMINI" : "NONE");
        
        if (provider === "NONE") {
             return new Response(JSON.stringify({ error: 'Configuration Error: No AI API Keys Found' }), { status: 500 });
        }

        // --- 19.1 Context Injection ---
        let enrichedContext = "";
        if (attorney && (attorney.includes("Greer") || attorney.includes("GBC"))) {
            enrichedContext += "This is likely a Greer, Burns & Crain (GBC) style Schedule A case. They are known for aggressive TROs and mass-filings. ";
        } else if (attorney && attorney.includes("HSP")) {
            enrichedContext += "This appears to be a HSP (Hughes Socol Piers Resnick & Dym) filing. ";
        }
        const targetDesc = brand.includes("STORE") || brand.includes("OUTLET") ? "an e-commerce storefront" : "a cross-border trading entity";

        // --- 19.2 The "Top Lawyer" System Prompt (Shared) ---
        const systemPrompt = `You are a top-tier North American Intellectual Property (IP) Defense Attorney with 15+ years of experience in "Schedule A" litigation defense (TROs/Asset Freezes).
        
        Your Client: "${brand}" (${targetDesc}), who has just been sued.
        Opposing Counsel: "${attorney || 'Unknown Firm'}" representing Plaintiff "${plaintiff}".
        Case: ${case_id} in ${court}.

        CRITICAL INSTRUCTIONS:
        1. NO "UNKNOWN"s: If specific details are missing, use your expert knowledge of ${plaintiff || 'anti-counterfeiting'} cases to INFER likely scenarios.
        2. TONE: Urgent, authoritative, objective, professional. Do not be polite. Be strategic.
        3. FORMAT: Strict Legal Memorandum style.

        YOU MUST OUTPUT THE REPORT IN THESE EXACT 4 SECTIONS:

        ## [RISK DEPTH RATING]
        Give a score 1-10/10. Is this a "Fishing Expedition" or a "Targeted Kill"? Explain why based on the Law Firm's reputation (${attorney}).

        ## [LEGAL LOOPHOLE ANALYSIS]
        Analyze potential procedural weaknesses. Mention terms like "Service of Process", "Personal Jurisdiction", or "Bond Sufficiency" that might apply to mass-filings in ${court}.

        ## [SETTLEMENT FORECAST]
        Provide a 3-tier settlement estimation based on frozen funds (e.g., if $10k frozen):
        *   Low-ball (Early Settlement): [Estimate %]
        *   Standard (Mid-case): [Estimate %]
        *   Maximum Pain (Full Trial): [Estimate %]
        *   *Infer numbers based on typical ${plaintiff} behavior.*

        ## [24-HOUR STOP-LOSS DIRECTIVE]
        Bullet points. Direct orders.
        *   Example: "IMMEDIATE ACTION: Pull all listing data for cross-reference."
        *   Tell them exactly what to do with their funds or logs.

        Keep the total length under 400 words. Make it sound expensive ($500/hr lawyer).`;

        let reportContent = "";

        if (provider === "DEEPSEEK") {
             // DeepSeek V3 Call
             const response = await fetch('https://api.deepseek.com/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${dsKey}`
                },
                body: JSON.stringify({
                    model: "deepseek-chat",
                    messages: [
                        { role: "system", content: systemPrompt },
                        { role: "user", content: `CONTEXT: ${enrichedContext}.\nTASK: Generate the ${brand} Defense Memorandum immediately.` }
                    ],
                    stream: false,
                    temperature: 0.7
                })
            });

            if (!response.ok) {
                const errText = await response.text();
                // Fallback to Gemini if DeepSeek fails? Or just error out?
                // Let's error out to be transparent, or check status.
                throw new Error(`DeepSeek API Error: ${errText}`);
            }
            const data = await response.json();
            reportContent = data.choices[0].message.content;

        } else if (provider === "GEMINI") {
            // Gemini Flash Call (REST API)
            // Endpoint: https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=...
            const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`;
            
            const response = await fetch(geminiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: `${systemPrompt}\n\nCONTEXT: ${enrichedContext}.\nTASK: Generate the ${brand} Defense Memorandum immediately.`
                        }]
                    }]
                })
            });

            if (!response.ok) {
                 const errText = await response.text();
                 throw new Error(`Gemini API Error: ${errText}`);
            }
            const data = await response.json();
            reportContent = data.candidates[0].content.parts[0].text;
        }

        // Return structured JSON for Frontend
        return new Response(JSON.stringify({ 
            report: reportContent,
            provider: provider,
            timestamp: new Date().toISOString()
        }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (err) {
        console.error('Worker Error:', err);
        return new Response(JSON.stringify({ 
            error: err.message, 
            trace: 'Backend Logic Failure' 
        }), { status: 500 });
    }
}

