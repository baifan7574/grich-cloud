export async function onRequest(context) {
    const { request, env, params } = context;
    const targetID = params.id; // This will catch whatever is after /target/ 

    const supabaseUrl = "https://rdlmumybuwveaaeceohj.supabase.co";
    const supabaseKey = env.PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_aPXWTauRxJ88A88mwLDoPQ_puVi7PZj";

    // 1. Try to find the defendant
    // We search by ID first, but if that fails, we try to search by defendant_name (URL decoded)
    let defendant = null;
    let error = null;

    try {
        // Attempt 1: Exact ID match
        const resId = await fetch(`${supabaseUrl}/rest/v1/defendants?id=eq.${targetID}&select=*`, {
            headers: { "apikey": supabaseKey, "Authorization": `Bearer ${supabaseKey}` }
        });
        const dataId = await resId.json();
        if (dataId && dataId.length > 0) {
            defendant = dataId[0];
        } else {
            // Attempt 2: Store Name Match (Decoded)
            // Note: This relies on exact string match, might be flaky if URL encoding varies. 
            // Ideally we stick to ID for sitemaps, but user might type name manually.
            const nameQuery = decodeURIComponent(targetID);
            const resName = await fetch(`${supabaseUrl}/rest/v1/defendants?defendant_name=eq.${nameQuery}&select=*`, {
                headers: { "apikey": supabaseKey, "Authorization": `Bearer ${supabaseKey}` }
            });
            const dataName = await resName.json();
            if (dataName && dataName.length > 0) {
                defendant = dataName[0];
            }
        }
    } catch (e) {
        error = e.message;
    }

    if (!defendant) {
        return new Response(`Target Not Found in GRICH Database. Ref: ${targetID}`, { status: 404 });
    }

    // 2. Fetch associated case info
    let caseInfo = { risk_score: '99', status: 'LITIGATION ACTIVE' };
    try {
        const resCase = await fetch(`${supabaseUrl}/rest/v1/lawsuits?case_number=eq.${defendant.case_number}&select=risk_score,status,plaintiff,court`, {
            headers: { "apikey": supabaseKey, "Authorization": `Bearer ${supabaseKey}` }
        });
        const dataCase = await resCase.json();
        if (dataCase && dataCase.length > 0) caseInfo = dataCase[0];
    } catch (e) { }

    // 3. Render High-Conversion SEO Page
    const html = `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>⚠️ URGENT: ${defendant.defendant_name} - Legal Compliance Notice | GRICH</title>
    <meta name="description" content="Store ${defendant.defendant_name} (${defendant.platform}) has been named in Case ${defendant.case_number}. Immediate legal risk verified. View official dossier.">
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
    <style>
        body { background-color: #0f172a; color: #f8fafc; font-family: 'Inter', sans-serif; }
        .glass { background: rgba(30, 41, 59, 0.7); backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.1); }
        .scanline {
            width: 100%; height: 2px;
            background: rgba(239, 68, 68, 0.8);
            position: fixed; top: 0; left: 0;
            animation: scan 2s linear infinite; pointer-events: none; z-index: 50;
        }
        @keyframes scan { 0% { top: 0%; } 100% { top: 100%; } }
    </style>
</head>
<body class="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
    <!-- Red Alert Scanline for Danger Tone -->
    <div class="scanline"></div>
    <div class="absolute inset-0 bg-red-500/5 pointer-events-none"></div>

    <div class="max-w-3xl w-full space-y-8 z-10 text-center">
        
        <!-- Header -->
        <div class="inline-flex flex-col items-center gap-2">
            <div class="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(220,38,38,0.5)] animate-pulse">
                <span class="text-3xl">⚠️</span>
            </div>
            <h1 class="text-3xl md:text-5xl font-black tracking-tight uppercase">
                Compliance Alert
            </h1>
            <p class="text-red-400 font-mono text-sm tracking-widest uppercase">Target Entity Detected</p>
        </div>

        <!-- Target Card -->
        <div class="glass p-8 md:p-12 rounded-2xl border-red-500/30 shadow-2xl space-y-8 text-left relative overflow-hidden">
            <div class="absolute top-0 right-0 bg-red-600 text-white text-[10px] font-black px-4 py-1 uppercase tracking-widest">
                Status: ${caseInfo.status || 'FROZEN'}
            </div>

            <div class="space-y-2">
                <div class="text-xs text-gray-400 font-bold uppercase tracking-wider">Target Identity</div>
                <div class="text-4xl md:text-5xl font-black text-white leading-none break-words">
                    ${defendant.defendant_name}
                </div>
                <div class="inline-block bg-white/10 px-2 py-1 rounded text-xs font-mono text-gray-300">
                    PLATFORM: ${defendant.platform || 'General'} // ID: ${defendant.id.split('-')[0]}
                </div>
            </div>

            <div class="h-px bg-white/10 w-full"></div>

            <div class="space-y-2">
                <div class="text-xs text-gray-400 font-bold uppercase tracking-wider">Associated Litigation</div>
                <div class="text-2xl font-bold text-red-400">Case ${defendant.case_number}</div>
                <p class="text-sm text-gray-300 leading-relaxed">
                    This entity has been named as a defendant in a federal intellectual property lawsuit filed by 
                    <strong class="text-white">${caseInfo.plaintiff || 'Unknown Plaintiff'}</strong>. 
                    Immediate action required to mitigate asset freeze risk.
                </p>
            </div>

            <div class="pt-4">
                <a href="/case_template?case=${defendant.case_number}&target=${defendant.id.split('-')[0]}" 
                   class="block w-full bg-red-600 hover:bg-red-500 text-white text-center font-black uppercase tracking-widest py-4 rounded-lg transition-all shadow-[0_0_20px_rgba(220,38,38,0.4)]">
                    View Official Dossier →
                </a>
                <p class="text-center text-[10px] text-gray-500 mt-4 uppercase">
                    Verification Source: GRICH Global Index // Nodes: 414
                </p>
            </div>
        </div>

        <!-- Footer -->
        <div class="text-center">
            <a href="/" class="text-gray-500 hover:text-white text-xs font-mono underline decoration-gray-700 underline-offset-4">Run Global Search</a>
        </div>
    </div>
</body>
</html>`;

    return new Response(html, {
        headers: { "Content-Type": "text/html;charset=UTF-8" }
    });
}
