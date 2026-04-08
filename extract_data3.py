import pandas as pd
import json

file_path = r"c:\Users\higashi\Projects\039_sales_system\サンプル\【こちら利用】 GCGA new back order★ - 20260203～斎藤使用開始(20240925差替).xlsm"
out_path = r"c:\Users\higashi\Projects\039_sales_system\extract_sample.txt"

try:
    df_prod = pd.read_excel(file_path, sheet_name="製品マスター", engine='openpyxl', header=1)
    df_order = pd.read_excel(file_path, sheet_name="ORDER_LIST", engine='openpyxl', header=2)

    with open(out_path, "w", encoding="utf-8") as f:
        f.write("Product Columns:\n")
        f.write(str(df_prod.columns.tolist()[:20]) + "\n\n")
        f.write("Order Columns:\n")
        f.write(str(df_order.columns.tolist()[:30]) + "\n\n")
        
        f.write("Product Sample:\n")
        for row in df_prod.head(3).to_dict('records'):
            f.write(str({k: row[k] for (i, k) in enumerate(row) if i < 15 and pd.notna(row[k])}) + "\n")
            
        f.write("\nOrder Sample:\n")
        for row in df_order.dropna(subset=[df_order.columns[0]]).head(5).to_dict('records'):
            f.write(str({k: row[k] for (i, k) in enumerate(row) if i < 20 and pd.notna(row[k])}) + "\n")

    print("Wrote to " + out_path)

except Exception as e:
    print("Error:", e)
