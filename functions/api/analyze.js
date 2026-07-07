


export async function onRequestPost(context) {
    const { request, env } = context;

    try {
        const { brand, case_id, plaintiff, court, attorney, confirmed_facts, user_provided_notice, not_confirmed } = await request.json();

        if (!brand) return new Response(JSON.stringify({ error: 'Brand is required' }), { status: 400 });

        // --- REPORT ROUTING ---
        // Priority 1: DeepSeek
        // Priority 2: Gemini (Google Infrastructure Fallback)
        // Support both standard naming and user's 'DSAPI' shorthand
        const dsKey = env.DEEPSEEK_API_KEY || env.DSAPI;
        const geminiKey = env.GEMINI_API_KEY;
        
        let provider = dsKey ? "DEEPSEEK" : (geminiKey ? "GEMINI" : "NONE");
        
        if (provider === "NONE") {
             return new Response(JSON.stringify({ error: 'Configuration Error: No AI API Keys Found' }), { status: 500 });
        }

        // --- 19.1 Context Injection ---
        let enrichedContext = "";
        if (attorney && (attorney.includes("Greer") || attorney.includes("GBC"))) {
            enrichedContext += "The available data references Greer, Burns & Crain (GBC). Avoid conclusions not supported by the provided record fields. ";
        } else if (attorney && attorney.includes("HSP")) {
            enrichedContext += "This appears to be a HSP (Hughes Socol Piers Resnick & Dym) filing. ";
        }
        const targetDesc = brand.includes("STORE") || brand.includes("OUTLET") ? "an e-commerce storefront" : "a cross-border trading entity";

        // --- Public-record report prompt ---
        const systemPrompt = `You are preparing an independent public-record intelligence report for an e-commerce marketplace seller.
        
        Subject: "${brand}" (${targetDesc}).
        Listed counsel in available data: "${attorney || 'Unknown Firm'}" representing Plaintiff "${plaintiff}".
        Case reference: ${case_id} in ${court}.
        Confirmed facts supplied by reviewer: ${JSON.stringify(confirmed_facts || {})}.
        User-provided notice details, not independently confirmed: ${JSON.stringify(user_provided_notice || {})}.
        Not-confirmed fields: ${JSON.stringify(not_confirmed || {})}.

        STRICT COMPLIANCE RULES:
        1. Do not claim to be a lawyer, law firm, court, official filing service, or legal representative.
        2. Do not provide legal advice, settlement instructions, representation, or outcome predictions.
        3. Do not infer missing facts. If a field is missing or uncertain, say it is not confirmed in the available data.
        4. Do not say the seller has been sued unless the provided record clearly supports it.
        5. Use calm, factual language. No panic language, no threats, no outcome promises.
        6. Clearly separate "Confirmed from public source", "User-provided notice", and "Not confirmed / requires further review".

        OUTPUT THESE 5 SECTIONS:

        ## [PUBLIC RECORD SUMMARY]
        Summarize the case number, plaintiff, court, listed counsel, and what is not confirmed.

        ## [CONFIRMED / USER-PROVIDED / NOT CONFIRMED]
        Use three labeled bullet groups and do not mix them.

        ## [KNOWN LIMITATIONS]
        Explain that public data can be incomplete, delayed, sealed, mismatched, or outdated.

        ## [NEXT DOCUMENT CHECKLIST]
        Provide a neutral checklist of documents to gather before speaking with qualified counsel or making a business decision.

        ## [ATTORNEY-READY QUESTIONS]
        Provide neutral questions the seller may ask independent licensed counsel.

        Keep the total length under 400 words and include this sentence at the end: "This report is a business reference based on available public information and is not legal advice."`;

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
                        { role: "user", content: `CONTEXT: ${enrichedContext}.\nTASK: Generate a public-record business reference report for ${brand}.` }
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
                            text: `${systemPrompt}\n\nCONTEXT: ${enrichedContext}.\nTASK: Generate a public-record business reference report for ${brand}.`
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

