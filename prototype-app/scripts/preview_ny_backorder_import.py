"""Convert the NY BackOrder workbook into a SUCCESS import preview.

The script intentionally defaults to preview-only output. Use --insert to write
to Supabase, --verify-batch-id to count an inserted batch, and
--rollback-batch-id to delete only one inserted batch.

Usage:
  python scripts/preview_ny_backorder_import.py "../サンプル/千葉 NY-Backorder  - 20221227～.xlsm"
  python scripts/preview_ny_backorder_import.py "../サンプル/千葉 NY-Backorder  - 20221227～.xlsm" --insert
  python scripts/preview_ny_backorder_import.py --verify-batch-id NYBO-YYYYMMDDHHMMSS
  python scripts/preview_ny_backorder_import.py --rollback-batch-id NYBO-YYYYMMDDHHMMSS
"""

from __future__ import annotations

import argparse
import json
import math
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from collections import Counter, defaultdict
from datetime import date, datetime
from pathlib import Path
from typing import Any

from openpyxl import load_workbook


SOURCE_SHEET = "NY BackOrder"
DATA_START_ROW = 8
LAST_SOURCE_COLUMN = 23  # W
DEFAULT_SCAN_MAX_ROW = 6000
DEFAULT_RATE = 120.0
DEFAULT_INSERT_BATCH_SIZE = 300
IMPORT_LOG_PREFIX = "Imported from NY BackOrder legacy ledger."

CATEGORY_RULES: dict[str, dict[str, Any]] = {
    "a": {"name": "Trim", "osaka_rate": 0.70, "end_user_rate": 0.60},
    "b": {"name": "Fabric", "osaka_rate": 0.88, "end_user_rate": 0.80},
    "c": {"name": "Lace <=699 JPY/m", "osaka_rate": 0.70, "end_user_rate": 0.60},
    "d": {"name": "Lace >=700 JPY/m", "osaka_rate": 0.88, "end_user_rate": 0.80},
    "e": {"name": "Other", "osaka_rate": 0.88, "end_user_rate": 0.80},
}

FEE_PATTERNS = (
    "handling",
    "freight",
    "charge",
    "insurance",
    "cutting",
    "fee",
    "fedex",
    "dhl",
    "ups",
    "air",
    "courier",
    "dye",
    "set-up",
    "setup",
)


def normalize_text(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, float):
        if math.isnan(value):
            return ""
        if value.is_integer():
            return str(int(value))
        return f"{value:.6f}".rstrip("0").rstrip(".")
    if isinstance(value, int):
        return str(value)
    if isinstance(value, datetime):
        return value.date().isoformat()
    if isinstance(value, date):
        return value.isoformat()
    return re.sub(r"\s+", " ", str(value).strip())


def normalize_number(value: Any) -> float | None:
    if value is None or value == "":
        return None
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        if isinstance(value, float) and math.isnan(value):
            return None
        return float(value)
    text = normalize_text(value).replace(",", "")
    if not text or text in {"-", "??", "#VALUE!"}:
        return None
    try:
        return float(text)
    except ValueError:
        return None


def normalize_date(value: Any) -> str | None:
    if isinstance(value, datetime):
        return value.date().isoformat()
    if isinstance(value, date):
        return value.isoformat()
    text = normalize_text(value)
    if not text:
        return None
    for fmt in ("%Y/%m/%d", "%Y-%m-%d", "%m/%d/%Y", "%m/%d/%y"):
        try:
            return datetime.strptime(text, fmt).date().isoformat()
        except ValueError:
            pass
    return None


def compact_join(parts: list[str]) -> str:
    return " / ".join(part for part in parts if part)


