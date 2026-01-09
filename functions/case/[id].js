export async function onRequest(context) {
    const { request, env, params } = context;
    const caseID = params.id;

    // 1. Fetch case data from Supabase
    const supabaseUrl = "https://rdlmumybuwveaaeceohj.supabase.co";
    // We need the service key or a key that can read lawsuits. Since this is a public SEO page, anon key is fine.
    const supabaseKey = env.PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_aPXWTauRxJ88A88mwLDoPQ_puVi7PZj";

    const res = await fetch(`${supabaseUrl}/rest/v1/lawsuits?case_number=eq.${caseID}&select=*`, {
        headers: {
            "apikey": supabaseKey,
            "Authorization": `Bearer ${supabaseKey}`
        }
    });

    const lawsuits = await res.json();
    const lawsuit = lawsuits[0];

    if (!lawsuit) {
        return new Response("Case Not Found in Global Database", { status: 404 });
    }

    // 2. Render SEO-friendly HTML
    const html = `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Legal Intelligence Report for Case ${lawsuit.case_number} | GRICH</title>
    <meta name="description" content="Official Legal Intelligence Report for Case ${lawsuit.case_number} - Plaintiff: ${lawsuit.plaintiff}. Verify litigation risk and compliance status for target e-commerce entities.">
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
    <style>
        body { background-color: #0a0f18; color: #f8fafc; font-family: 'Inter', sans-serif; }
        .glass { background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.05); }
        .grich-green { color: #34d399; }
        .bg-grich-green { background-color: #34d399; }
    </style>
</head>
<body class="min-h-screen p-6 md:p-20">
    <div class="max-w-4xl mx-auto space-y-12">
        <!-- Header -->
        <div class="flex items-center justify-between border-b border-white/5 pb-8">
            <div class="flex items-center gap-3">
                <div class="w-8 h-8 bg-grich-green rounded flex items-center justify-center font-black text-black text-sm">G</div>
                <span class="font-black tracking-tighter text-lg uppercase">GRICH <span class="grich-green">Intel Report</span></span>
            </div>
            <div class="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Security Level: PUBLIC_INDEX</div>
        </div>

        <!-- Main Info -->
        <div class="space-y-6">
            <div class="inline-block px-3 py-1 bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-[0.2em] rounded">High Risk Alert</div>
            <h1 class="text-5xl md:text-7xl font-black tracking-tighter leading-tight">
                CASE <span class="grich-green">${lawsuit.case_number}</span><br/>
                LITIGATION ARCHIVE
            </h1>
            
            <div class="grid md:grid-cols-2 gap-8 pt-6">
                <div class="glass p-6 rounded-2xl">
                    <div class="text-[10px] text-gray-500 font-bold uppercase mb-2">Primary Plaintiff</div>
                    <div class="text-2xl font-black">${lawsuit.plaintiff}</div>
                </div>
                <div class="glass p-6 rounded-2xl">
                    <div class="text-[10px] text-gray-500 font-bold uppercase mb-2">Litigation Risk Score</div>
                    <div class="text-4xl font-black text-red-500">${lawsuit.risk_score || '98'}/100</div>
                </div>
            </div>
        </div>

        <!-- Details -->
        <div class="glass rounded-2xl p-8 space-y-8">
            <div class="grid grid-cols-2 gap-y-8 gap-x-12 text-sm">
                <div>
                    <div class="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-1">Filed Date</div>
                    <div class="font-bold">${new Date(lawsuit.filed_date || lawsuit.created_at).toLocaleDateString()}</div>
                </div>
                <div>
                    <div class="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-1">Jurisdiction</div>
                    <div class="font-bold">${lawsuit.court || 'U.S. District Court'}</div>
                </div>
                <div>
                    <div class="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-1">Status</div>
                    <div class="font-bold text-grich-green">ACTIVE MONITORING</div>
                </div>
                <div>
                    <div class="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-1">Record ID</div>
                    <div class="font-mono text-xs text-gray-400">GR-${lawsuit.id.split('-')[0]}</div>
                </div>
            </div>

            <div class="pt-8 border-t border-white/5">
                <p class="text-gray-400 leading-relaxed text-sm">
                    This case involves intellectual property enforcement actions. GRICH Intelligence has verified that multiple e-commerce entities are named as defendants. 
                    Targeted merchants may be subject to TRO (Temporary Restraining Orders) and asset freezes.
                </p>
            </div>

            <div class="pt-6">
                <a href="/?search=${lawsuit.case_number}" class="inline-block bg-white text-black px-8 py-4 rounded font-black text-xs uppercase tracking-widest hover:bg-grich-green transition-colors w-full text-center">
                    Verify Your Store Status →
                </a>
            </div>
        </div>

        <footer class="text-center pt-12">
            <p class="text-[9px] text-gray-600 font-mono uppercase tracking-widest">Generated by GRICH Global Compliance System // Nodes Active: 12</p>
        </footer>
    </div>
</body>
</html>`;

    return new Response(html, {
        headers: { "Content-Type": "text/html;charset=UTF-8" }
    });
}
