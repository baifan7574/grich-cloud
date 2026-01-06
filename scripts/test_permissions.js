
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://rdlmumybuwveaaeceohj.supabase.co';
const SUPABASE_KEY = 'sb_publishable_aPXWTauRxJ88A88mwLDoPQ_puVi7PZj';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testInsert() {
    console.log("🧪 Testing Database Permissions...");
    const { data, error } = await supabase.from('keywords').upsert({
        brand_name: 'TEST_PERMISSION_CHECK_IGNORE_ME',
        status: 'test',
        industry: 'Test'
    }, { onConflict: 'brand_name' });

    if (error) {
        console.log("❌ Permission Denied:", error.message);
        console.log("👉 ACTION REQUIRED: User needs to run the 'keywords' RLS policy SQL.");
    } else {
        console.log("✅ Permission Granted! Database is fully open.");
        // Cleanup
        await supabase.from('keywords').delete().eq('brand_name', 'TEST_PERMISSION_CHECK_IGNORE_ME');
    }
}

testInsert();
