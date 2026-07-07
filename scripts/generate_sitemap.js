const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL || 'https://rdlmumybuwveaaeceohj.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || process.env.PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_aPXWTauRxJ88A88mwLDoPQ_puVi7PZj';
const supabase = createClient(supabaseUrl, supabaseKey);

const DOMAIN = 'https://jaxfamlaw.com';
const LOCAL_CASE_SOURCE = path.join(__dirname, '../../business_docs/data_source_mvp/case_source_validation_mvp.json');
const LOCAL_CASE_LIMIT = Number(process.env.CASE_PAGE_LIMIT || 20);
const OUTPUT_FILES = [
  path.join(__dirname, '../public/sitemap_index.xml'),
  path.join(__dirname, '../public/sitemap.xml'),
  path.join(__dirname, '../dist/sitemap_index.xml'),
  path.join(__dirname, '../dist/sitemap.xml')
];

function caseToSlug(caseNumber) {
  return String(caseNumber || '')
    .trim()
    .toLowerCase()
    .replace(/:/g, '-')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function xmlEscape(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function normalizeDate(value, fallback) {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toISOString().split('T')[0];
}

function isAllowedLocalCase(row) {
  return row
    && row.seo_case_page_allowed === 'yes'
    && row.evidence_level === 'A'
    && row.case_number
    && /^\d{1,2}:\d{2,4}-cv-\d{1,6}$/i.test(row.case_number);
}

async function generateSitemap() {
  const today = new Date().toISOString().split('T')[0];
  const urls = [
    { loc: `${DOMAIN}/`, lastmod: today, changefreq: 'daily', priority: '1.0' },
    { loc: `${DOMAIN}/cn`, lastmod: today, changefreq: 'weekly', priority: '0.9' },
    { loc: `${DOMAIN}/intake`, lastmod: today, changefreq: 'weekly', priority: '0.8' },
    { loc: `${DOMAIN}/pricing`, lastmod: today, changefreq: 'weekly', priority: '0.8' },
    { loc: `${DOMAIN}/sample-report`, lastmod: today, changefreq: 'weekly', priority: '0.9' },
    { loc: `${DOMAIN}/lawyer-partner`, lastmod: today, changefreq: 'monthly', priority: '0.5' },
    { loc: `${DOMAIN}/guides/amazon-seller-tro-frozen-funds`, lastmod: today, changefreq: 'weekly', priority: '0.8' },
    { loc: `${DOMAIN}/law-firms/gbc-schedule-a-lawsuits`, lastmod: today, changefreq: 'weekly', priority: '0.8' },
    { loc: `${DOMAIN}/guide_tro_frozen`, lastmod: today, changefreq: 'weekly', priority: '0.8' },
    { loc: `${DOMAIN}/dashboard`, lastmod: today, changefreq: 'daily', priority: '0.6' },
    { loc: `${DOMAIN}/privacy`, lastmod: today, changefreq: 'monthly', priority: '0.3' },
    { loc: `${DOMAIN}/terms`, lastmod: today, changefreq: 'monthly', priority: '0.3' },
    { loc: `${DOMAIN}/refund`, lastmod: today, changefreq: 'monthly', priority: '0.3' }
  ];

  const seen = new Set();

  if (fs.existsSync(LOCAL_CASE_SOURCE)) {
    const localRows = JSON.parse(fs.readFileSync(LOCAL_CASE_SOURCE, 'utf8'));
    for (const row of localRows.filter(isAllowedLocalCase).slice(0, LOCAL_CASE_LIMIT)) {
      const slug = caseToSlug(row.case_number);
      if (!slug || seen.has(slug)) continue;
      seen.add(slug);
      urls.push({
        loc: `${DOMAIN}/cases/${slug}/`,
        lastmod: normalizeDate(row.filed_date, today),
        changefreq: 'weekly',
        priority: '0.8'
      });
    }
  }

  if (process.env.ENABLE_SUPABASE_SITEMAP === 'true') {
    const { data: lawsuits, error } = await supabase
      .from('lawsuits')
      .select('case_number, filed_date, created_at')
      .order('created_at', { ascending: false })
      .limit(1000);

    if (error) {
      console.warn(`Supabase sitemap query skipped: ${error.message}`);
    }

    for (const suit of lawsuits || []) {
    if (!suit.case_number || suit.case_number === 'Unknown') continue;
    const slug = caseToSlug(suit.case_number);
    if (!slug || seen.has(slug)) continue;
    if (!/^\d{1,2}-\d{2,4}-cv-\d{1,6}$/i.test(slug)) continue;
    seen.add(slug);
    urls.push({
      loc: `${DOMAIN}/cases/${slug}`,
      lastmod: normalizeDate(suit.filed_date || suit.created_at, today),
      changefreq: 'weekly',
      priority: '0.8'
    });
    }
  }

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  for (const u of urls) {
    xml += '  <url>\n';
    xml += `    <loc>${xmlEscape(u.loc)}</loc>\n`;
    xml += `    <lastmod>${xmlEscape(u.lastmod)}</lastmod>\n`;
    xml += `    <changefreq>${xmlEscape(u.changefreq)}</changefreq>\n`;
    xml += `    <priority>${xmlEscape(u.priority)}</priority>\n`;
    xml += '  </url>\n';
  }
  xml += '</urlset>\n';

  for (const file of OUTPUT_FILES) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, xml);
  }

  console.log(`Sitemap generated: ${urls.length} URLs`);
}

generateSitemap().catch(error => {
  console.error(error.message);
  process.exit(1);
});
