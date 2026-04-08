import pandas as pd
import json
import uuid
import re

file_path = r"c:\Users\higashi\Projects\039_sales_system\サンプル\【こちら利用】 GCGA new back order★ - 20260203～斎藤使用開始(20240925差替).xlsm"
out_path = r"c:\Users\higashi\Projects\039_sales_system\prototype-app\src\gcga_data.json"

try:
    print("Reading Excel...")
    
    # 利益集計シートから出荷日情報を取得
    try:
        df_profit = pd.read_excel(file_path, sheet_name="利益集計", engine='openpyxl')
        invoice_date_map = {}
        for idx, row in df_profit.iterrows():
            inv = str(row.iloc[0]).strip()
            date_val = str(row.iloc[1]).strip()
            if inv and inv != 'nan' and inv != 'None':
                invoice_date_map[inv] = date_val
    except Exception as e:
        invoice_date_map = {}

    # 製品マスターから「仕立て (m/roll等)」を取得。キーは VLOOKUP用コード (A列)
    try:
        df_prod = pd.read_excel(file_path, sheet_name="製品マスター", engine='openpyxl', header=1)
        prod_map = {}
        for idx, row in df_prod.iterrows():
            code = str(row.iloc[0]).strip()
            shitate_num = str(row.iloc[1]).strip()
            shitate_unit = str(row.iloc[2]).strip()
            if shitate_num != 'nan':
                unit_str = shitate_unit if shitate_unit != 'nan' else ''
                prod_map[code] = f"{shitate_num}{unit_str}"
    except Exception as e:
        prod_map = {}

    df_order = pd.read_excel(file_path, sheet_name="ORDER_LIST", engine='openpyxl', header=2)
    df_order = df_order.dropna(subset=['ID No.'])

    def clean_val(v):
        if pd.isna(v): return ""
        return str(v).strip()

    def clean_num(v):
        if pd.isna(v): return 0
        try: return float(v)
        except: return 0

    records = []
    for idx, row in df_order.iterrows():
        invoice_no = clean_val(row.get('Invoice No.'))
        order_number = clean_val(row.get('当社\n発注番号'))
        po_number = clean_val(row.get('客先Order\nNumber'))
        vlook_id = clean_val(row.get('VLOOK用 ID'))
        
        status = "発注待"
        
        # 判定ロジック
        is_shipped_invoice = bool(re.match(r'^\d{4}$', invoice_no))
        
        if is_shipped_invoice:
            status = "出荷済"
        elif invoice_no and not is_shipped_invoice:
            status = "発注済"
        elif order_number:
            status = "発注済"
            
        ship_date = ""
        if status == "出荷済" and invoice_no in invoice_date_map:
            ship_date = invoice_date_map[invoice_no]
            
        art_no = clean_val(row.get('Art. No.'))
        mix_rate = clean_val(row.get('混率')) # 品名仕様
        
        supplier_code = clean_val(row.get('仕入先品番'))
        qty = clean_num(row.get('販売\n(数量)'))
        unit = clean_val(row.get('販売\n(単位)'))
        sales_price = clean_num(row.get('販売単価'))
        cost_price = clean_num(row.get('仕入単価'))
        
        meter_per_roll = prod_map.get(vlook_id, "")

        record = {
            "id": str(uuid.uuid4()),
            "status": status,
            "rep": "斉藤", 
            "ship_date": ship_date,
            "bl_date": ship_date,
            "invoice_no": invoice_no if is_shipped_invoice else "",
            "order_number": order_number,
            "po_number": po_number,
            "customer": "GCGA",
            "end_user": "GCGA",
            "supplier": "SHINDO",
            "category": "-",
            "item_code": art_no,
            "item_name": mix_rate,
            "composition": mix_rate,
            "supplier_item_code": supplier_code,
            "qty": qty,
            "unit": unit,
            "meter_per_roll": meter_per_roll,
            "sales_currency": "JPY",
            "sales_price": sales_price,
            "cost_currency": "JPY",
            "cost_price": cost_price,
            "end_user_currency": "JPY",
            "end_user_price": sales_price,
            "misc_cost": 0,
            "exchange_rate": 1.0,
            "markup_rate": "1.3",
            "memo": "Imported from Excel - Invoice: " + invoice_no
        }
        records.append(record)

    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(records, f, ensure_ascii=False, indent=2)

    print(f"Successfully exported {len(records)} records to {out_path}")

except Exception as e:
    import traceback
    print("Error:", e)
    traceback.print_exc()
