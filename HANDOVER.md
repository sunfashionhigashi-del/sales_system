# SUCCESS Development Handover

Last updated: 2026-05-14

This file summarizes the project state for Codex or another developer taking over the SUCCESS prototype.

## Project

SUCCESS is the Sun Fashion overseas sales management prototype:

Sun Fashion Unified Cloud Control Enterprise Sales System

The active app is `prototype-app`, a React/Vite/Supabase web application centered on an AG-Grid transaction grid.

## Current Stack

- React 19
- TypeScript
- Vite
- Tailwind CSS v4
- AG-Grid Community / Enterprise
- Supabase PostgreSQL
- React Hook Form
- Zod
- lucide-react

## Important Paths

- `prototype-app/src/App.tsx`: app shell, login, tabs, command bar
- `prototype-app/src/components/GridArea.tsx`: main transaction grid and most business logic
- `prototype-app/src/components/MasterViewer.tsx`: master data management
- `prototype-app/src/components/OrderDetailModal.tsx`: detailed transaction editor
- `prototype-app/src/lib/supabase.ts`: Supabase client
- `prototype-app/database_schema.sql`: core database schema
- `prototype-app/exchange_rate_schema.sql`: exchange-rate tables
- `APP_SPEC.md`: locked UI/product requirements
- `system_specification.md`: system behavior and architecture notes
- `user_manual_draft.md`: user-facing behavior
- `session_log.md`: development history

## Local Run

Run commands from:

```powershell
cd C:\Users\higashi\Projects\039_sales_system\prototype-app
npm run dev -- --host 0.0.0.0 --port 4173
```

Open:

```text
http://localhost:4173/
```

Build check:

```powershell
npm run build
```

`npm run lint` has previously taken too long in this environment, so treat it as a follow-up check rather than a quick gate.

## Supabase

The app reads browser-safe Supabase settings from:

```text
prototype-app/.env.local
```

Do not print, commit, or copy secret values. Admin-only database credentials are kept locally in:

```text
prototype-app/.env.admin.local
```

That file is ignored by Git. SQL execution has been verified through the Supabase transaction pooler on port `6543`.

Recent verified table counts:

- `order_items`: 13,765
- `audit_logs`: 17,379
- `suppliers`: 43
- `products`: 3
- `product_prices`: 6
- `customers`: 3
- `annual_exchange_rates`: 0
- `mufg_exchange_rates`: 0
- `exchange_rate_adjustments`: 0

## Current Worktree Notes

Formal in-progress change:

- Development-only fallback in `GridArea.tsx`: if Supabase cannot be reached during local Vite development, the grid can show bundled `gcga_data.json` sample rows with a clear "Dev only" indicator.
- Production builds do not silently replace unavailable Supabase data with sample rows.
- `.gitignore` ignores Vite dev logs and admin env files.
- Documentation has been updated in `system_specification.md`, `user_manual_draft.md`, and `session_log.md`.

## Product Rules To Preserve

- Save is the primary blue action.
- Main transaction grid persistence is manual; only explicit Save writes order grid changes to Supabase.
- Master management screens may save directly where that behavior already exists.
- Normal sales users should see only their own records; admin sees all records.
- Locked/revised rows and document-related state changes must remain auditable.
- Computed columns such as totals, gross profit, and gross profit rate should read as locked/non-editable.
- AG-Grid UI should stay Japanese-first.
- Avoid broad decorative or marketing-style UI.

## Known Issues / Risks

- Several legacy documents and UI literals are mojibake. Prefer fixing visible user-facing strings gradually as touched.
- AG-Grid Enterprise license is not configured; the dev console reports trial/license warnings.
- Some AG-Grid APIs used by the app are deprecated in v35 but still functioning.
- Authentication is still lightweight/local compared with a full Supabase Auth + RLS production setup.
- Exchange-rate tables exist but have no data yet.
- Document/PDF/Excel output is still a Phase 3 priority.

## Recommended Next Steps

1. Commit the development-only Supabase fallback and documentation cleanup.
2. Decide the exchange-rate data strategy: manual seed first, then MUFG automatic fetch later.
3. Implement the first production document output flow, likely Invoice first.
4. Plan Supabase Auth and production RLS hardening before real deployment.
