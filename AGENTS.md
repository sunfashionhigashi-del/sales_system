# Codex Project Instructions

## Project Overview

This repository contains the SUCCESS sales management system for overseas sales operations.
The active application is `prototype-app`, a React/Vite/Supabase web app centered on an Excel-like AG-Grid workflow.

## Working Directory

Run app commands from:

```powershell
cd C:\Users\higashi\Projects\039_sales_system\prototype-app
```

Common commands:

```powershell
npm run dev
npm run lint
npm run build
npm run preview
```

## Core Stack

- React 19
- TypeScript
- Vite
- Tailwind CSS v4
- AG-Grid Community / Enterprise
- Supabase PostgreSQL
- React Hook Form
- Zod
- lucide-react

## Required Environment

`prototype-app/.env.local` must provide:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

Treat these values as secrets. Do not print, copy, or commit secret values unless the user explicitly asks.

## Source Of Truth Documents

Read these before making code changes:

- `APP_SPEC.md`: locked product/UI requirements. Do not modify unless explicitly instructed.
- `system_specification.md`: architecture and system behavior.
- `user_manual_draft.md`: user-facing behavior.
- `session_log.md`: development history and current context.
- `.agents/workflows/git_workflow.md`: Git/GitHub workflow rules.

## Mandatory Documentation Updates

When changing logic, UI, architecture, workflows, or user-visible behavior, update all relevant docs in the same work session:

- `system_specification.md`
- `user_manual_draft.md`
- `session_log.md`

Keep documentation changes factual and tied to the actual code change.

## UI And Product Rules

- Preserve the SUCCESS branding and acronym treatment.
- Keep the white/gray SaaS-like UI language.
- The Save button is the primary blue hero action.
- All action buttons should use intuitive `lucide-react` icons.
- Keyboard badges must remain dark with light text.
- AG-Grid UI should be Japanese-first, including menus and tooltips.
- Do not regress the hidden floating filter text boxes; only the search icon button should remain visible.
- Computed columns such as totals, gross profit, and gross profit rate must visually read as locked/non-editable.
- Avoid adding broad decorative UI or marketing-style screens; this is an operational business tool.

## Data And Sync Rules

- Data persistence is manual: only explicit Save should write order grid changes to Supabase.
- Master management screens may save master edits directly when that is already the established behavior.
- Do not introduce autosave for the main transaction grid without explicit approval.
- Preserve RBAC behavior: normal sales users see only their own records; admin sees all records.
- Preserve auditability for locked/revised rows and document-related state changes.

## Git Workflow

- Do not commit directly to `main` for new feature/fix work unless the user explicitly asks.
- Prefer branches named `feature/<name>` or `fix/<name>`.
- Never discard existing local changes without explicit user approval.
- Before starting edits, check `git status --short --branch`.
- Keep commits meaningful and scoped to one feature or fix.
- Push after completed feature units or when the user asks to sync.

## Current Review Notes

At the time this file was created, `main` matched `origin/main`, but the working tree had local changes in:

- `prototype-app/src/App.tsx`
- `prototype-app/src/components/GridArea.tsx`
- `prototype-app/patch.py` as an untracked file

Treat these as user/local work unless clarified otherwise.