def load_env(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    if not path.exists():
        return values
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip().strip('"').strip("'")
    return values


def resolve_supabase_config(app_dir: Path) -> tuple[str, str]:
    env = load_env(app_dir / ".env.local")
    env.update(load_env(app_dir / ".env.admin.local"))

    url = env.get("SUPABASE_URL") or env.get("VITE_SUPABASE_URL")
    project_id = env.get("SUPABASE_PROJECT_ID")
    if not url and project_id:
        url = f"https://{project_id}.supabase.co"

    key = (
        env.get("SUPABASE_SERVICE_ROLE_KEY")
        or env.get("SUPABASE_SECRET_KEY")
        or env.get("VITE_SUPABASE_ANON_KEY")
    )
    if not url or not key:
        raise RuntimeError(
            "Supabase URL/key not found. Set SUPABASE_PROJECT_ID and "
            "SUPABASE_SECRET_KEY in .env.admin.local."
        )
    return url.rstrip("/"), key


def cell_value(values: tuple[Any, ...], one_based_col: int) -> Any:
    if one_based_col <= 0 or one_based_col > len(values):
        return None
    return values[one_based_col - 1]


def row_values(values: tuple[Any, ...]) -> dict[str, Any]:
    return {
        "category_code": normalize_text(cell_value(values, 2)).lower(),
        "po": normalize_text(cell_value(values, 3)),
        "customer": normalize_text(cell_value(values, 4)),
        "article": normalize_text(cell_value(values, 5)),
        "size": normalize_text(cell_value(values, 6)),
        "color": normalize_text(cell_value(values, 7)),
        "put_up": normalize_text(cell_value(values, 8)),
        "roll_qty": normalize_number(cell_value(values, 9)),
        "qty": normalize_number(cell_value(values, 10)),
        "end_user_price": normalize_number(cell_value(values, 11)),
        "end_user_subtotal": normalize_number(cell_value(values, 12)),
        "origin": normalize_text(cell_value(values, 13)),
        "ready_ship_date": normalize_date(cell_value(values, 14)),
        "invoice_no": normalize_text(cell_value(values, 15)),
        "purchase_qty_or_note": normalize_text(cell_value(values, 16)),
        "sales_price": normalize_number(cell_value(values, 17)),
        "sales_subtotal": normalize_number(cell_value(values, 18)),
        "cost_price": normalize_number(cell_value(values, 19)),
        "cost_subtotal": normalize_number(cell_value(values, 20)),
        "memo": normalize_text(cell_value(values, 21)),
        "internal_rate": normalize_number(cell_value(values, 22)),
        "end_user_margin": normalize_number(cell_value(values, 23)),
        "raw_end_user_price": normalize_text(cell_value(values, 11)),
        "raw_end_user_subtotal": normalize_text(cell_value(values, 12)),
        "raw_sales_price": normalize_text(cell_value(values, 17)),
        "raw_sales_subtotal": normalize_text(cell_value(values, 18)),
        "raw_cost_price": normalize_text(cell_value(values, 19)),
        "raw_cost_subtotal": normalize_text(cell_value(values, 20)),
    }


def has_any_value(values: tuple[Any, ...]) -> bool:
    return any(normalize_text(value) for value in values[:LAST_SOURCE_COLUMN])


def is_title_row(row: dict[str, Any]) -> bool:
    raw_price = row["raw_end_user_price"].lower()
    return (
        not row["category_code"]
        and bool(row["po"])
        and bool(row["customer"])
        and bool(row["article"])
        and (
            raw_price.startswith("(per ")
            or not any(
                row[key] is not None
                for key in ("qty", "end_user_price", "sales_price", "cost_price", "cost_subtotal")
            )
        )
    )


def is_note_row(row: dict[str, Any]) -> bool:
    return bool(
        row["po"]
        and not row["customer"]
        and not row["article"]
        and not any(row[key] is not None for key in ("qty", "end_user_price", "sales_price", "cost_price"))
    )


def fee_description(row: dict[str, Any]) -> str:
    return compact_join([row["article"], row["color"], row["put_up"]])


def is_fee_row(row: dict[str, Any]) -> bool:
    if row["category_code"]:
        return False
    description = fee_description(row).lower()
    return bool(row["po"] and row["customer"] and any(term in description for term in FEE_PATTERNS))


def is_detail_row(row: dict[str, Any]) -> bool:
    if row["category_code"] in CATEGORY_RULES:
        return True
    if row["category_code"]:
        return False
    if not row["po"] or not row["customer"]:
        return False
    if is_title_row(row) or is_fee_row(row):
        return False
    has_description = bool(row["article"] or row["color"])
    has_amount = bool(row["qty"] is not None or row["sales_price"] is not None or row["cost_price"] is not None)
    return has_description and has_amount


def fee_code(description: str) -> str:
    key = description.lower()
    if "handling" in key:
        return "HANDLING_FEE"
    if "freight" in key:
        return "INTERNATIONAL_FREIGHT"
    if "insurance" in key:
        return "INSURANCE"
    if "cutting" in key:
        return "CUTTING_FEE"
    if "dye" in key:
        return "DYE_CHARGE"
    if "set-up" in key or "setup" in key:
        return "SETUP_CHARGE"
    return "ORDER_CHARGE"


def compute_expected_prices(row: dict[str, Any]) -> tuple[float | None, float | None]:
    category_code = row["category_code"]
    if category_code not in CATEGORY_RULES or row["cost_price"] is None:
        return None, None
    rate = row["internal_rate"] or DEFAULT_RATE
    rule = CATEGORY_RULES[category_code]
    osaka = math.ceil((row["cost_price"] / rate / rule["osaka_rate"]) * 100) / 100
    end_user = math.ceil((row["cost_price"] / rate / rule["end_user_rate"]) * 100) / 100
    return osaka, end_user


def make_success_row(row: dict[str, Any], row_index: int, title: dict[str, Any] | None, line_type: str) -> dict[str, Any]:
    category_code = row["category_code"]
    rule = CATEGORY_RULES.get(category_code)
    expected_osaka, expected_end_user = compute_expected_prices(row)

    description = fee_description(row) if line_type == "fee" else ""
    item_code = fee_code(description) if line_type == "fee" else (row["article"] or row["color"])
    item_name = description if line_type == "fee" else compact_join([title.get("article", "") if title else "", row["article"] or row["color"]])
    qty = row["qty"] if row["qty"] is not None else (1.0 if line_type == "fee" else None)
    sales_price = row["sales_price"] if row["sales_price"] is not None else row["end_user_price"]

    comments = [
        f"NY BackOrder Excel row {row_index}",
        f"legacy_line_type={line_type}",
    ]
    if title:
        comments.append(f"title_row={title['row_index']}: {title['article']}")
    if row["roll_qty"] is not None:
        comments.append(f"Roll Qty: {row['roll_qty']:g}")
    if row["put_up"]:
        comments.append(f"Put-up: {row['put_up']}")
    if row["purchase_qty_or_note"]:
        comments.append(f"Purchase qty/note: {row['purchase_qty_or_note']}")
    if row["memo"]:
        comments.append(f"Memo: {row['memo']}")
    if "??" in {
        row["raw_end_user_price"],
        row["raw_end_user_subtotal"],
        row["raw_sales_price"],
        row["raw_sales_subtotal"],
        row["raw_cost_price"],
        row["raw_cost_subtotal"],
    }:
        comments.append("金額未確定: legacy workbook contained ??")
    if expected_osaka is not None and row["sales_price"] is not None and abs(expected_osaka - row["sales_price"]) > 0.02:
        comments.append(f"Osaka->NY expected {expected_osaka:g}, actual {row['sales_price']:g}")
    if expected_end_user is not None and row["end_user_price"] is not None and abs(expected_end_user - row["end_user_price"]) > 0.02:
        comments.append(f"End User theoretical {expected_end_user:g}, actual {row['end_user_price']:g}")

    return {
        "status": "請求済" if row["invoice_no"] else "未請求",
        "quote_no": None,
        "order_date": None,
        "customer_po": row["po"],
        "rep": "千葉",
        "customer": "Sun Fashion America",
        "end_user": row["customer"],
        "supplier": "Sun Fashion Osaka",
        "category": rule["name"] if rule else ("Order charge" if line_type == "fee" else "Legacy NY"),
        "item_code": item_code,
        "supplier_item_code": item_code if line_type != "fee" else None,
        "item_size": row["size"],
        "item_color": row["color"] if line_type != "fee" else None,
        "item_name": item_name,
        "origin": row["origin"],
        "qty": qty,
        "unit": "m" if line_type != "fee" else "式",
        "package_qty": row["roll_qty"],
        "package_unit": "Roll" if row["roll_qty"] is not None else None,
        "cost_price": row["cost_price"],
        "cost_currency": "JPY",
        "markup_rate": "手動(現法)" if line_type == "fee" else ("NY BackOrder formula" if rule else "Legacy manual"),
        "sales_price": sales_price,
        "sales_currency": "USD",
        "end_user_price": row["end_user_price"],
        "end_user_currency": "USD",
        "misc_cost": 0,
        "misc_currency": "JPY",
        "exchange_rate": None,
        "internal_rate": row["internal_rate"] or DEFAULT_RATE,
        "factory_date": row["ready_ship_date"],
        "bl_date": None,
        "po_date": None,
        "order_no": row["po"],
        "invoice_date": row["ready_ship_date"] if row["invoice_no"] else None,
        "invoice_no": row["invoice_no"],
        "link_id": f"NYBO-{row['po']}" if row["po"] else None,
        "comments": " / ".join(comments),
        "system_log": "Preview import from NY BackOrder legacy ledger.",
        "locked": bool(row["invoice_no"]),
        "archived": False,
        "revision": 0,
        "_legacy": {
            "source_row": row_index,
            "line_type": line_type,
            "category_code": category_code,
            "expected_osaka_to_ny_price": expected_osaka,
            "expected_end_user_price": expected_end_user,
            "legacy_end_user_subtotal": row["end_user_subtotal"],
            "legacy_sales_subtotal": row["sales_subtotal"],
            "legacy_cost_subtotal": row["cost_subtotal"],
        },
    }


def read_ny_backorder_rows(xlsm_path: Path, scan_max_row: int = DEFAULT_SCAN_MAX_ROW) -> dict[str, Any]:
    wb = load_workbook(xlsm_path, data_only=True, read_only=True)
    if SOURCE_SHEET not in wb.sheetnames:
        raise RuntimeError(f"Sheet not found: {SOURCE_SHEET}")
    ws = wb[SOURCE_SHEET]

    rows: list[dict[str, Any]] = []
    titles: list[dict[str, Any]] = []
    unknown_rows: list[dict[str, Any]] = []
    current_title_by_block: dict[tuple[str, str], dict[str, Any]] = {}
    source_counts: Counter[str] = Counter()
    last_row = 0

    for offset, values in enumerate(
        ws.iter_rows(
            min_row=DATA_START_ROW,
            max_row=scan_max_row,
            min_col=1,
            max_col=LAST_SOURCE_COLUMN,
            values_only=True,
        ),
        start=DATA_START_ROW,
    ):
        row_index = offset
        if not has_any_value(values):
            source_counts["blank"] += 1
            continue
        last_row = row_index

        row = row_values(values)
        block_key = (row["po"], row["customer"])

        if is_note_row(row):
            source_counts["note"] += 1
            continue

        if is_title_row(row):
            title = {"row_index": row_index, "po": row["po"], "customer": row["customer"], "article": row["article"]}
            titles.append(title)
            current_title_by_block[block_key] = title
            source_counts["title"] += 1
            continue

        title = current_title_by_block.get(block_key)
        if is_fee_row(row):
            rows.append(make_success_row(row, row_index, title, "fee"))
            source_counts["fee"] += 1
        elif is_detail_row(row):
            rows.append(make_success_row(row, row_index, title, "detail"))
            source_counts["detail"] += 1
        else:
            source_counts["unknown"] += 1
            unknown_rows.append({"row_index": row_index, **row})

    by_block: dict[str, Counter[str]] = defaultdict(Counter)
    for row in rows:
        by_block[row["link_id"] or ""][(row["_legacy"]["line_type"])] += 1

    detail_rows = [row for row in rows if row["_legacy"]["line_type"] == "detail"]
    fee_rows = [row for row in rows if row["_legacy"]["line_type"] == "fee"]
    osaka_checked = [
        row
        for row in detail_rows
        if row["_legacy"]["expected_osaka_to_ny_price"] is not None and row["sales_price"] is not None
    ]
    osaka_mismatches = [
        row
        for row in osaka_checked
        if abs(row["_legacy"]["expected_osaka_to_ny_price"] - row["sales_price"]) > 0.02
    ]
    end_user_checked = [
        row
        for row in detail_rows
        if row["_legacy"]["expected_end_user_price"] is not None and row["end_user_price"] is not None
    ]
    end_user_different = [
        row
        for row in end_user_checked
        if abs(row["_legacy"]["expected_end_user_price"] - row["end_user_price"]) > 0.02
    ]

    sample_block = [row for row in rows if row["order_no"] == "4012 (4/24/26)"]
    summary = {
        "source_file": str(xlsm_path),
        "sheet": SOURCE_SHEET,
        "last_scanned_row": last_row,
        "source_row_counts": dict(source_counts),
        "converted_rows": len(rows),
        "detail_rows": len(detail_rows),
        "fee_rows": len(fee_rows),
        "title_rows_excluded": len(titles),
        "unknown_rows": len(unknown_rows),
        "blocks": len([key for key in by_block if key]),
        "category_code_counts": dict(Counter(row["_legacy"]["category_code"] or "(blank)" for row in rows)),
        "invoice_rows": sum(1 for row in rows if row["invoice_no"]),
        "amount_pending_rows": sum("金額未確定" in row["comments"] for row in rows),
        "osaka_formula_checked": len(osaka_checked),
        "osaka_formula_mismatches": len(osaka_mismatches),
        "end_user_formula_checked": len(end_user_checked),
        "end_user_manual_differences": len(end_user_different),
        "sample_block_4012": sample_block,
        "unknown_samples": unknown_rows[:20],
    }
    return {"summary": summary, "rows": rows}


def make_batch_id() -> str:
    return "NYBO-" + datetime.now().strftime("%Y%m%d%H%M%S")


def rows_for_insert(rows: list[dict[str, Any]], batch_id: str) -> list[dict[str, Any]]:
    insert_rows: list[dict[str, Any]] = []
    for row in rows:
        clean = {key: value for key, value in row.items() if not key.startswith("_")}
        clean["system_log"] = f"{IMPORT_LOG_PREFIX} import_batch_id={batch_id}."
        clean["comments"] = compact_join(
            [
                clean.get("comments", ""),
                f"source_ledger=NY BackOrder",
                f"import_batch_id={batch_id}",
            ]
        )
        insert_rows.append(clean)
    return insert_rows


def supabase_request(
    base_url: str,
    key: str,
    method: str,
    path: str,
    payload: Any | None = None,
    prefer: str | None = None,
    extra_headers: dict[str, str] | None = None,
) -> Any:
    data = None if payload is None else json.dumps(payload).encode("utf-8")
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }
    if prefer:
        headers["Prefer"] = prefer
    if extra_headers:
        headers.update(extra_headers)

    req = urllib.request.Request(
        f"{base_url}/rest/v1/{path}",
        data=data,
        headers=headers,
        method=method,
    )
    try:
        with urllib.request.urlopen(req, timeout=90) as response:
            body = response.read().decode("utf-8")
            return json.loads(body) if body else None
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Supabase {method} {path} failed: {exc.code} {body}") from exc


