import pandas as pd
import json
import os

folder = r"C:\Users\higashi\Box\東\039. 販売管理システム(試作)"
files = {
    "kokunai": os.path.join(folder, "【国内】2026年5月期(第51期) 営業数字 進捗管理資料.xlsm"),
    "boueki": os.path.join(folder, "【貿易】2026年5月期(第51期) 営業数字 進捗管理資料.xlsm"),
    "sougou": os.path.join(folder, "【総合】2026年5月期(第51期) 営業数字 進捗管理資料R3(2026.02)R1.xlsm")
}

result = {}

for name, path in files.items():
    try:
        xl = pd.ExcelFile(path, engine='openpyxl')
        result[name] = xl.sheet_names
    except Exception as e:
        result[name] = str(e)

with open(r"C:\Users\higashi\Box\東\039. 販売管理システム(試作)\sheets.json", "w", encoding="utf-8") as f:
    json.dump(result, f, ensure_ascii=False, indent=2)
