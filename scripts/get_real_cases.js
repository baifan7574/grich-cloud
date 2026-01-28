// Grich Real Sniper Tool
// Needs to fetch real case data from Supabase to prove 'Full Auto Combat Mode'
// Usage: node scripts/get_real_cases.js

// Grich Real Sniper Tool
// Needs to fetch real case data from Supabase to prove 'Full Auto Combat Mode'
// Usage: node scripts/get_real_cases.js
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL || "https://rdlmumybuwveaaeceohj.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_KEY || process.env.PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_aPXWTauRxJ88A88mwLDoPQ_puVi7PZj";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function findRealCases() {
    console.log("SEARCHING FOR REAL COMBAT DATA...");

    // Fetch 10 recent lawsuits
    const { data: lawsuits, error } = await supabase
        .from('lawsuits')
        .select('*')
        .order('filed_date', { ascending: false })
        .limit(20);

    if (error) {
        console.error("Error fetching lawsuits:", error);
        return;
    }

    // Filter to find 3 DISTINCT plaintiffs (non-ZARA if possible, to show variety)
    const distinctCases = [];
    const usedPlaintiffs = new Set();
    const banned = ['ZARA', 'INDUSTRIA']; // Skip the one we used for testing

    for (const law of lawsuits) {
        if (!law.plaintiff) continue;

        // Simple distinct check
        const firstWord = law.plaintiff.split(' ')[0].toUpperCase();

        if (!banned.includes(firstWord) && !usedPlaintiffs.has(firstWord) && distinctCases.length < 3) {
            // Also need a defendant for this case to make the link work perfectly
            const { data: defs } = await supabase
                .from('defendants')
                .select('defendant_name, id')
                .eq('case_number', law.case_number)
                .limit(1);

            if (defs && defs.length > 0) {
                distinctCases.push({
                    case_number: law.case_number,
                    plaintiff: law.plaintiff,
                    defendant: defs[0].defendant_name,
                    id: defs[0].id
                });
                usedPlaintiffs.add(firstWord);
            }
        }
    }

    console.log("\n>>> COMBAT READY TARGETS ACQUIRED <<<\n");
    distinctCases.forEach((c, i) => {
        const url = `https://jaxfamlaw.com/case_template.html?case=${c.case_number}&target=${c.id}&paid=true`;
        console.log(`TARGET #${i + 1}: ${c.plaintiff} v. ${c.defendant}`);
        console.log(`LINK: ${url}\n`);
    });
}

findRealCases();
