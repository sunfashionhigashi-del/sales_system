# Prototype App Runbook

Use this when you want to check the SUCCESS prototype locally.

## Start

```powershell
cd C:\Users\higashi\Projects\039_sales_system\prototype-app
npm run dev -- --host 0.0.0.0 --port 4173
```

Open:

```text
http://localhost:4173/
```

## Check Supabase

The app expects browser-safe Supabase values in:

```text
prototype-app/.env.local
```

Required keys:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

Do not commit admin credentials or database passwords. Admin-only settings belong in:

```text
prototype-app/.env.admin.local
```

## Stop

If the server is running in the current terminal, press:

```text
Ctrl+C
```

If it was started in the background and is listening on port `4173`:

```powershell
$conn = Get-NetTCPConnection -LocalPort 4173 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
if ($conn) { Stop-Process -Id $conn.OwningProcess -Force }
```

## Build Check

```powershell
cd C:\Users\higashi\Projects\039_sales_system\prototype-app
npm run build
```
