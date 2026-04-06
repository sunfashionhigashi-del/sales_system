import pandas as pd
import glob
import os

folder = r"C:\Users\higashi\Box\東\039. 販売管理システム(試作)"
files = {
    "kokunai": os.path.join(folder, "【国内】2026年5月期(第51期) 営業数字 進捗管理資料.xlsm"),
    "boueki": os.path.join(folder, "【貿易】2026年5月期(第51期) 営業数字 進捗管理資料.xlsm"),
    "sougou": os.path.join(folder, "【総合】2026年5月期(第51期) 営業数字 進捗管理資料R3(2026.02)R1.xlsm")
}

with open("analysis_output.txt", "w", encoding="utf-8") as f:
    for name, path in files.items():
        f.write(f"\n========== {name} ==========\n")
        try:
            xl = pd.ExcelFile(path, engine='openpyxl')
            
            for sheet in ["売上", "粗利"]:
                if sheet in xl.sheet_names:
                    f.write(f"\n--- Sheet: {sheet} ---\n")
                    df = xl.parse(sheet, nrows=5)
                    f.write(f"Columns: {list(df.columns)}\n")
                    for i, row in df.iterrows():
                        f.write(f"  Row {i}: {list(row.values)}\n")
        except Exception as e:
            f.write(f"Error: {repr(e)}\n")
