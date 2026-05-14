"""Import today's MUFG USD public exchange rate into Supabase.

The script reads MUFG's official CSV and upserts the USD TTS/TTB row into
`mufg_exchange_rates`. Secrets are read from .env.admin.local and are not
printed.
"""

from __future__ import annotations

import argparse
import csv
import io
import json
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


MUFG_CSV_URL = "https://www.bk.mufg.jp/gdocs/kinri/list_j/kinri/spot_rate.csv"


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


def fetch_mufg_csv(url: str = MUFG_CSV_URL) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=30) as response:
        return response.read().decode("cp932")


def parse_mufg_usd_rate(csv_text: str) -> dict[str, Any]:
    update_date = None
    reader = csv.reader(io.StringIO(csv_text))
    for row in reader:
        joined = " ".join(cell.strip() for cell in row if cell.strip())
        match = re.search(r"最終更新日時[:：]\s*(\d{4})/(\d{1,2})/(\d{1,2})", joined)
        if match:
            y, m, d = match.groups()
            update_date = f"{y}-{m.zfill(2)}-{d.zfill(2)}"
            break

    if not update_date:
        raise RuntimeError("Could not find MUFG CSV update date.")

    reader = csv.reader(io.StringIO(csv_text))
    for row in reader:
        if len(row) < 6:
            continue
        if row[0].strip() == "001" and row[1].strip().startswith("USD"):
            return {
                "rate_date": update_date,
                "currency": "USD",
                "tts_rate": float(row[2].strip()),
                "ttb_rate": float(row[5].strip()),
                "source_date": update_date,
                "source_name": "MUFG daily",
                "source_url": MUFG_CSV_URL,
                "is_business_day": True,
                "previous_business_date": None,
                "fetched_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }

    raise RuntimeError("Could not find USD row in MUFG CSV.")


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


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    app_dir = Path(__file__).resolve().parents[1]
    row = parse_mufg_usd_rate(fetch_mufg_csv())
    print(
        "Prepared MUFG USD row "
        f"{row['rate_date']}: TTS {row['tts_rate']}, TTB {row['ttb_rate']}."
    )

    if args.dry_run:
        print("Dry run only. No Supabase changes were made.")
        return 0

    base_url, key = resolve_supabase_config(app_dir)
    supabase_request(
        base_url,
        key,
        "POST",
        "mufg_exchange_rates?on_conflict=rate_date,currency",
        [row],
        prefer="resolution=merge-duplicates,return=minimal",
    )
    print("Supabase import complete.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
