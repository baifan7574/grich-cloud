const fs = require('fs');
const path = require('path');

const SOURCE_FILE = path.join(__dirname, '../../business_docs/data_source_mvp/case_source_validation_mvp.json');
const OUTPUT_DIR = path.join(__dirname, '../cases');
const FUNCTION_HTML_FILE = path.join(__dirname, '../functions/verified_case_pages.js');
const DOMAIN = 'https://jaxfamlaw.com';
const LIMIT = Number(process.env.CASE_PAGE_LIMIT || 20);

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function caseToSlug(caseNumber) {
  return String(caseNumber || '')
    .trim()
    .toLowerCase()
    .replace(/:/g, '-')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function isAllowedCase(row) {
  return row
    && row.seo_case_page_allowed === 'yes'
    && row.evidence_level === 'A'
    && row.case_number
    && /^\d{1,2}:\d{2,4}-cv-\d{1,6}$/i.test(row.case_number);
}

function renderCasePage(row) {
  const slug = caseToSlug(row.case_number);
  const title = `${row.case_number} Public Record Check | ${row.plaintiff || 'Schedule A Case'} | JaxFamLaw Records`;
  const description = `Public-record summary for ${row.case_number}, ${row.plaintiff || 'a Schedule A case'}, ${row.court || 'U.S. District Court'}. Confirmed fields only. Not legal advice.`;
  const sourceUrl = row.source_url || 'https://www.courtlistener.com/';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <meta name="robots" content="index,follow,max-image-preview:large" />
  <link rel="canonical" href="${DOMAIN}/cases/${escapeHtml(slug)}/" />
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-950 text-slate-100">
  <header class="border-b border-white/10 bg-slate-950">
    <div class="max-w-5xl mx-auto px-5 h-16 flex items-center justify-between">
      <a href="/" class="font-black">JaxFamLaw <span class="text-amber-300">Records</span></a>
      <nav class="hidden sm:flex items-center gap-5 text-sm text-slate-300">
        <a href="/sample-report" class="hover:text-amber-300">Sample Report</a>
        <a href="/pricing" class="hover:text-amber-300">Pricing</a>
        <a href="/intake" class="hover:text-amber-300">Request Review</a>
      </nav>
    </div>
  </header>

  <main class="max-w-5xl mx-auto px-5 py-10">
    <p class="text-amber-300 font-bold text-sm">Verified public case record</p>
    <h1 class="mt-3 text-3xl md:text-5xl font-black leading-tight">${escapeHtml(row.case_number)} Public Record Summary</h1>
    <p class="mt-4 text-lg text-slate-300 max-w-3xl">
      This page summarizes confirmed public-record fields for a marketplace seller review workflow. It is an information service page, not legal advice.
    </p>

    <section class="mt-8 grid md:grid-cols-3 gap-4">
      <div class="border border-emerald-500/30 bg-emerald-500/10 rounded p-4">
        <div class="text-xs font-bold text-emerald-300">Confirmed from public source</div>
        <div class="mt-2 text-2xl font-black">${escapeHtml(row.case_number)}</div>
        <div class="mt-1 text-sm text-slate-300">Case number confirmed by ${escapeHtml(row.source_name || 'public source')}.</div>
      </div>
      <div class="border border-sky-500/30 bg-sky-500/10 rounded p-4">
        <div class="text-xs font-bold text-sky-300">Confirmed from public source</div>
        <div class="mt-2 font-black">${escapeHtml(row.court || 'U.S. District Court')}</div>
        <div class="mt-1 text-sm text-slate-300">Court field from public docket search.</div>
      </div>
      <div class="border border-slate-500/30 bg-white/5 rounded p-4">
        <div class="text-xs font-bold text-slate-300">Not confirmed / requires further review</div>
        <div class="mt-2 font-black">Store-name match</div>
        <div class="mt-1 text-sm text-slate-300">The search result does not confirm individual seller or store names.</div>
      </div>
    </section>

    <section class="mt-8 bg-white text-slate-950 rounded p-6">
      <h2 class="text-2xl font-black">Public Record Fields</h2>
      <dl class="mt-5 grid md:grid-cols-2 gap-5 text-sm">
        <div>
          <dt class="text-slate-500 font-bold">Case name</dt>
          <dd class="mt-1 font-semibold">${escapeHtml(row.case_name)}</dd>
        </div>
        <div>
          <dt class="text-slate-500 font-bold">Plaintiff</dt>
          <dd class="mt-1 font-semibold">${escapeHtml(row.plaintiff || 'Not listed in source row')}</dd>
        </div>
        <div>
          <dt class="text-slate-500 font-bold">Filed date</dt>
          <dd class="mt-1 font-semibold">${escapeHtml(row.filed_date || 'Not confirmed')}</dd>
        </div>
        <div>
          <dt class="text-slate-500 font-bold">Source</dt>
          <dd class="mt-1 font-semibold"><a class="text-blue-700 underline" href="${escapeHtml(sourceUrl)}" rel="nofollow noopener" target="_blank">${escapeHtml(row.source_name || 'Public source')}</a></dd>
        </div>
      </dl>
    </section>

    <section class="mt-8 grid md:grid-cols-2 gap-5">
      <div class="border border-white/10 rounded p-5">
        <h2 class="text-xl font-black">What this page can tell you</h2>
        <ul class="mt-4 space-y-2 text-slate-300 text-sm">
          <li>Case number, court, plaintiff, and public source status.</li>
          <li>Whether the public record appears to be a Schedule A style matter.</li>
          <li>What still needs manual review before relying on a store-name match.</li>
        </ul>
      </div>
      <div class="border border-white/10 rounded p-5">
        <h2 class="text-xl font-black">What this page cannot tell you</h2>
        <ul class="mt-4 space-y-2 text-slate-300 text-sm">
          <li>It does not confirm that your store is named in this case.</li>
          <li>It does not tell you how to respond to a court or platform notice.</li>
          <li>It does not promise any account, payment, or frozen-funds outcome.</li>
        </ul>
      </div>
    </section>

    <section class="mt-8 bg-amber-300 text-slate-950 rounded p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-5">
      <div>
        <h2 class="text-2xl font-black">Need us to check your notice or store name?</h2>
        <p class="mt-2 text-sm">Submit your case number, platform notice, and seller details. We label what is confirmed, user-provided, and not confirmed.</p>
      </div>
      <div class="flex flex-col sm:flex-row gap-3 shrink-0">
        <a href="/intake?tier=rapid&case=${encodeURIComponent(row.case_number)}" class="bg-slate-950 text-white px-5 py-3 rounded font-black text-center">Request Rapid Case Check</a>
        <a href="/sample-report" class="border border-slate-950 px-5 py-3 rounded font-black text-center">View Sample Report</a>
      </div>
    </section>
  </main>

  <footer class="max-w-5xl mx-auto px-5 py-8 text-xs text-slate-500">
    Independent public-record intelligence service. Not a law firm. Not legal advice.
  </footer>
</body>
</html>
`;
}

function main() {
  const rows = JSON.parse(fs.readFileSync(SOURCE_FILE, 'utf8'));
  const cases = rows.filter(isAllowedCase).slice(0, LIMIT);

  fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  for (const row of cases) {
    const slug = caseToSlug(row.case_number);
    row.slug = slug;
    const dir = path.join(OUTPUT_DIR, slug);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), renderCasePage(row));
  }

  const htmlBySlug = {};
  for (const row of cases) {
    htmlBySlug[row.slug] = renderCasePage(row);
  }
  fs.writeFileSync(
    FUNCTION_HTML_FILE,
    `// Generated by scripts/generate_verified_case_pages.js. Do not edit by hand.\nexport const VERIFIED_CASE_PAGE_HTML = ${JSON.stringify(htmlBySlug, null, 2)};\n`
  );

  console.log(`Generated ${cases.length} verified case pages in ${OUTPUT_DIR}`);
  console.log(`Generated verified case function bundle at ${FUNCTION_HTML_FILE}`);
}

main();
