import https from 'node:https';
import { createClient } from '@supabase/supabase-js';

// --- CONFIGURATION ---
const CL_API_KEY = '7f4374db0b69b37c02779dd59ed9c3b0fb90883d'; // From Audit
const SUPABASE_URL = 'https://rdlmumybuwveaaeceohj.supabase.co'; // From Audit
const SUPABASE_KEY = 'sb_publishable_aPXWTauRxJ88A88mwLDoPQ_puVi7PZj'; // Anon Key

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// --- UTILS ---

// 1. Clean Plaintiff Name to extract Brand (The "Cleaning Logic")
function extractBrand(plaintiffRaw) {
    if (!plaintiffRaw) return 'Unknown';
    let brand = plaintiffRaw;

    // Remove common corporate suffixes
    const suffixes = [
        'Brand IP Holdings', 'IP Holdings', 'Holdings',
        'Inc.', 'LLC', 'L.L.C.', 'Corp.', 'Corporation',
        'Co.', 'Limited', 'S.A.S.', 'S.A.', 'GmbH'
    ];

    // Regex replace (case insensitive)
    suffixes.forEach(suffix => {
        const regex = new RegExp(`\\s*${suffix.replace('.', '\\.')}`, 'gi');
        brand = brand.replace(regex, '');
    });

    // Remove "The", "Enforcement"
    brand = brand.replace(/^The\s+/i, '');
    brand = brand.replace(/\s+Enforcement$/i, '');
    brand = brand.replace(/\s+International$/i, '');

    return brand.trim();
}

// 2. Fetch from CourtListener (The "Radar")
// We look for 'Civil' cases, type 'Trademark', filed in the last 2 days
function fetchDailyCases() {
    return new Promise((resolve, reject) => {
        const url = `https://www.courtlistener.com/api/rest/v4/dockets/?` +
            `q="Schedule A"` +
            `&filed_after=${getDateString(30)}` +
            `&order_by=-filed_date`;

        console.log(`📡 RADAR INITIALIZED: Scanning CourtListener...`);
        console.log(`   Target: ${url}`);

        const opts = {
            headers: { 'Authorization': `Token ${CL_API_KEY}` }
        };

        https.get(url, opts, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    // DEBUG RAW RESPONSE
                    if (res.statusCode !== 200) {
                        console.log("❌ API ERROR CODE:", res.statusCode);
                        console.log("❌ RAW RESPONSE:", data);
                    }

                    const json = JSON.parse(data);
                    if (!json.results || json.results.length === 0) {
                        console.log("⚠️ NO RESULTS FOUND. RAW DATA DUMP:", data.substring(0, 200));
                    }
                    resolve(json.results || []);
                } catch (e) {
                    reject(e);
                }
            });
        }).on('error', reject);
    });
}

function getDateString(daysAgo) {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().split('T')[0];
}

// --- MAIN EXECUTION ---
async function runRadar() {
    try {
        const cases = await fetchDailyCases();
        console.log(`✅  Radar Complete. Found ${cases.length} new signals.`);

        if (cases.length === 0) {
            console.log("   No new cases found today. Radar sleeping.");
            return;
        }

        // Process found cases
        for (const c of cases) {
            const plaintiff = c.party_name || "Unknown Plaintiff"; // Simplified extraction
            const brand = extractBrand(plaintiff);
            const caseNo = c.docket_number;
            const court = c.court_id;

            console.log(`   ------------------------------------------`);
            console.log(`   Signal Detected: ${caseNo}`);
            console.log(`   Plaintiff: ${plaintiff}`);

            if (brand === 'Unknown' || brand === 'Unknown Plaintiff') {
                console.log(`      ⚠️ Skipped: Sealed/Unknown Plaintiff. Monitoring for unseal event.`);
                continue;
            }

            console.log(`   -> Extracted Brand: [ ${brand} ]`);

            // 1. Insert into 'lawsuits' (Raw Data)
            const { error: err1 } = await supabase.from('lawsuits').upsert({
                case_number: caseNo,
                plaintiff: plaintiff,
                brand_name: brand,
                court: court,
                filed_date: new Date().toISOString(),
                risk_score: 80 // Initial detected score
            });

            if (err1) console.log(`      ⚠️ Store Lawsuit Error: ${err1.message}`);
            else console.log(`      💾 Lawsuit Stored.`);

            // 2. Insert into 'keywords' (Triggering the Page)
            // Strategy: Upsert (If exists, update date; if new, insert)
            const { error: err2 } = await supabase.from('keywords').upsert({
                brand_name: brand,
                industry: 'Automated Detection',
                status: 'active',
                source_url: 'CourtListener API',
                last_updated: new Date().toISOString()
            }, { onConflict: 'brand_name' });

            if (err2) console.log(`      ⚠️ Page Gen Error: ${err2.message}`);
            else console.log(`      🚀 PAGE GENERATED: /compliance/${brand.replace(/\s+/g, '%20')}`);
        }

    } catch (e) {
        console.error("❌ RADAR MALFUNCTION:", e.message);
    }
}

runRadar();
