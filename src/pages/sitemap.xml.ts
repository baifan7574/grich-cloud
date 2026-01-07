
import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL;
const supabaseKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY || process.env.PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export const GET: APIRoute = async () => {
  // 1. Fetch all brands/cases from DB
  const { data: lawsuits } = await supabase
    .from('lawsuits')
    .select('brand_name, updated_at')
    .limit(50000); // Google limit per sitemap

  const site = 'https://jaxfamlaw.com'; // User's domain

  // 2. Generate XML
  // Engine 1 & 2 Targets
  const urls = (lawsuits || []).map(row => {
    const brandParam = encodeURIComponent(row.brand_name);
    const lastMod = row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString();
    return `
  <url>
    <loc>${site}/compliance/${brandParam}</loc>
    <lastmod>${lastMod}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>`;
  }).join('');

  // 3. Construct Final XML
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${site}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  ${urls}
</urlset>`;

  return new Response(sitemap, {
    headers: {
      'Content-Type': 'application/xml'
    }
  });
};
