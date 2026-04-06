import pandas as pd
import os

folder = r"C:\Users\higashi\Box\東\039. 販売管理システム(試作)"
files = {
    "kokunai": (os.path.join(folder, "【国内】2026年5月期(第51期) 営業数字 進捗管理資料.xlsm"), ["売上集計", "粗利集計", "国内", "輸出"]),
    "boueki": (os.path.join(folder, "【貿易】2026年5月期(第51期) 営業数字 進捗管理資料.xlsm"), ["売上集計", "粗利集計", "東", "直貿"]),
    "sougou": (os.path.join(folder, "【総合】2026年5月期(第51期) 営業数字 進捗管理資料R3(2026.02)R1.xlsm"), ["売上集計", "粗利集計", "東", "国内"])
}

with open("analysis_output2.txt", "w", encoding="utf-8") as f:
    for name, (path, target_sheets) in files.items():
        f.write(f"\n========== {name} ==========\n")
        try:
            xl = pd.ExcelFile(path, engine='openpyxl')
            
            for sheet in target_sheets:
                if sheet in xl.sheet_names:
                    f.write(f"\n--- Sheet: {sheet} ---\n")
                    df = xl.parse(sheet, nrows=5)
                    f.write(f"Columns: {list(df.columns)}\n")
                    for i, row in df.iterrows():
                        f.write(f"  Row {i}: {list(row.values)}\n")
                else:
                    f.write(f"\n--- Sheet: {sheet} (NOT FOUND) ---\n")
        except Exception as e:
            f.write(f"Error: {repr(e)}\n")
