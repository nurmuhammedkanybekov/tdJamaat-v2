# Setting up tdJamaat v2

This is the fresh rebuild — same core idea as the original tdJamaat, new
data model (real houses/members instead of a JSON blob per week), and
proper per-house login instead of one shared password. This doc gets a
brand new Supabase project wired up from scratch.

## 1. Create the Supabase project

Go to [supabase.com](https://supabase.com), create a new project (pick
whichever account should actually own this long-term — worth deciding now
rather than after the community depends on it). Note the **Project URL**
and, under **Project Settings → API**, the **anon public** key and the
**service_role** key (the second one is secret — never put it in the app
or commit it anywhere).

## 2. Create the schema and seed the roster

In the Supabase dashboard, open **SQL Editor** and run, in order:

1. `supabase/schema.sql` — creates the houses/members/weeks/metrics tables
   and the row-level security policies.
2. `supabase/seed.sql` — inserts the 5 current houses (Mester, Danjanich,
   Pannonia, Baksai, Dobozy New) and their members/roles from the roster
   you shared. Photos aren't set yet (see step 5).

## 3. Configure the app's environment

Copy `.env.example` to `.env` and fill in:

```
VITE_SUPABASE_URL=<Project URL from step 1>
VITE_SUPABASE_ANON_KEY=<anon public key from step 1>
```

There's no `VITE_ADMIN_PASSWORD` anymore — auth now happens through real
Supabase accounts (step 4), not a password baked into the client bundle.

## 4. Create the login accounts (5 house leaders + 1 admin)

1. Copy `scripts/auth-passwords.example.json` to
   `scripts/auth-passwords.json` and fill in a real password for `admin`
   and for each house slug (`mester`, `damjanich`, `pannonia`, `baksai`,
   `dobozy`). **Do not commit this file** — it's already gitignored.
2. Copy `.env.admin.example` to `.env.admin` and fill in the Project URL
   and the **service_role** key from step 1.
3. Run:
   ```
   node --env-file=.env.admin scripts/create-auth-users.js
   ```
   This creates one Supabase Auth account per house plus the admin
   account. It's safe to re-run any time — e.g. to rotate a house's
   password later, just change it in `auth-passwords.json` and run it
   again.

Each house's leaders share that one house password — when they log in,
they'll just pick their house and type it, the app handles the rest
internally. The admin password is separate and gives full access
(managing houses/members/weeks), which the per-house logins deliberately
can't do.

## 5. Add member photos

Not wired up yet in this first pass — once you send over the actual image
files, I'll add photo upload support and update the `members.photo_url`
rows. In the meantime the app works fine without photos (falls back to
initials).

## 6. Run it locally

```
npm install
npm run dev
```

## 7. Deploy

Same as before — push to a GitHub repo, import into Vercel, and set the
two `VITE_*` environment variables from step 3 in the Vercel project
settings. (`SUPABASE_SERVICE_ROLE_KEY` and `.env.admin` are never needed
on Vercel — that key only runs locally, once, via the setup script.)

---

**What's still coming** (see the task list): the redesigned UI, house-scoped
data entry forms wired to the new schema, and the admin roster-management
screens. This doc covers getting the backend foundation live; the app code
itself is still catching up to this schema.