def has_existing_ny_backorder_rows(base_url: str, key: str) -> bool:
    existing = supabase_request(
        base_url,
        key,
        "GET",
        "order_items?select=id&link_id=like.NYBO-*&limit=1",
    )
    return bool(existing)


def insert_to_supabase(base_url: str, key: str, rows: list[dict[str, Any]]) -> None:
    for start in range(0, len(rows), DEFAULT_INSERT_BATCH_SIZE):
        batch = rows[start : start + DEFAULT_INSERT_BATCH_SIZE]
        supabase_request(
            base_url,
            key,
            "POST",
            "order_items",
            batch,
            prefer="return=minimal",
        )


def batch_filter_path(batch_id: str, select: str | None = None, limit: int | None = None) -> str:
    pattern = urllib.parse.quote(f"*import_batch_id={batch_id}*", safe="*=._-")
    if select is None:
        return f"order_items?system_log=like.{pattern}"
    path = f"order_items?select={urllib.parse.quote(select)}&system_log=like.{pattern}"
    if limit is not None:
        path += f"&limit={limit}"
    return path


def count_batch_rows(base_url: str, key: str, batch_id: str) -> int:
    total = 0
    page_size = 1000
    while True:
        rows = supabase_request(
            base_url,
            key,
            "GET",
            batch_filter_path(batch_id, select="id"),
            extra_headers={"Range": f"{total}-{total + page_size - 1}"},
        )
        count = len(rows or [])
        total += count
        if count < page_size:
            return total


