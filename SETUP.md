# Setting up tdJamaat v2

Same core idea as the original tdJamaat, on a new foundation: real
houses/members tables instead of a JSON blob re-typed every week, and
proper per-house logins instead of one shared password. This doc wires up
a brand new Supabase project from scratch and gets the app running.

## 1. Create the Supabase project

Go to [supabase.com](https://supabase.com) and create a new project (pick
whichever account should actually own this long-term). Note the
**Project URL** and, under **Project Settings → API**, the **anon
public** key and the **service_role** key — the second one is secret,
never put it in the app or commit it anywhere.

## 2. Create the schema and seed the roster

In the Supabase dashboard, open **SQL Editor** and run, in order:

1. `supabase/schema.sql` — creates the houses/members/weeks/metrics
   tables and the row-level security policies.
2. `supabase/seed.sql` — inserts the current houses (Mester, Damjanich,
   Pannonia, Baksai, Dobozy) and their members/roles.
3. `supabase/photo-upload-setup.sql` — creates the `member-photos`
   storage bucket and the policies that let a house leader upload/replace
   photos for members in their own house.
4. `supabase/season-2026-09.sql` — the season rules: stores the role
   minimums and mini-card targets, makes targets admin-only (enforced by
   the database, not just the UI), and makes opening a week admin-only.
   Safe to re-run.

## 3. Configure the app's environment

Copy `.env.example` to `.env` and fill in:

```
VITE_SUPABASE_URL=<Project URL from step 1>
VITE_SUPABASE_ANON_KEY=<anon public key from step 1>
```

There's no admin password baked into the client bundle — auth happens
through real Supabase accounts (step 4).

## 4. Create the login accounts (house leaders + admin)

1. Copy `scripts/syr_sozdor.example.json` to `scripts/syr_sozdor.json`
   and fill in a real password for `admin` and for each house slug
   (`mester`, `damjanich`, `pannonia`, `baksai`, `dobozy`). **Do not
   commit this file** — it's already gitignored. (The name is
   deliberately opaque rather than something like `auth-passwords.json`,
   so it doesn't read as "credentials file" to anyone browsing the public
   repo — *syr sozdor* is Kyrgyz for "secret words".)
2. Copy `.env.admin.example` to `.env.admin` and fill in the Project URL
   and the **service_role** key from step 1.
3. Run:
   ```
   node --env-file=.env.admin scripts/create-auth-users.js
   ```
   This creates one Supabase Auth account per house plus the admin
   account. It's safe to re-run any time — e.g. to rotate a house's
   password later, just change it in `syr_sozdor.json` and run it again.

Each house's leaders share that one house password — when they log in
they just pick their house and type it, the app builds the internal
`<slug>@tdjamaat.internal` login email itself. The admin password is
separate and gives full access (managing houses/members/weeks), which
the per-house logins deliberately can't do.

## 5. Run it locally

```
npm install
npm run dev
```

## 6. Deploy

```
npm install -g vercel   # if you don't have it already
vercel login
vercel --prod
```

On first run, `vercel` will ask to link a new or existing project — pick
one and it'll ask for the two `VITE_*` variables from step 3 (or set them
afterwards in the project's **Settings → Environment Variables**, then
redeploy). `SUPABASE_SERVICE_ROLE_KEY` / `.env.admin` are never needed on
Vercel — that key only ever runs locally, once, via the setup script.

If Vercel's **Deployment Protection** is on for the project, the live
URL will sit behind a Vercel login wall — turn it off under
**Settings → Deployment Protection** for a dashboard the whole jamaat
should be able to open without a Vercel account.

The app also has a daily keep-alive (`api/keepalive.js`, scheduled in
`vercel.json`): Supabase's free plan pauses a project after 7 days without
activity, so Vercel pings the database once a day. It reads the same two
`VITE_*` variables from the project's environment variables. Check it
after deploying by opening `https://<your-site>/api/keepalive` — it should
say `"ok": true`.

## 7. Running the season (weekly routine)

- **Admin, at the start of each week:** log in → **Маалымат кошуу** →
  **Жаңы апта** (tap twice to confirm). Leaders can only fill in weeks the
  admin has opened.
- **House leaders:** log in → **Маалымат кошуу** → the form opens on the
  latest week → enter results (**Факт**) → **Сактоо**. Targets (**План**)
  are locked for leaders.
- **Custom target for one person** (e.g. illness): admin opens that house
  and week, changes the **План** box, saves. It carries forward to later
  weeks that house enters.
- **Changing a role minimum for everyone:** edit the `season_settings`
  row in Supabase (Table Editor). Applies to targets from then on; saved
  weeks keep the target they were saved with.
- **Backup:** admin → **Маалымат кошуу** → **Камдык көчүрмө** downloads
  the whole database as a JSON file. Worth doing once a week.
- **Roster changes mid-season:** add a member (or set `active = false`)
  in the `members` table. Past weeks keep the roster they actually had, so
  a new member never counts as a zero in weeks before they joined.

