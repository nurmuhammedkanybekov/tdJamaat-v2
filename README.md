# tdJamaat v2

Weekly performance tracker for the jamaat's houses — individual metrics,
team activity, rankings, and progress over time.

Rebuilt from the original [tdJamaat](https://github.com/Muslim04/tdJamaat)
with a normalized data model (real houses/members instead of a JSON blob
re-typed every week), per-house authenticated logins instead of one shared
admin password, and a refreshed UI.

## Stack

- **Frontend**: React, TypeScript, Vite, Tailwind CSS
- **Database & auth**: Supabase (Postgres + Supabase Auth)
- **Charts**: Recharts · **Icons**: Lucide React

## Setup

See **[SETUP.md](./SETUP.md)** for the full walkthrough — creating the
Supabase project, running the schema, seeding the roster, and creating the
per-house/admin login accounts. Short version once that's done:

```bash
npm install
npm run dev
```

## Project structure

- `src/components` — shared UI (Header, LoginModal, DataEntryForm, Avatar, …)
- `src/components/views` — one component per dashboard tab
- `src/services` — Supabase reads/writes (`dataService.ts`) and auth (`authService.ts`)
- `src/utils` — scoring formula and ranking calculations
- `src/types` — shared TypeScript types
- `supabase/schema.sql` / `supabase/seed.sql` — database setup
- `scripts/create-auth-users.js` — provisions the house/admin login accounts

## How access works

Anyone can view the dashboard — no login needed. Entering or editing data
requires signing in:

- Each **house** has its own password (shared by that house's leaders),
  and can only write that house's own scores.
- The **admin** password can do everything, including managing the
  houses/members roster.

Both are enforced by the database itself (row-level security), not just
hidden in the interface — see `supabase/schema.sql`.
