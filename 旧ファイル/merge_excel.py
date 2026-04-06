import pandas as pd
import os
import datetime

folder = r"C:\Users\higashi\Box\東\039. 販売管理システム(試作)"
files = {
    "国内": os.path.join(folder, "【国内】2026年5月期(第51期) 営業数字 進捗管理資料.xlsm"),
    "貿易": os.path.join(folder, "【貿易】2026年5月期(第51期) 営業数字 進捗管理資料.xlsm")
}

all_jisseki = []
all_getsuji = []

def format_columns(cols):
    new_cols = []
    for c in cols:
        if isinstance(c, datetime.datetime):
            new_cols.append(c.strftime("%Y-%m"))
        else:
            new_cols.append(str(c) if pd.notna(c) else f"Unnamed_{len(new_cols)}")
    return new_cols

for source_name, path in files.items():
    print(f"Processing {source_name}...")
    xl = pd.ExcelFile(path, engine='openpyxl')
    
    # Process 実績集計 (Actuals Aggregation)
    if "実績集計" in xl.sheet_names:
        df = xl.parse("実績集計", header=None)
        # Find header row
        header_idx_list = df[df.apply(lambda r: "部署" in r.values, axis=1)].index
        if len(header_idx_list) > 0:
            header_idx = header_idx_list[0]
            cols = format_columns(df.iloc[header_idx])
            df.columns = cols
            df = df.iloc[header_idx+1:].reset_index(drop=True)
            
            # Keep only columns before any Unnamed garbage
            valid_cols = [c for c in df.columns if "Unnamed" not in c and c != "売上"]
            df = df[valid_cols].copy()
            
            # Forward fill merged cells
            ffill_cols = ["部署", "担当"]
            for c in ffill_cols:
                if c in df.columns:
                    df[c] = df[c].ffill()
            
            # Filter rows where '商品' is present and not an aggregation row
            if "商品" in df.columns:
                df = df[df["商品"].notna() & (df["商品"] != "合計") & (df["商品"] != "総合計")]
            
            df.insert(0, "区分", source_name)
            all_jisseki.append(df)

    # Process 月次進捗 (Monthly Progress)
    if "月次進捗" in xl.sheet_names:
        df = xl.parse("月次進捗", header=None)
        # Find header row
        header_idx_list = df[df.apply(lambda r: "項目" in r.values, axis=1)].index
        if len(header_idx_list) > 0:
            header_idx = header_idx_list[0]
            cols = format_columns(df.iloc[header_idx])
            df.columns = cols
            df = df.iloc[header_idx+1:].reset_index(drop=True)
            
            valid_cols = [c for c in df.columns if "Unnamed" not in c and c != "売上"]
            df = df[valid_cols].copy()
            
            ffill_cols = ["部署", "担当"]
            for c in ffill_cols:
                if c in df.columns:
                    df[c] = df[c].ffill()
            
            if "項目" in df.columns:
                df = df[df["項目"].notna() & (df["項目"] != "合計")]
                
            df.insert(0, "区分", source_name)
            all_getsuji.append(df)

# Output
out_path = os.path.join(folder, "総合管理資料_AI自動生成版.xlsx")
with pd.ExcelWriter(out_path, engine='openpyxl') as writer:
    if all_jisseki:
        merged_jisseki = pd.concat(all_jisseki, ignore_index=True)
        merged_jisseki.to_excel(writer, sheet_name="実績明細_統合DB", index=False)
        print(f"実績明細_統合DB: {len(merged_jisseki)} rows")
        
    if all_getsuji:
        merged_getsuji = pd.concat(all_getsuji, ignore_index=True)
        merged_getsuji.to_excel(writer, sheet_name="月次進捗_統合DB", index=False)
        print(f"月次進捗_統合DB: {len(merged_getsuji)} rows")
        
print("Successfully created AI generated unified Excel.")
