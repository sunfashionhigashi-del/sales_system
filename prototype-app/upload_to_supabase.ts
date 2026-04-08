import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const SUPABASE_URL = 'https://ehaehtdtgerrxbgtxfkp.supabase.co';
const SUPABASE_KEY = 'sb_publishable_CxuT25cVkj4pxnCswy7jcA_-fPL55y1';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
    try {
        console.log("Reading gcga_data.json...");
        const data = JSON.parse(fs.readFileSync('./src/gcga_data.json', 'utf8'));
        console.log(`Loaded ${data.length} records. Preparing to insert...`);

        // Clean existing rows
        console.log("Emptying order_items table for fresh insert...");
        const { error: clearErr } = await supabase.from('order_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        if (clearErr) {
            console.error("Error clearing table:", clearErr);
        }

        const BATCH_SIZE = 1000;
        let successCount = 0;

        for (let i = 0; i < data.length; i += BATCH_SIZE) {
            const batch = data.slice(i, i + BATCH_SIZE).map((row: any) => {
                const newRow = { ...row };
                // 1. Map 'memo' to 'comments'
                if (newRow.memo !== undefined) {
                    newRow.comments = newRow.memo;
                    delete newRow.memo;
                }
                // 2. Map 'ship_date' to something else or delete it if it's not in schema
                if (newRow.ship_date !== undefined) {
                    // schema has 'factory_date' or 'bl_date'. we'll keep bl_date from json if exists
                    delete newRow.ship_date;
                }
                return newRow;
            });
            console.log(`Inserting batch ${i} to ${i + batch.length}...`);
            const { error: insertErr } = await supabase.from('order_items').insert(batch);
            if (insertErr) {
               console.error("Error inserting batch:", insertErr);
            } else {
               successCount += batch.length;
            }
        }
        
        console.log(`Successfully uploaded ${successCount} records to Supabase.`);

    } catch (e) {
        console.error("Fatal Error:", e);
    }
}
run();
