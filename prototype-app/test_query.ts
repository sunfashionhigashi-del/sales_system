import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://ehaehtdtgerrxbgtxfkp.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_CxuT25cVkj4pxnCswy7jcA_-fPL55y1';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function test() {
    console.log("Testing basic select...");
    let res = await supabase.from('order_items').select('id, archived, status').limit(5);
    console.log("Basic response:", res.data);

    console.log("\nTesting .or('archived.is.null,archived.eq.false')...");
    let res2 = await supabase.from('order_items').select('id, archived, status').or('archived.is.null,archived.eq.false').limit(5);
    console.log("OR filter response length:", res2.data?.length, "Error:", res2.error);
    if (res2.error) console.log(res2.error);
}

test();
