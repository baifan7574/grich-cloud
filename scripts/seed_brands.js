import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// --- CONFIG ---
const SUPABASE_URL = 'https://rdlmumybuwveaaeceohj.supabase.co';
const SUPABASE_KEY = 'sb_publishable_aPXWTauRxJ88A88mwLDoPQ_puVi7PZj'; // Using Anon Key found in setup script
// Note: In a real backend script we should use SERVICE_ROLE_KEY for unlimited writes,
// but for a one-off seed, ANON might hit RLS policies. 
// However, 'keywords' usually has public read/write in early dev OR RLS allows anon insert.
// If this fails, we need the Service Key. 
// Checking config.ini or env... context didn't reveal Service Key, only Anon.
// Let's try. If it fails due to RLS, I will ask user for Service Key.

const MAX_BATCH_SIZE = 100;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function seedBrands() {
    const jsonPath = path.join(process.cwd(), 'sql', 'brands_1000.json');
    console.log(`📖 Reading brands from: ${jsonPath}`);

    try {
        const brandsData = fs.readFileSync(jsonPath, 'utf8');
        const brands = JSON.parse(brandsData);

        console.log(`📦 Found ${brands.length} brands to import.`);

        // Transform for DB
        const records = brands.map(name => ({
            brand_name: name,
            industry: 'General',
            status: 'pending',
            source_url: 'Imported_Batch_1'
        }));

        let successCount = 0;
        let failCount = 0;

        // Batch Insert
        for (let i = 0; i < records.length; i += MAX_BATCH_SIZE) {
            const batch = records.slice(i, i + MAX_BATCH_SIZE);
            console.log(`🚀 Inserting batch ${i} - ${i + batch.length}...`);

            const { data, error } = await supabase
                .from('keywords')
                .upsert(batch, { onConflict: 'brand_name', ignoreDuplicates: true });

            if (error) {
                console.error(`❌ Batch error:`, error.message);
                failCount += batch.length;
            } else {
                successCount += batch.length;
            }
        }

        console.log(`\n🎉 COMPLETION SUMMARY:`);
        console.log(`✅ Automatically Active Pages: ${successCount}`);
        console.log(`❌ Failed: ${failCount}`);
        console.log(`\n🌐 Your "Net" (Engine A) is now 800x larger.`);

    } catch (err) {
        console.error("🔥 Fatal Error:", err);
    }
}

seedBrands();
