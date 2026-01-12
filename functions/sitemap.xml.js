export async function onRequest(context) {
  const { env } = context;
  const baseUrl = "https://grich-cloud.pages.dev";

  try {
    const supabaseUrl = "https://rdlmumybuwveaaeceohj.supabase.co";
    const supabaseKey = env.PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_aPXWTauRxJ88A88mwLDoPQ_puVi7PZj";

    // 1a. Fetch all unique case numbers
    const resCases = await fetch(`${supabaseUrl}/rest/v1/lawsuits?select=case_number,created_at`, {
      headers: { "apikey": supabaseKey, "Authorization": `Bearer ${supabaseKey}` }
    });

    // 1b. Fetch all verified defendants (for massive SEO footprint)
    const resDefendants = await fetch(`${supabaseUrl}/rest/v1/defendants?select=id,found_at`, {
      headers: { "apikey": supabaseKey, "Authorization": `Bearer ${supabaseKey}` }
    });

    if (!resCases.ok || !resDefendants.ok) {
      throw new Error(`Supabase Fetch Failed: Cases=${resCases.status} Defendants=${resDefendants.status}`);
    }

    const cases = await resCases.json();
    const defendants = await resDefendants.json();

    // 2. Build the XML string
    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>hourly</changefreq>
    <priority>1.0</priority>
  </url>`;

    // Case Pages (Priority High)
    cases.forEach(c => {
      let lastModIso = new Date().toISOString();
      try { if (c.created_at) { const d = new Date(c.created_at); if (!isNaN(d.getTime())) lastModIso = d.toISOString(); } } catch (e) { }
      sitemap += `
  <url>
    <loc>${baseUrl}/case/${encodeURIComponent(c.case_number)}</loc>
    <lastmod>${lastModIso}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>`;
    });

    // Defendant Pages (The "Net")
    defendants.forEach(d => {
      let lastModIso = new Date().toISOString();
      try { if (d.found_at) { const dt = new Date(d.found_at); if (!isNaN(dt.getTime())) lastModIso = dt.toISOString(); } } catch (e) { }
      sitemap += `
  <url>
    <loc>${baseUrl}/target/${d.id}</loc>
    <lastmod>${lastModIso}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`;
    });

    sitemap += `\n</urlset>`;

    return new Response(sitemap, {
      headers: {
        "Content-Type": "application/xml;charset=UTF-8",
        "Cache-Control": "public, max-age=3600"
      }
    });

  } catch (error) {
    // Return the error message as a plain text response for debugging
    return new Response(`Sitemap XML Worker Error: ${error.message}\n${error.stack}`, {
      status: 200, // Returning 200 so we can actually see it in the browser
      headers: { "Content-Type": "text/plain;charset=UTF-8" }
    });
  }
}
