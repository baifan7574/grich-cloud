import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://rdlmumybuwveaaeceohj.supabase.co';
const SUPABASE_KEY = 'sb_publishable_aPXWTauRxJ88A88mwLDoPQ_puVi7PZj'; // Anon Key

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkTable(tableName) {
    const { data, error } = await supabase.from(tableName).select('count', { count: 'exact', head: true });

    if (error) {
        if (error.code === '42P01') { // undefined_table
            return '❌ Missing';
        }
        return `❌ Error: ${error.message}`;
    }
    return '✅ Exists';
}

async function diagnose() {
    console.log("🔍 Checking Database Tables...\n");

    const tables = ['keywords', 'reports', 'defendants', 'lawsuits'];

    for (const t of tables) {
        const status = await checkTable(t);
        console.log(`${t.padEnd(15)}: ${status}`);
    }
    console.log("\nNote: 'Missing' means you need to run the SQL to create it.");
}

diagnose();
