"""Import MURC USD exchange rates into Supabase.

Usage:
  python scripts/import_murc_usd_rates.py C:/Users/higashi/Downloads/murc_2026.xls

The script reads secrets from prototype-app/.env.admin.local and does not print
or persist them. It upserts USD rows into mufg_exchange_rates and creates or
updates the standard USD preferential adjustment rule.
"""

from __future__ import annotations

import argparse
import json
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any

import xlrd


MURC_SOURCE_URL = "https://www.murc-kawasesouba.jp/fx/past_3month.php"
USD_ADJUSTMENT_NAME = "USD standard preferential"


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


def is_number(value: Any) -> bool:
    return isinstance(value, (int, float)) and value != ""


def as_date(book: xlrd.book.Book, value: Any, cell_type: int) -> date | None:
    if cell_type == xlrd.XL_CELL_DATE:
        return xlrd.xldate.xldate_as_datetime(value, book.datemode).date()
    if isinstance(value, datetime):
        return value.date()
    return None


def read_murc_usd_rows(xls_path: Path) -> list[dict[str, Any]]:
    book = xlrd.open_workbook(str(xls_path))
    sheet = book.sheet_by_name("data")

    last_business_row = None
    for row_index in range(2, sheet.nrows):
        row_date = as_date(book, sheet.cell_value(row_index, 0), sheet.cell_type(row_index, 0))
        if (
            row_date
            and is_number(sheet.cell_value(row_index, 2))
            and is_number(sheet.cell_value(row_index, 3))
        ):
            last_business_row = row_index

    if last_business_row is None:
        raise RuntimeError("No USD TTS/TTB rows found in the data sheet.")

    rows: list[dict[str, Any]] = []
    previous_business: dict[str, Any] | None = None
    imported_at = datetime.now(timezone.utc).isoformat()

    for row_index in range(2, last_business_row + 1):
        row_date = as_date(book, sheet.cell_value(row_index, 0), sheet.cell_type(row_index, 0))
        if not row_date:
            continue

        tts_value = sheet.cell_value(row_index, 2)
        ttb_value = sheet.cell_value(row_index, 3)

        if is_number(tts_value) and is_number(ttb_value):
            previous_business = {
                "rate_date": row_date.isoformat(),
                "currency": "USD",
                "ttb_rate": round(float(ttb_value), 6),
                "tts_rate": round(float(tts_value), 6),
                "source_date": row_date.isoformat(),
                "source_name": "MURC monthly",
                "source_url": MURC_SOURCE_URL,
                "is_business_day": True,
                "previous_business_date": None,
                "fetched_at": imported_at,
                "updated_at": imported_at,
            }
            rows.append(previous_business.copy())
        elif previous_business:
            copied = previous_business.copy()
            copied.update(
                {
                    "rate_date": row_date.isoformat(),
                    "source_date": previous_business["rate_date"],
                    "is_business_day": False,
                    "previous_business_date": previous_business["rate_date"],
                    "fetched_at": imported_at,
                    "updated_at": imported_at,
                }
            )
            rows.append(copied)

    return rows


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


def upsert_rates(base_url: str, key: str, rows: list[dict[str, Any]]) -> None:
    for start in range(0, len(rows), 500):
        batch = rows[start : start + 500]
        supabase_request(
            base_url,
            key,
            "POST",
            "mufg_exchange_rates?on_conflict=rate_date,currency",
            batch,
            prefer="resolution=merge-duplicates,return=minimal",
        )


def upsert_usd_adjustment(base_url: str, key: str, effective_from: str) -> str:
    query = urllib.parse.urlencode(
        {
            "select": "id",
            "adjustment_name": f"eq.{USD_ADJUSTMENT_NAME}",
            "currency": "eq.USD",
            "effective_from": f"eq.{effective_from}",
            "limit": "1",
        }
    )
    existing = supabase_request(base_url, key, "GET", f"exchange_rate_adjustments?{query}")
    now = datetime.now(timezone.utc).isoformat()
    payload = {
        "adjustment_name": USD_ADJUSTMENT_NAME,
        "currency": "USD",
        "customer_code": None,
        "supplier_code": None,
        "preferential_ttb_adjustment": 0.5,
        "preferential_tts_adjustment": -0.5,
        "effective_from": effective_from,
        "effective_to": None,
        "priority": 100,
        "is_active": True,
        "memo": "USD: sales use TTB + 0.50 JPY, purchases use TTS - 0.50 JPY.",
        "updated_at": now,
    }

    if existing:
        item_id = existing[0]["id"]
        supabase_request(
            base_url,
            key,
            "PATCH",
            f"exchange_rate_adjustments?id=eq.{urllib.parse.quote(item_id)}",
            payload,
            prefer="return=minimal",
        )
        return "updated"

    payload["created_at"] = now
    supabase_request(
        base_url,
        key,
        "POST",
        "exchange_rate_adjustments",
        payload,
        prefer="return=minimal",
    )
    return "created"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("xls_path", type=Path)
    parser.add_argument("--effective-from", default="1990-01-01")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    app_dir = Path(__file__).resolve().parents[1]
    rows = read_murc_usd_rows(args.xls_path)
    first_date = rows[0]["rate_date"] if rows else None
    last_date = rows[-1]["rate_date"] if rows else None
    business_days = sum(1 for row in rows if row["is_business_day"])
    copied_days = len(rows) - business_days

    print(
        f"Prepared {len(rows)} USD rows "
        f"({business_days} business, {copied_days} non-business) "
        f"from {first_date} to {last_date}."
    )

    if args.dry_run:
        print("Dry run only. No Supabase changes were made.")
        return 0

    base_url, key = resolve_supabase_config(app_dir)
    upsert_rates(base_url, key, rows)
    adjustment_status = upsert_usd_adjustment(base_url, key, args.effective_from)
    print(f"Supabase import complete. USD adjustment rule {adjustment_status}.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
