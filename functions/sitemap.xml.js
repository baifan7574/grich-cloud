export async function onRequest(context) {
  const { env } = context;
  const baseUrl = "https://grich-cloud.pages.dev";

  try {
    const supabaseUrl = "https://rdlmumybuwveaaeceohj.supabase.co";
    const supabaseKey = env.PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_aPXWTauRxJ88A88mwLDoPQ_puVi7PZj";

    // 1. Fetch all unique case numbers
    const res = await fetch(`${supabaseUrl}/rest/v1/lawsuits?select=case_number,updated_at`, {
      headers: {
        "apikey": supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`
      }
    });

    if (!res.ok) {
      throw new Error(`Supabase Fetch Failed: ${res.status} ${res.statusText}`);
    }

    const cases = await res.json();
    if (!Array.isArray(cases)) {
      throw new Error(`Supabase returned non-array: ${JSON.stringify(cases)}`);
    }

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
      // Robust timestamp handling
      let lastModIso;
      try {
        const d = new Date(c.updated_at || new Date());
        lastModIso = !isNaN(d.getTime()) ? d.toISOString() : new Date().toISOString();
      } catch (e) {
        lastModIso = new Date().toISOString();
      }

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

  } catch (error) {
    // Return the error message as a plain text response for debugging
    return new Response(`Sitemap XML Worker Error: ${error.message}\n${error.stack}`, {
      status: 200, // Returning 200 so we can actually see it in the browser
      headers: { "Content-Type": "text/plain;charset=UTF-8" }
    });
  }
}
