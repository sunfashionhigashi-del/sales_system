import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ehaehtdtgerrxbgtxfkp.supabase.co';
const SUPABASE_KEY = 'sb_publishable_CxuT25cVkj4pxnCswy7jcA_-fPL55y1';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function getUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function generateDummies() {
    const statuses = ['見積中', '発注待', '発注済', '先行発注', '加工中', '材料充当', '請求済', 'キャンセル'];
    const customers = ['Sun Fashion America', 'Fast Retailing', 'Zara', 'Toyota Tsusho', 'Local Boutique'];
    const reps = ['松岡', '大谷'];
    
    let items = [];
    
    // 1: Quote (見積中)
    items.push({
        id: getUUID(), status: '見積中', quote_no: `QT-260404-101`, rep: '松岡', customer: 'Fast Retailing', end_user: 'GU',
        supplier: 'YKK', category: 'ボタン', item_code: 'BTN-001', item_name: 'Resin Button 15mm',
        qty: 5000, unit: 'PCS', cost_price: 15.0, cost_currency: 'JPY', internal_rate: 145, markup_rate: '1.5',
        sales_price: 22.5, sales_currency: 'JPY', created_at: new Date().toISOString()
    });

    // 2: SFA Reverse Calc (Quote)
    items.push({
        id: getUUID(), status: '見積中', quote_no: `QT-260404-102`, rep: '大谷', customer: 'Sun Fashion America', end_user: 'Ralph Lauren',
        supplier: 'Shinyei', category: 'リボン', item_code: 'RBN-99', item_name: 'Silk Ribbon Purple',
        qty: 1000, unit: 'YRD', cost_price: 0.8, cost_currency: 'USD', internal_rate: 145, markup_rate: '現法自動',
        sales_price: 1.25, end_user_price: 1.62, sales_currency: 'USD', misc_cost: 0.1, misc_currency: 'USD', created_at: new Date().toISOString()
    });

    // 3: Order Received (発注待) - Needs PO
    items.push({
        id: getUUID(), status: '発注待', quote_no: `QT-260401-055`, order_date: '2026-04-03', order_id: 'CUST-PO-991', rep: '松岡', customer: 'Zara', end_user: '-',
        supplier: 'Shanghai Lace', category: 'レース', item_code: 'LCE-A1', item_name: 'Cotton Lace 5cm',
        qty: 3000, unit: 'MTR', cost_price: 0.5, cost_currency: 'USD', internal_rate: 150, markup_rate: '1.3',
        sales_price: 0.75, sales_currency: 'USD', created_at: new Date().toISOString()
    });

    // 4: Pre-order (先行発注) - Waiting for customer confirmation
    items.push({
        id: getUUID(), status: '先行発注', po_no: `PO-260402-990`, po_date: '2026-04-02', rep: '大谷', customer: 'Toyota Tsusho', end_user: '-',
        supplier: 'YKK', category: 'パーツ', item_code: 'ZIP-M3', item_name: 'Metal Zipper 10cm',
        qty: 10000, unit: 'PCS', cost_price: 35.0, cost_currency: 'JPY', internal_rate: 145, markup_rate: '1.2',
        sales_price: 45.0, sales_currency: 'JPY', created_at: new Date().toISOString()
    });

    // 5: Order Processing (発注済)
    items.push({
        id: getUUID(), status: '発注済', order_date: '2026-04-01', po_no: `PO-260401-112`, po_date: '2026-04-01', rep: '松岡', customer: 'Fast Retailing', end_user: 'UNIQLO',
        supplier: 'Kurabo', category: 'PUテープ', item_code: 'PU-X9', item_name: 'Stretch Tape 5mm',
        qty: 20000, unit: 'MTR', cost_price: 12.0, cost_currency: 'JPY', internal_rate: 145, markup_rate: '1.5',
        sales_price: 18.0, sales_currency: 'JPY', factory_date: '2026-04-15', created_at: new Date().toISOString()
    });

    // 6: Invoiced (請求済)
    items.push({
        id: getUUID(), status: '請求済', order_date: '2026-03-20', po_no: `PO-260320-001`, po_date: '2026-03-20', invoice_no: 'INV-260403-1234', invoice_date: '2026-04-03',
        rep: '大谷', customer: 'Sun Fashion America', end_user: 'Brooks Brothers',
        supplier: 'Toyo', category: 'ボタン', item_code: 'BTN-SH', item_name: 'Shell Button 11.5mm',
        qty: 5000, unit: 'GRS', cost_price: 2.0, cost_currency: 'USD', exchange_rate: 148.5, internal_rate: 145, markup_rate: '現法自動',
        sales_price: 3.25, end_user_price: 4.22, sales_currency: 'USD', bl_date: '2026-04-01', locked: true, created_at: new Date().toISOString()
    });

    // 7: Invoiced Revision 1 (請求済 - Audit Log)
    items.push({
        id: getUUID(), status: '請求済', order_date: '2026-03-15', po_no: `PO-260315-444`, po_date: '2026-03-15', invoice_no: 'INV-260401-5555-Rev1', invoice_date: '2026-04-02', revision: 1,
        rep: '松岡', customer: 'Zara', end_user: '-',
        supplier: 'YKK', category: 'パーツ', item_code: 'SLD-01', item_name: 'Slider No.5',
        qty: 8000, unit: 'PCS', cost_price: 18.0, cost_currency: 'JPY', exchange_rate: 149.0, internal_rate: 145, markup_rate: '1.3',
        sales_price: 24.0, sales_currency: 'JPY', bl_date: '2026-03-28', locked: true, comments: '[SYS] Rev1修正差分: 数量[10000→8000]', created_at: new Date().toISOString()
    });

    // 8-9: Kit Processing (材料充当 & 加工中)
    const kitLink = 'PRC-5829';
    items.push({
        id: getUUID(), status: '材料充当', po_no: `PO-260325-111`, rep: '大谷', customer: 'Fast Retailing',
        supplier: 'RibbonMaker', category: 'リボン', item_code: 'RBN-B1', item_name: 'Base Ribbon',
        qty: 1000, unit: 'MTR', cost_price: 50.0, cost_currency: 'JPY', link_id: kitLink, locked: true, comments: `[SYS] ${kitLink}へ投入`, created_at: new Date().toISOString()
    });
    items.push({
        id: getUUID(), status: '加工中', order_date: '2026-04-04', rep: '大谷', customer: 'Fast Retailing',
        supplier: '-', category: 'キット/加工品', item_code: 'KIT-001', item_name: 'Ribbon Bow Assembly',
        qty: 500, unit: 'SET', cost_price: 110.0, cost_currency: 'JPY', link_id: kitLink, po_date: '-',
        markup_rate: '2.0', sales_price: 220.0, sales_currency: 'JPY', comments: '[SYS] 材料費 50000円 + 加工賃 5000円 = 仕入原価', created_at: new Date().toISOString()
    });

    // Random Generates
    for(let i=10; i<=20; i++){
        const isMatsuoka = i % 2 === 0;
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        items.push({
            id: getUUID(),
            status: status,
            rep: isMatsuoka ? '松岡' : '大谷',
            customer: customers[Math.floor(Math.random() * customers.length)],
            category: 'パーツ',
            item_code: `PRT-00${i}`,
            item_name: `Metal Ring ${i}mm`,
            qty: 100 * i,
            unit: 'PCS',
            cost_price: 10 + i,
            cost_currency: 'JPY',
            internal_rate: 145,
            markup_rate: '1.5',
            sales_price: Math.floor((10 + i) * 1.5),
            sales_currency: 'JPY',
            locked: ['材料充当', '請求済'].includes(status),
            created_at: new Date().toISOString()
        })
    }

    return items;
}

async function run() {
    console.log('Fetching existing IDs...');
    const { data: rows } = await supabase.from('order_items').select('id');
    if (rows && rows.length > 0) {
        console.log(`Deleting ${rows.length} rows...`);
        const ids = rows.map(r => r.id);
        for(let i=0; i<ids.length; i+=100) {
           await supabase.from('order_items').delete().in('id', ids.slice(i, i+100));
        }
    }
    console.log('Inserting new dummy data...');
    const dummies = generateDummies();
    const { error } = await supabase.from('order_items').insert(dummies);
    if (error) {
        console.error('Error inserting:', error);
    } else {
        console.log(`Successfully populated ${dummies.length} rows.`);
    }
}
run();