def rollback_batch(base_url: str, key: str, batch_id: str) -> int:
    before = count_batch_rows(base_url, key, batch_id)
    if before == 0:
        return 0
    supabase_request(
        base_url,
        key,
        "DELETE",
        batch_filter_path(batch_id),
        prefer="return=minimal",
    )
    after = count_batch_rows(base_url, key, batch_id)
    if after:
        raise RuntimeError(f"Rollback incomplete for {batch_id}: {after} rows remain.")
    return before


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("xlsm_path", type=Path, nargs="?")
    parser.add_argument(
        "--preview-json",
        type=Path,
        default=Path("ny_backorder_import_preview.json"),
        help="Path for the JSON preview.",
    )
    parser.add_argument(
        "--scan-max-row",
        type=int,
        default=DEFAULT_SCAN_MAX_ROW,
        help="Maximum worksheet row to scan. The current NY source has data through row 5329.",
    )
    parser.add_argument("--insert", action="store_true", help="Insert converted rows into Supabase.")
    parser.add_argument(
        "--allow-duplicates",
        action="store_true",
        help="Allow inserting even if NYBO rows already exist in order_items.",
    )
    parser.add_argument(
        "--batch-id",
        default=None,
        help="Import batch id to stamp into system_log/comments. Defaults to NYBO-YYYYMMDDHHMMSS.",
    )
    parser.add_argument(
        "--rollback-batch-id",
        default=None,
        help="Delete only rows imported with this NY BackOrder batch id, then exit.",
    )
    parser.add_argument(
        "--verify-batch-id",
        default=None,
        help="Count rows imported with this NY BackOrder batch id, then exit.",
    )
    args = parser.parse_args()

    app_dir = Path(__file__).resolve().parents[1]
    if args.verify_batch_id:
        base_url, key = resolve_supabase_config(app_dir)
        rows = count_batch_rows(base_url, key, args.verify_batch_id)
        print(json.dumps({"verify_batch_id": args.verify_batch_id, "rows": rows}, ensure_ascii=False, indent=2))
        return 0

    if args.rollback_batch_id:
        base_url, key = resolve_supabase_config(app_dir)
        deleted = rollback_batch(base_url, key, args.rollback_batch_id)
        print(json.dumps({"rollback_batch_id": args.rollback_batch_id, "deleted_rows": deleted}, ensure_ascii=False, indent=2))
        return 0

    if not args.xlsm_path:
        raise RuntimeError("xlsm_path is required unless --rollback-batch-id is used.")

    xlsm_path = args.xlsm_path
    if not xlsm_path.is_absolute():
        xlsm_path = (Path.cwd() / xlsm_path).resolve()
    result = read_ny_backorder_rows(xlsm_path, scan_max_row=args.scan_max_row)

    preview_path = args.preview_json
    if not preview_path.is_absolute():
        preview_path = app_dir / preview_path
    preview_path.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")

    print(json.dumps(result["summary"], ensure_ascii=False, indent=2))
    print(f"Preview written to {preview_path}")

    if not args.insert:
        print("Dry run only. No Supabase changes were made.")
        return 0

    base_url, key = resolve_supabase_config(app_dir)
    if not args.allow_duplicates and has_existing_ny_backorder_rows(base_url, key):
        raise RuntimeError(
            "Existing NYBO rows were found in Supabase. "
            "Rollback the earlier batch or re-run with --allow-duplicates if duplicate import is intentional."
        )

    batch_id = args.batch_id or make_batch_id()
    db_rows = rows_for_insert(result["rows"], batch_id)
    insert_to_supabase(base_url, key, db_rows)
    inserted = count_batch_rows(base_url, key, batch_id)
    print(json.dumps({"import_batch_id": batch_id, "inserted_rows": inserted}, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
