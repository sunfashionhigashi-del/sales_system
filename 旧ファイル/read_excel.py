import pandas as pd
import glob
import os

folder = r"C:\Users\higashi\Box\東\039. 販売管理システム(試作)"
files = glob.glob(os.path.join(folder, "*.xlsm"))

for f in files:
    print(f"=== {os.path.basename(f)} ===")
    try:
        xl = pd.ExcelFile(f, engine='openpyxl')
        print("Sheets:", xl.sheet_names)
        for sheet in xl.sheet_names:
            if "設定" in sheet or "マスタ" in sheet: continue # Skip config sheets
            df = xl.parse(sheet, nrows=5)
            # Find the actual header row (sometimes row 0 or 1 is a title)
            # Just print the first few rows to see what it looks like
            print(f"  Sheet: {sheet}")
            for i, row in df.iterrows():
                print(f"    Row {i+1}:", list(row.values))
            break # Just analyze the first main data sheet
    except Exception as e:
        print("Error:", repr(e))
    print("\n")
