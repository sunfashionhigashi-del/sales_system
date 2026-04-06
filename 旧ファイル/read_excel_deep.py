import pandas as pd
import glob
import os

folder = r"C:\Users\higashi\Box\東\039. 販売管理システム(試作)"
files = {
    "kokunai": os.path.join(folder, "【国内】2026年5月期(第51期) 営業数字 進捗管理資料.xlsm"),
    "boueki": os.path.join(folder, "【貿易】2026年5月期(第51期) 営業数字 進捗管理資料.xlsm"),
    "sougou": os.path.join(folder, "【総合】2026年5月期(第51期) 営業数字 進捗管理資料R3(2026.02)R1.xlsm")
}

def analyze_file(name, path):
    print(f"========== {name} ==========")
    try:
        xl = pd.ExcelFile(path, engine='openpyxl')
        sheets = xl.sheet_names
        print(f"Sheets ({len(sheets)}): {sheets}")
        
        # Analyze first few sheets
        for sheet in sheets:
            # Skip likely pure-config/macro or inactive sheets
            if sheet in ["Macro", "設定", "Sheet1", "Sheet2", "BS", "第50期の決算概算", "決算報告用"]: continue
            if "INV" in sheet: continue # invoices? Maybe skip for structure overview
            
            print(f"\n--- Sheet: {sheet} ---")
            df = xl.parse(sheet, nrows=10)
            
            # Print non-null counts per column to guess the header row
            if len(df) > 0:
                print(f"Shape: {df.shape}")
                # Print first 5 rows to see structure
                for i, row in df.iterrows():
                    # only print columns that have some data
                    vals = {k: v for k, v in row.items() if pd.notna(v) and v != ""}
                    if vals:
                        print(f"  Row {i}:", vals)
            
            if sheet == '粗利': # break early after looking at a few sheets to save output size
                break
    except Exception as e:
        print("Error:", repr(e))
    print("\n")

for name, path in files.items():
    analyze_file(name, path)
