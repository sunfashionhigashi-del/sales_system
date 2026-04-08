import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://ehaehtdtgerrxbgtxfkp.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_CxuT25cVkj4pxnCswy7jcA_-fPL55y1';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
    console.log("Cleaning up statuses...");
    let totalUpdated = 0;
    while(true) {
        const { data: items, error: fetchErr } = await supabase
            .from('order_items')
            .select('id, status, order_date')
            .eq('status', '発注待')
            .limit(1000);
            
        if (fetchErr) {
            console.error(fetchErr);
            break;
        }
        
        const toUpdate = items.filter((d: any) => !d.order_date || d.order_date.trim() === '');
        if (toUpdate.length === 0) {
            console.log("No more items to update.");
            break;
        }
        console.log(`Found ${toUpdate.length} items to update...`);
        
        let batchSuccess = 0;
        const BATCH_SIZE = 50;
        for (let i = 0; i < toUpdate.length; i += BATCH_SIZE) {
            const batchIds = toUpdate.slice(i, i + BATCH_SIZE).map((d: any) => d.id);
            const { error: upErr } = await supabase
                .from('order_items')
                .update({ status: '見積中' })
                .in('id', batchIds);
                
            if (upErr) {
                console.error("Batch error:", upErr);
                break;
            }
            batchSuccess += batchIds.length;
        }
        totalUpdated += batchSuccess;
        console.log(`Cumulative total updated so far: ${totalUpdated}`);
    }
    console.log(`Finished updating a total of ${totalUpdated} items.`);
}

run();
