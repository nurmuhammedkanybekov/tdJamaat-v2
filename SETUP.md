# Setting up tdJamaat

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
2. `supabase/seed.sql` — five houses with invented demo people, so a new
   project has something to show. Replace them with the real roster on the
   site (Админ панели → Курам).
3. `supabase/photo-upload-setup.sql` — creates the `member-photos`
   storage bucket and the policies that let a house leader upload/replace
   photos for members in their own house.
4. `supabase/season-2026-09.sql` — the season rules: stores the role
   minimums and mini-card targets, makes targets admin-only (enforced by
   the database, not just the UI), and makes opening a week admin-only.
   Safe to re-run.
5. `supabase/add-babh-2026-09.sql` — adds the БАБХ mini-card activity.
6. `supabase/kitep-target-5-2026-10.sql` — КИТЕП minimum 7 → 5.
7. `supabase/history-and-locks-2026-10.sql` — change history (who changed
   what, when) and admin week locking. Logging can never block a save;
   every week starts unlocked. Safe to re-run.
8. `supabase/seasons-2026-10.sql` — seasons: the current season becomes
   "2026–27", every saved row remembers the house and role it was saved
   under, targets carry forward within a season only, and the admin's
   "end the season" button. Safe to re-run.
9. `supabase/excused-weeks-2026-10.sql` — excused weeks: leaders can mark
   someone as excused (sick, travelling) for a week. Until this runs the
   site hides the switch and saves exactly as before. Safe to re-run.
10. `supabase/roster-changes-2026-11.sql` — roster changes during a
    season: a new role (e.g. member → captain) starts from that role's
    plans; a saved week stays editable by the house it was earned in after
    someone moves; the admin can set which house/role a saved week counts
    under (the roster tab does this when a move starts from a chosen
    week). Needs step 8. Safe to re-run.
11. `supabase/private-site-2026-11.sql` — makes the site private: people,
    results, plans and seasons can only be read by a logged-in captain or
    the admin (only house names and week numbers stay readable, for the
    login screen and the keep-alive). It also moves every account's role
    into `app_metadata`, which users can't change about themselves (the
    old `user_metadata` could be — a captain could have made themselves
    admin). Run it **after** deploying the website version that has the
    login screen. Safe to re-run.
    Then, in Supabase → **Authentication → Sign In / Providers → Email**,
    turn **off** "Allow new users to sign up". (Even if left on, a
    self-made account gets no access.)
12. `supabase/private-photos-2026-11.sql` — member photos become private:
    only a logged-in captain or the admin can open them (before, anyone
    who knew the project address could list them). Run it **after**
    deploying the website version that loads photos with signed links.
    Deletes nothing. Safe to re-run.
13. `supabase/protect-history-2026-11.sql` — the database refuses to delete
    a house, a person or a week that has results (the website never does;
    this guards against a wrong click in the Supabase table editor), and
    checks every entered number (0 … 10,000,000) itself. Changes no data.
    Safe to re-run.
14. `supabase/tazalyk-2026-11.sql` — **Тазалык** (cleanliness, up to 25
    points per house in the weeks the admin switches it on), the jamaat
    week dates (Thursday → Wednesday), and the **inspector** login (see
    step 4). Nothing changes until the admin switches Тазалык on for a
    week. Safe to re-run.
15. `supabase/jattoo-2026-11.sql` — **Жаттоо** (memorization): captains
    write what a person recited (Quran, hadith, dua, zikr, the 99 Names)
    and goals; badges, no points. Safe to re-run.
16. `supabase/members-2026-11.sql` — **members sign in with Google**: a
    member sees their own house and results only, and the app's daily
    counts reach the captain's form. Needs step 4b (Google) to be useful.
    Captains, the inspector and the admin are not affected. Safe to re-run.

