"""Prepare or import Mobiron order ledger rows from the legacy Excel book.

Default behavior is a dry run that prints a conversion summary and writes a
JSON preview. Use --insert only after reviewing the preview.

Usage:
  python scripts/import_mobilon_ledger.py "../サンプル/モビロン管理台帳(Sales Note台帳含む).xls"
  python scripts/import_mobilon_ledger.py "../サンプル/モビロン管理台帳(Sales Note台帳含む).xls" --insert
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import urllib.error
import urllib.request
from collections import Counter
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any

import xlrd


MOBILON_SOURCE_SHEET = "管理表"
DEFAULT_SUPPLIER = "日清紡"
YAGIKUMA_SUPPLIER = "八木熊"
RECENT_EXW_ACTIVE_FROM = date(2026, 1, 1)
YAGIKUMA_CUSTOMER_KEYWORDS = (
    "min yuen",
    "sf hong kong",
    "sf hk",
    "sf-hk",
    "helby",
    "danesi",
    "r.m.x",
    "rmx",
)


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


def normalize_text(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, float) and value.is_integer():
        return str(int(value))
    if isinstance(value, float):
        return f"{value:.4f}".rstrip("0").rstrip(".")
    return str(value).strip()


def normalize_number(value: Any) -> float | None:
    if value in ("", None):
        return None
    if isinstance(value, (int, float)):
        return float(value)
    text = str(value).strip().replace(",", "")
    if not text or text == "-":
        return None
    try:
        return float(text)
    except ValueError:
        return None


def as_date(book: xlrd.book.Book, value: Any, cell_type: int) -> date | None:
    if value in ("", None):
        return None
    if cell_type == xlrd.XL_CELL_DATE:
        return xlrd.xldate.xldate_as_datetime(value, book.datemode).date()
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, str):
        text = value.strip()
        for fmt in ("%Y/%m/%d", "%Y-%m-%d", "%Y.%m.%d"):
            try:
                return datetime.strptime(text, fmt).date()
            except ValueError:
                pass
    return None


def iso(value: date | None) -> str | None:
    return value.isoformat() if value else None


def compact_join(parts: list[str]) -> str:
    return " / ".join(part for part in parts if part and part != "-")


def make_item_size(width: str, half_circ: str, thickness: str) -> str:
    parts = []
    if width and width != "-":
        parts.append(f"W{width}")
    if half_circ and half_circ != "-":
        parts.append(f"HC{half_circ}")
    if thickness and thickness != "-":
        parts.append(f"T{thickness}")
    return " / ".join(parts)


def choose_supplier(category: str, customer: str) -> str:
    haystack = re.sub(r"\s+", " ", customer.lower())
    if category.strip().lower() == "code":
        return YAGIKUMA_SUPPLIER
    if any(keyword in haystack for keyword in YAGIKUMA_CUSTOMER_KEYWORDS):
        return YAGIKUMA_SUPPLIER
    return DEFAULT_SUPPLIER


def status_and_flags(
    invoice_no: str,
    exw_date: date | None,
    po_date: date | None,
    today: date,
) -> tuple[str, bool, bool]:
    shipped = bool(exw_date and exw_date <= today)
    recent_exw = bool(exw_date and exw_date >= RECENT_EXW_ACTIVE_FROM)
    if invoice_no:
        return "請求済", not recent_exw, True
    if shipped:
        return "未請求", not recent_exw, False
    if not po_date:
        return "発注待", False, False
    return "未請求", False, False


def read_mobilon_rows(xls_path: Path, today: date | None = None) -> list[dict[str, Any]]:
    today = today or date.today()
    book = xlrd.open_workbook(str(xls_path))
    sheet = book.sheet_by_name(MOBILON_SOURCE_SHEET)

    rows: list[dict[str, Any]] = []
    for row_index in range(11, sheet.nrows):
        order_no = normalize_text(sheet.cell_value(row_index, 1))
        item_code = normalize_text(sheet.cell_value(row_index, 12))
        if not order_no and not item_code:
            continue

        customer = normalize_text(sheet.cell_value(row_index, 2))
        category = normalize_text(sheet.cell_value(row_index, 3))
        order_date = as_date(book, sheet.cell_value(row_index, 4), sheet.cell_type(row_index, 4))
        customer_po = normalize_text(sheet.cell_value(row_index, 5))
        customer_po_line = normalize_text(sheet.cell_value(row_index, 6))
        po_date = as_date(book, sheet.cell_value(row_index, 7), sheet.cell_type(row_index, 7))
        our_po_no = normalize_text(sheet.cell_value(row_index, 8))
        our_po_line = normalize_text(sheet.cell_value(row_index, 9))
        invoice_date = as_date(book, sheet.cell_value(row_index, 10), sheet.cell_type(row_index, 10))
        invoice_no = normalize_text(sheet.cell_value(row_index, 11))
        customer_item_code = normalize_text(sheet.cell_value(row_index, 13))
        caution = normalize_text(sheet.cell_value(row_index, 14))
        width = normalize_text(sheet.cell_value(row_index, 15))
        half_circ = normalize_text(sheet.cell_value(row_index, 16))
        thickness = normalize_text(sheet.cell_value(row_index, 17))
        color = normalize_text(sheet.cell_value(row_index, 18))
        qty = normalize_number(sheet.cell_value(row_index, 19))
        unit = normalize_text(sheet.cell_value(row_index, 20))
        sales_currency = normalize_text(sheet.cell_value(row_index, 21)) or "JPY"
        sales_price = normalize_number(sheet.cell_value(row_index, 22))
        sales_total = normalize_number(sheet.cell_value(row_index, 23))
        sales_total_jpy = normalize_number(sheet.cell_value(row_index, 24))
        cost_price = normalize_number(sheet.cell_value(row_index, 25))
        exw_date = as_date(book, sheet.cell_value(row_index, 32), sheet.cell_type(row_index, 32))
        etd = as_date(book, sheet.cell_value(row_index, 34), sheet.cell_type(row_index, 34))
        transport = normalize_text(sheet.cell_value(row_index, 36))
        eta = as_date(book, sheet.cell_value(row_index, 37), sheet.cell_type(row_index, 37))
        memo = normalize_text(sheet.cell_value(row_index, 39))
        factory = normalize_text(sheet.cell_value(row_index, 48)) if sheet.ncols > 48 else ""

        status, archived, locked = status_and_flags(invoice_no, exw_date, po_date, today)
        item_size = make_item_size(width, half_circ, thickness)
        supplier = choose_supplier(category, customer)

        exchange_rate = None
        if sales_currency.upper() == "USD" and sales_total and sales_total_jpy:
            exchange_rate = round(sales_total_jpy / sales_total, 6)

        comments = compact_join(
            [
                f"旧台帳Excel行: {row_index + 1}",
                f"顧客PO枝番: {customer_po_line}" if customer_po_line else "",
                f"当社PO: {compact_join([our_po_no, our_po_line])}" if our_po_no or our_po_line else "",
                f"顧客品番: {customer_item_code}" if customer_item_code else "",
                f"注意事項: {caution}" if caution else "",
                f"輸送方法: {transport}" if transport else "",
                f"ETA: {iso(eta)}" if eta else "",
                f"旧販売合計: {sales_total:g}" if sales_total is not None else "",
                f"旧円換算: {sales_total_jpy:g}" if sales_total_jpy is not None else "",
                f"備考: {memo}" if memo else "",
                f"工場: {factory}" if factory else "",
            ]
        )

        rows.append(
            {
                "status": status,
                "quote_no": None,
                "order_date": iso(order_date),
                "customer_po": customer_po,
                "rep": None,
                "customer": customer,
                "end_user": customer,
                "supplier": supplier,
                "category": category,
                "item_code": item_code,
                "supplier_item_code": item_code,
                "item_size": item_size,
                "item_color": color,
                "item_name": compact_join([category, item_size, color]),
                "origin": "JP",
                "qty": qty,
                "unit": unit,
                "package_qty": None,
                "package_unit": None,
                "cost_price": cost_price,
                "cost_currency": "JPY",
                "markup_rate": None,
                "sales_price": sales_price,
                "sales_currency": sales_currency.upper(),
                "end_user_price": None,
                "end_user_currency": sales_currency.upper(),
                "misc_cost": 0,
                "misc_currency": "JPY",
                "exchange_rate": exchange_rate,
                "internal_rate": None,
                "factory_date": iso(exw_date),
                "bl_date": iso(etd),
                "po_date": iso(po_date),
                "order_no": order_no,
                "invoice_date": iso(invoice_date),
                "invoice_no": invoice_no,
                "link_id": f"MOBILON-{order_no}" if order_no else None,
                "comments": comments,
                "system_log": "Imported from Mobiron legacy ledger.",
                "locked": locked,
                "archived": archived,
                "revision": 0,
            }
        )
    return rows


def summarize(rows: list[dict[str, Any]]) -> dict[str, Any]:
    return {
        "rows": len(rows),
        "status": dict(Counter(row["status"] for row in rows)),
        "archived": sum(1 for row in rows if row["archived"]),
        "locked": sum(1 for row in rows if row["locked"]),
        "supplier": dict(Counter(row["supplier"] for row in rows)),
        "category": dict(Counter(row["category"] for row in rows)),
        "currency": dict(Counter(row["sales_currency"] for row in rows)),
        "missing_bl_date": sum(1 for row in rows if not row["bl_date"]),
        "missing_customer_po": sum(1 for row in rows if not row["customer_po"]),
        "samples": rows[:3],
    }


def supabase_request(
    base_url: str,
    key: str,
    method: str,
    path: str,
    payload: Any | None = None,
    prefer: str | None = None,
) -> Any:
    data = None if payload is None else json.dumps(payload).encode("utf-8")
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }
    if prefer:
        headers["Prefer"] = prefer

    req = urllib.request.Request(
        f"{base_url}/rest/v1/{path}",
        data=data,
        headers=headers,
        method=method,
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as response:
            body = response.read().decode("utf-8")
            return json.loads(body) if body else None
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Supabase {method} {path} failed: {exc.code} {body}") from exc


def has_existing_mobilon_rows(base_url: str, key: str) -> bool:
    existing = supabase_request(
        base_url,
        key,
        "GET",
        "order_items?select=id&link_id=like.MOBILON-*&limit=1",
    )
    return bool(existing)


def insert_rows(base_url: str, key: str, rows: list[dict[str, Any]]) -> None:
    for start in range(0, len(rows), 300):
        batch = rows[start : start + 300]
        supabase_request(
            base_url,
            key,
            "POST",
            "order_items",
            batch,
            prefer="return=minimal",
        )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("xls_path", type=Path)
    parser.add_argument("--insert", action="store_true", help="Insert converted rows into Supabase.")
    parser.add_argument(
        "--allow-duplicates",
        action="store_true",
        help="Allow inserting even if MOBILON rows already exist in order_items.",
    )
    parser.add_argument(
        "--preview-json",
        type=Path,
        default=Path("mobilon_import_preview.json"),
        help="Path for the JSON dry-run preview.",
    )
    args = parser.parse_args()

    app_dir = Path(__file__).resolve().parents[1]
    rows = read_mobilon_rows(args.xls_path)
    summary = summarize(rows)

    preview_path = args.preview_json
    if not preview_path.is_absolute():
        preview_path = app_dir / preview_path
    preview_path.write_text(
        json.dumps({"summary": summary, "rows": rows}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    print(json.dumps(summary, ensure_ascii=False, indent=2))
    print(f"Preview written to {preview_path}")

    if not args.insert:
        print("Dry run only. No Supabase changes were made.")
        return 0

    base_url, key = resolve_supabase_config(app_dir)
    if not args.allow_duplicates and has_existing_mobilon_rows(base_url, key):
        raise RuntimeError(
            "Existing MOBILON rows were found in Supabase. "
            "Re-run with --allow-duplicates only if duplicate import is intentional."
        )
    insert_rows(base_url, key, rows)
    print(f"Supabase import complete. Inserted {len(rows)} rows.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
