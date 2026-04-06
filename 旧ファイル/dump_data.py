import pandas as pd
import json
import os
import datetime

folder = r"C:\Users\higashi\Box\東\039. 販売管理システム(試作)"
files = {
    "kokunai": os.path.join(folder, "【国内】2026年5月期(第51期) 営業数字 進捗管理資料.xlsm"),
    "boueki": os.path.join(folder, "【貿易】2026年5月期(第51期) 営業数字 進捗管理資料.xlsm"),
    "sougou": os.path.join(folder, "【総合】2026年5月期(第51期) 営業数字 進捗管理資料R3(2026.02)R1.xlsm")
}

def clean_value(v):
    if pd.isna(v): return None
    if isinstance(v, (pd.Timestamp, datetime.datetime, datetime.date)): return v.strftime("%Y-%m-%d")
    return str(v) # Convert to string to avoid JSON issues

data_dump = {}

for name, path in files.items():
    data_dump[name] = {}
    try:
        xl = pd.ExcelFile(path, engine='openpyxl')
        for sheet in ["実績集計", "松岡", "月次進捗"]:
            if sheet in xl.sheet_names:
                df = xl.parse(sheet, nrows=10, header=None) # No header assumption to see raw rows
                rows = []
                for _, row in df.iterrows():
                    rows.append({f"col_{i}": clean_value(val) for i, val in enumerate(row) if clean_value(val) is not None})
                data_dump[name][sheet] = rows
    except Exception as e:
        data_dump[name] = str(e)

with open(r"C:\Users\higashi\Box\東\039. 販売管理システム(試作)\data_dump.json", "w", encoding="utf-8") as f:
    json.dump(data_dump, f, ensure_ascii=False, indent=2)