17. `supabase/member-photos-2026-11.sql` — a member signed in with Google
    may set their **own** photo (and see their house's photos). Needs 16.
    Safe to re-run.

18. `supabase/house-chat-2026-11.sql` — **Үйдүн сөзү**, each house's own
    conversation (the house's people, its captain and the admin; messages
    arrive at once through Supabase Realtime), and **"Мен"**: a captain or
    the admin says once which person of a house they are, and gets their own
    Үйүм page, photo, chat name and app counts. Needs 16. Safe to re-run.

19. `supabase/community-2026-11.sql` — **Жамааттан кабар** (announcements
    the admin writes to everyone signed in, shown on Менин күнүм and under
    menu → Жамааттан кабар) and **Аптанын максаты** (one line a captain
    pins for the house's week, above the house's conversation). Needs 18.
    Safe to re-run.
20. `supabase/admin-chat-2026-11.sql` — the admin is the admin: the admin's
    account is nobody's person and writes in **every** house's conversation
    as **Админ** (Үйүм → all houses → a house's conversation). The database
    marks the message as the admin's and keeps no member on it, whatever the
    phone sends. Captains and members are unchanged. Needs 18. Safe to re-run.

21. `supabase/jamaat-chat-2026-11.sql` — two more conversations (menu →
    **Баарлашуу**, `#/chat`): **Жамааттын сөзү** for everyone (members signed
    in with Google, captains, CL, the admin) and **Капитандар** for the
    captains, CL and the admin only. The admin opens more chats, renames or
    closes them (Баарлашуу → "Жаңы сөз", the pencil on a chat). The database
    sets who wrote each message. Needs 14 and 16. Safe to re-run (also over
    the earlier version of this file).
22. `supabase/cl-account-2026-11.sql` — the **CL** login (the Тазалык
    inspector). First create the user in Authentication → Users → Add user
    (`inspector@tdjamaat.internal`, the CL password, Auto Confirm), then run
    this file. CL signs in with the "CL" tab and the password only.

23. `supabase/jamaat-view-2026-11.sql` — members see the whole jamaat
    (`#/jamaat`): the season together, the week's pulse, the race of the
    houses. Other houses' people come without names or photos. Needs 16.
    Safe to re-run.

24. `supabase/reactions-2026-11.sql` — reactions in the chats (❤️ 🤲 🤝 👍
    🙏 😊 🔥 😁 😂, one per person per message) and the general chat's new
    name. Earlier "Аамин"s become 🤲. Needs 22. Safe to re-run. Until it
    runs, the chats still work with 🤲 only.
25. `supabase/plans-2026-11.sql` — Пландар: memorization, Quran reading
    and book plans with a status (going, paused, done, dropped), a history
    of every extension, and a reading log. Members can note their own
    memorization; it stays unconfirmed until a captain or the admin listens
    ("Угулду"). Needs the jattoo, members and private-site files first.
    Safe to re-run.
26. `supabase/accounts-2026-11.sql` — personal accounts. Anyone may sign in
    with Google; their zikr, tasbihat, Quran pages, bookmarks and city are
    kept in `user_store` and are the same on every device. Someone who is not
    on the roster sees no house, person, result or chat (those tables already
    require a captain, the admin or a member tied by address). Only Google
    accounts can use it, so a sign-up with an email address and password gets
    nothing. A guest (not tied to a person of a house) can delete their own
    account from Меню → Менин барагым; a member's account is removed by the
    admin only, and captain, CL and admin logins can't be deleted here. Needs 4b and the members
    file. Safe to re-run.
27. `supabase/polls-dm-2026-11.sql` — polls and private messages. In any
    jamaat chat the chart button makes a poll (2–8 answers, one or several
    choices); the author or the admin closes it. Private messages are text
    only and seen by the two people alone (not the admin). Everyone in the
    jamaat with an account can find and write to everyone else in it.
    Guests have none. Needs the jamaat-chat file. Safe to re-run.
28. `supabase/edit-messages-2026-11.sql` — editing one's own messages. In
    the house chat, the jamaat's chats and private messages, whoever wrote
    a message can change its text for 48 hours (the pencil by the time);
    it then reads "өзгөртүлгөн". Poll questions can't be edited. Needs 27
    and the chat files first. Safe to re-run.

Notifications: in Үйдүн чаты or Жамааттан кабар, "Билдирмелерди
күйгүзүү". They arrive while the app is open or in the background (not
when it is fully closed — that would need a push server). On an iPhone
they work in the app added to the Home Screen from Safari (iOS 16.4+).

Run 14 → 15 → 16 → 17 → 18 → 19 in this order, **before** deploying the website version
that uses them (the website copes without them, but shows those parts
only once their file has run). Each file ends with a check you can read
in the results panel.

## 3. Configure the app's environment

Copy `.env.example` to `.env` and fill in:

```
VITE_SUPABASE_URL=<Project URL from step 1>
VITE_SUPABASE_ANON_KEY=<anon public key from step 1>
```

There's no admin password baked into the client bundle — auth happens
through real Supabase accounts (step 4).

## 4. Create the login accounts (captains + admin)

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

Each house's password is for its **captain** only — the captain logs in
as "Капитан", picks the house (the list shows house names only) and types
it; the app builds the internal `<slug>@tdjamaat.internal` login email
itself. The site is private: nobody else can see the results. The admin password is separate and
gives full access (managing houses/members/weeks), which the house
logins deliberately can't do.

**When a captain changes** (or a password may have been shared), give the
house a new password: change it in `scripts/syr_sozdor.json` and run the
script again (step 4.3). The old password stops working at once; a phone
that is already logged in stays logged in until it logs out or its
session expires, so change it on that phone too if needed.

**The inspector (Тазалык).** One more login, for the person who rates
Тазалык for every house. Add an `inspector` password to
`scripts/syr_sozdor.json` and run the script again (step 4.3). They log
in on the **Тазалык** tab of the login screen and see only the houses,
the weeks and the Тазалык checklist — no results.

## 4b. Members: Google sign-in

Members (not captains) sign in with their own Google account. Once, in
about 15 minutes:

1. **Google Cloud** — https://console.cloud.google.com → create a project
   (e.g. "tdJamaat") → **APIs & Services → OAuth consent screen**: user
   type **External**, app name *tdJamaat*, your support email; scopes:
   leave the defaults (email, profile, openid). Then **Publish app**
   (status "In production") — otherwise only listed test users can sign
   in. These basic scopes need no Google review.
2. **APIs & Services → Credentials → Create credentials → OAuth client
   ID** → type *Web application*. Under **Authorized redirect URIs** add
   `https://<project-ref>.supabase.co/auth/v1/callback` (Supabase shows
   this exact address on the Google provider page). Create, and copy the
   **Client ID** and **Client secret**.
3. **Supabase → Authentication → Sign In / Providers → Google**: switch
   it on, paste the Client ID and secret, save.
4. **Supabase → Authentication → URL Configuration**: **Site URL** =
   your site (e.g. `https://tdjamaat.vercel.app`); under **Redirect URLs**
   add the same address with `/**` at the end (and
   `http://localhost:5173/**` for testing locally).
5. **Supabase → Authentication → Sign In / Providers → "Allow new users
   to sign up": ON.** A member's first Google sign-in creates their account;
   with sign-ups off, Supabase refuses it ("Signups not allowed") and the
   site says so on Менин күнүм. This is safe: an account that no captain
   has given an address to is tied to no one and the database shows it
   nothing (the same rules protect against an email sign-up).
6. Run `supabase/members-2026-11.sql` and `supabase/member-photos-2026-11.sql`
   (steps 2.16–2.17) if you haven't.

On an iPhone, a member signs in best **in Safari** (or after installing the
app from Safari): Google's page opens and returns to the site there.

Then a captain opens **menu → Мүчөлөрдүн кирүүсү** and writes each
person's Gmail address. The person opens the site, taps **Google менен
кирүү**, and lands on **Бүгүн** with their own results. Anyone else who
signs in with Google is tied to no one and sees nothing. Changing an
address unties the old account at once.

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
**Settings → Deployment Protection** so captains can reach the app's own
login screen without a Vercel account.

The app also has a daily keep-alive (`api/keepalive.js`, scheduled in
`vercel.json`): Supabase's free plan pauses a project after 7 days without
activity, so Vercel pings the database once a day. It reads the same two
`VITE_*` variables from the project's environment variables. Check it
after deploying by opening `https://<your-site>/api/keepalive` — it should
say `"ok": true`.

To keep strangers from calling it, add a `CRON_SECRET` environment variable
in Vercel (any long random string). Vercel's cron sends it automatically;
anyone else then gets `401`. With the secret set, the address above answers
`401` in a browser too, which is expected.

## 7. Running the season (weekly routine)

- **Admin, at the start of each week:** log in → menu → **Админ панели**
  → **Апталар** → **Жаңы апта ачуу** (or **Маалымат кошуу** → **Жаңы
  апта**, tap twice to confirm). Leaders can only fill in weeks the admin
  has opened. A finished week can be locked on the same tab.
- **House leaders:** log in → **Маалымат кошуу** → the form opens on the
  latest week → enter results (**Факт**) → **Сактоо**. Targets (**План**)
  are locked for leaders.
  Members who use the app: a line above the members offers their app
  numbers for the week (СВТ, ИСТГ, ТСП, К-К) — **Формага коюу** puts them
  in (a number is only raised, never lowered); check and save as usual.
- **Week dates, once:** **Админ панели** → **Апталар** → the Thursday the
  season's first week began. Every week then runs Thursday → Wednesday.
- **Тазалык:** on the same tab, switch Тазалык on for the weeks it counts.
  The inspector (or a captain for their own house) rates it; the
  checklist is edited under **Пландар**.
- **Custom target for one person** (e.g. illness): admin opens that house
  and week, changes the **План** box, saves. It carries forward to later
  weeks that house enters.
- **Changing a role minimum for everyone:** **Админ панели** →
  **Максаттар**. Applies to targets from then on (optionally from a chosen
  week); saved weeks keep the target they were saved with.
- **Backup:** **Админ панели** → **Камдык көчүрмө** downloads the whole
  database as a JSON file. Worth doing once a week.
- **Restoring a backup** (after losing the database, or to move to a new
  project). The backup file has every table, including seasons and the
  change history. On your computer:
  ```
  node scripts/backup-to-sql.js tdjamaat-backup.json > restore.sql
  ```
  Then in a **new, empty** Supabase project run the SQL files of step 2
  **except `seed.sql`**, and after them `restore.sql`. It prints the row
  counts at the end and refuses to run on a database that already has
  data, so it can never overwrite the live one. Login accounts are not in
  a backup: create them again (step 4), then point the website at the new
  project (step 3). Download a fresh backup every week after locking.
- **End of season:** admin → menu → **Админ панели** → **Сезон** → end the season and
  name the next one. The finished season's weeks are locked (optional) and
  stay in the archive; the next season starts at week 1. Then, in
  **Курам**, move people to their new houses and set their roles, and
  open week 1 of the new season.
- **Roster changes mid-season:** **Админ панели** → **Курам**: add a
  member, change a name, role or house, or take someone off the roster
  (their history stays). Past weeks keep the roster they actually had, so
  a new member never counts as a zero in weeks before they joined. A new
  house also needs its own login: see step 4.

