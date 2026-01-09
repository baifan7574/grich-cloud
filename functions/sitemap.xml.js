export async function onRequest(context) {
    const { env } = context;
    const supabaseUrl = "https://rdlmumybuwveaaeceohj.supabase.co";
    const supabaseKey = env.PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_aPXWTauRxJ88A88mwLDoPQ_puVi7PZj";

    // 1. Fetch all unique case numbers
    const res = await fetch(`${supabaseUrl}/rest/v1/lawsuits?select=case_number,updated_at`, {
        headers: {
            "apikey": supabaseKey,
            "Authorization": `Bearer ${supabaseKey}`
        }
    });

    const cases = await res.json();
    const baseUrl = "https://grich-cloud.pages.dev";

    // 2. Build the XML string
    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>hourly</changefreq>
    <priority>1.0</priority>
  </url>`;

    cases.forEach(c => {
        // Fallback logic for missing or invalid updated_at
        const lastModDate = new Date(c.updated_at || new Date());
        const lastModIso = !isNaN(lastModDate.getTime()) ? lastModDate.toISOString() : new Date().toISOString();

        sitemap += `
  <url>
    <loc>${baseUrl}/case/${encodeURIComponent(c.case_number)}</loc>
    <lastmod>${lastModIso}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>`;
    });

    sitemap += `\n</urlset>`;

    return new Response(sitemap, {
        headers: {
            "Content-Type": "application/xml;charset=UTF-8",
            "Cache-Control": "public, max-age=3600"
        }
    });
}
