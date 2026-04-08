import pandas as pd
import json
import uuid
import math

file_path = r"c:\Users\higashi\Projects\039_sales_system\サンプル\【こちら利用】 GCGA new back order★ - 20260203～斎藤使用開始(20240925差替).xlsm"
out_path = r"c:\Users\higashi\Projects\039_sales_system\prototype-app\src\gcga_data.json"

try:
    df_order = pd.read_excel(file_path, sheet_name="ORDER_LIST", engine='openpyxl', header=2)
    # Drop empty ID rows
    df_order = df_order.dropna(subset=['ID No.'])

    # Helper for nan
    def clean_val(v):
        if pd.isna(v): return ""
        return str(v).strip()

    def clean_num(v):
        if pd.isna(v): return 0
        try:
            return float(v)
        except:
            return 0

    records = []
    for idx, row in df_order.iterrows():
        invoice_no = clean_val(row.get('Invoice No.'))
        status = "発注待"
        if invoice_no:
            status = "出荷済" # assume shipped if it has invoice or date
            
        po_number = clean_val(row.get('客先Order\nNumber'))
        order_number = clean_val(row.get('当社\n発注番号'))
        art_no = clean_val(row.get('Art. No.'))
        width = clean_val(row.get('Width'))
        color = clean_val(row.get('Color#\n(INVOICEや発注に反映)'))
        
        item_code = art_no
        if width: item_code += f" {width}"
        if color: item_code += f" {color}"

        supplier_code = clean_val(row.get('仕入先品番'))
        qty = clean_num(row.get('販売\n(数量)'))
        sales_price = clean_num(row.get('販売単価'))
        cost_price = clean_num(row.get('仕入単価'))

        # Construct App data format
        record = {
            "id": str(uuid.uuid4()),
            "status": status,
            "ship_date": "",
            "bl_date": invoice_no if "/" in invoice_no else "", # roughly map date looking strings
            "invoice_no": invoice_no,
            "order_number": order_number,
            "po_number": po_number,
            "customer": "GCGA",
            "supplier": "SHINDO", # default
            "category": "Apparel",
            "item_code": item_code,
            "supplier_item_code": supplier_code,
            "qty": qty,
            "sales_currency": "JPY",
            "sales_price": sales_price,
            "cost_currency": "JPY", # The user said cost is in JPY
            "cost_price": cost_price,
            "end_user_currency": "JPY",
            "end_user_price": sales_price,
            "misc_cost": 0,
            "exchange_rate": 1.0,
            "markup_rate": "1.3",
            "memo": "Imported from Excel"
        }
        records.append(record)

    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(records, f, ensure_ascii=False, indent=2)

    print(f"Successfully exported {len(records)} records to {out_path}")

except Exception as e:
    import traceback
    print("Error:", e)
    traceback.print_exc()
