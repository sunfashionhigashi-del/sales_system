$url = "https://ehaehtdtgerrxbgtxfkp.supabase.co/rest/v1/order_items"
$key = "sb_publishable_CxuT25cVkj4pxnCswy7jcA_-fPL55y1"

$headers = @{
    "apikey" = $key
    "Authorization" = "Bearer $key"
    "Content-Type" = "application/json"
    "Prefer" = "return=minimal"
}

Write-Host "Deleting existing rows..."
Invoke-RestMethod -Uri "$url?id=not.is.null" -Method Delete -Headers $headers

Write-Host "Inserting new dummy records..."
$data = '[
  {"status":"見積中", "rep":"松岡", "customer":"Fast Retailing", "end_user":"GU", "supplier":"YKK", "category":"ボタン", "item_code":"BTN-001", "item_name":"Resin Button 15mm", "qty":5000, "unit":"PCS", "cost_price":15.0, "cost_currency":"JPY", "internal_rate":145, "markup_rate":"1.5", "sales_price":22.5, "sales_currency":"JPY", "quote_no":"QT-260404-101"},
  {"status":"見積中", "rep":"大谷", "customer":"Sun Fashion America", "end_user":"Ralph Lauren", "supplier":"Shinyei", "category":"リボン", "item_code":"RBN-99", "item_name":"Silk Ribbon Purple", "qty":1000, "unit":"YRD", "cost_price":0.8, "cost_currency":"USD", "internal_rate":145, "markup_rate":"現法自動", "sales_price":1.25, "sales_currency":"USD", "end_user_price":1.62, "misc_cost":0.1, "misc_currency":"USD", "quote_no":"QT-260404-102"},
  {"status":"発注待", "rep":"松岡", "customer":"Zara", "end_user":"-", "supplier":"Shanghai Lace", "category":"レース", "item_code":"LCE-A1", "item_name":"Cotton Lace 5cm", "qty":3000, "unit":"MTR", "cost_price":0.5, "cost_currency":"USD", "internal_rate":150, "markup_rate":"1.3", "sales_price":0.75, "sales_currency":"USD", "quote_no":"QT-260401-055", "order_date":"2026-04-03"},
  {"status":"先行発注", "rep":"大谷", "customer":"Toyota Tsusho", "end_user":"-", "supplier":"YKK", "category":"パーツ", "item_code":"ZIP-M3", "item_name":"Metal Zipper 10cm", "qty":10000, "unit":"PCS", "cost_price":35.0, "cost_currency":"JPY", "internal_rate":145, "markup_rate":"1.2", "sales_price":45.0, "sales_currency":"JPY", "po_no":"PO-260402-990", "po_date":"2026-04-02"},
  {"status":"発注済", "rep":"松岡", "customer":"Fast Retailing", "end_user":"UNIQLO", "supplier":"Kurabo", "category":"PUテープ", "item_code":"PU-X9", "item_name":"Stretch Tape 5mm", "qty":20000, "unit":"MTR", "cost_price":12.0, "cost_currency":"JPY", "internal_rate":145, "markup_rate":"1.5", "sales_price":18.0, "sales_currency":"JPY", "po_no":"PO-260401-112", "po_date":"2026-04-01", "order_date":"2026-04-01", "factory_date":"2026-04-15"},
  {"status":"請求済", "rep":"大谷", "customer":"Sun Fashion America", "end_user":"Brooks Brothers", "supplier":"Toyo", "category":"ボタン", "item_code":"BTN-SH", "item_name":"Shell Button 11.5mm", "qty":5000, "unit":"GRS", "cost_price":2.0, "cost_currency":"USD", "internal_rate":145, "markup_rate":"現法自動", "sales_price":3.25, "sales_currency":"USD", "end_user_price":4.22, "exchange_rate":148.5, "quote_no":"QT-260320-111", "order_date":"2026-03-20", "po_no":"PO-260320-001", "po_date":"2026-03-20", "bl_date":"2026-04-01", "invoice_no":"INV-260403-1234", "invoice_date":"2026-04-03", "locked":true},
  {"status":"請求済", "rep":"松岡", "customer":"Zara", "end_user":"-", "supplier":"YKK", "category":"パーツ", "item_code":"SLD-01", "item_name":"Slider No.5", "qty":8000, "unit":"PCS", "cost_price":18.0, "cost_currency":"JPY", "internal_rate":145, "markup_rate":"1.3", "sales_price":24.0, "sales_currency":"JPY", "exchange_rate":149.0, "order_date":"2026-03-15", "po_no":"PO-260315-444", "po_date":"2026-03-15", "invoice_no":"INV-260401-5555-Rev1", "invoice_date":"2026-04-02", "bl_date":"2026-03-28", "locked":true, "revision":1, "comments":"[SYS] Rev1修正差分: 数量[10000→8000]"},
  {"status":"材料充当", "rep":"大谷", "customer":"Fast Retailing", "supplier":"RibbonMaker", "category":"リボン", "item_code":"RBN-B1", "item_name":"Base Ribbon", "qty":1000, "unit":"MTR", "cost_price":50.0, "cost_currency":"JPY", "link_id":"PRC-9999", "locked":true, "comments":"[SYS] PRC-9999へ投入", "po_no":"PO-260325-111"},
  {"status":"加工中", "rep":"大谷", "customer":"Fast Retailing", "supplier":"-", "category":"キット/加工品", "item_code":"KIT-001", "item_name":"Ribbon Bow Assembly", "qty":500, "unit":"SET", "cost_price":110.0, "cost_currency":"JPY", "internal_rate":145, "markup_rate":"2.0", "sales_price":220.0, "sales_currency":"JPY", "link_id":"PRC-9999", "order_date":"2026-04-04", "comments":"[SYS] 材料費 50000円 + 加工賃 5000円"},
  {"status":"材料充当", "rep":"松岡", "customer":"Fast Retailing", "supplier":"TapeCo", "category":"PUテープ", "item_code":"TAP-123", "item_name":"Binding Tape", "qty":8000, "unit":"MTR", "cost_price":5.0, "cost_currency":"JPY", "internal_rate":145, "markup_rate":"1.5", "sales_price":7.5, "sales_currency":"JPY"},
  {"status":"見積中", "rep":"大谷", "customer":"Toyota Tsusho", "supplier":"Shinyei", "category":"リボン", "item_code":"R-01", "item_name":"Grosgrain Ribbon 10mm", "qty":3000, "unit":"MTR", "cost_price":25.0, "cost_currency":"JPY", "internal_rate":145, "markup_rate":"1.5", "sales_price":37.5, "sales_currency":"JPY"},
  {"status":"発注待", "rep":"松岡", "customer":"Zara", "supplier":"YKK", "category":"パーツ", "item_code":"Z-5C", "item_name":"Coil Zipper 20cm", "qty":15000, "unit":"PCS", "cost_price":45.0, "cost_currency":"JPY", "internal_rate":145, "markup_rate":"1.3", "sales_price":58.5, "sales_currency":"JPY"},
  {"status":"先行発注", "rep":"大谷", "customer":"Sun Fashion America", "supplier":"Shinyei", "category":"レース", "item_code":"LCE-88", "item_name":"Nylon Lace", "qty":2500, "unit":"YRD", "cost_price":2.5, "cost_currency":"USD", "internal_rate":145, "markup_rate":"現法自動", "sales_price":3.5, "sales_currency":"USD"}
]'

Invoke-RestMethod -Uri $url -Method Post -Headers $headers -Body $data
Write-Host "Done."
