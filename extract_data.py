import pandas as pd
import json

file_path = r"c:\Users\higashi\Projects\039_sales_system\サンプル\【こちら利用】 GCGA new back order★ - 20260203～斎藤使用開始(20240925差替).xlsm"

try:
    print("Reading Excel...")
    df_prod = pd.read_excel(file_path, sheet_name="製品マスター", engine='openpyxl')
    df_order = pd.read_excel(file_path, sheet_name="ORDER_LIST", engine='openpyxl')
    print("Loaded sheets. Columns:")
    print("Product:", df_prod.columns.tolist()[:15])
    print("Order:", df_order.columns.tolist()[:15])

    print("\nProd Sample:")
    for row in df_prod.head(2).to_dict('records'):
        print(row)
        
    print("\nOrder Sample:")
    for row in df_order.head(2).to_dict('records'):
        print(row)

except Exception as e:
    print("Error:", e)
