# tdJamaat — handover, 26 November 2026

Branch: `nurmss-v3`. Already on master (live): everything up to `65f74c0`.
Waiting for approval to go to master: the commits listed under "Not live yet".

## 1. Gmail (Google) sign-in — what was found

Checked from outside, read-only, against the live site and Supabase:

| Check | Result |
|---|---|
| Live site runs the latest code | yes |
| Supabase: Google provider enabled | yes |
| Supabase: new sign-ups allowed | yes |
| Database migrations (members, chat, community, …) | all present |
| Google accepts the sign-in request (client id, callback) | yes — goes to the account chooser, no error |
| The app's own return path (code → session → member link) | works end to end in a simulation |

**Fixed in code (not live yet):** if the return from Google lands in a
different browser than the one that started it — the installed app on an
iPhone, or the browser inside Gmail / Telegram / Instagram — the sign-in used
to fail silently: the person simply came back signed out. Now the app catches
it, says what happened and what to do, and `#/kiruu` shows it as a red line.

**What still needs your account (cannot be checked from outside):**
1. Google Cloud Console → *OAuth consent screen*: if it says **Testing**,
   only listed test users can sign in. Press **Publish app** (or add each
   member's Gmail as a test user).
2. Supabase → Authentication → *URL Configuration*: **Site URL**
   `https://tdjamaat.vercel.app`; **Redirect URLs** include
   `https://tdjamaat.vercel.app/**`.
3. Try it on the phone in **Safari or Chrome** (not inside another app), at
   `https://tdjamaat.vercel.app/#/kiruu` → "Google менен кирүү". The list
   shows exactly where it stops.
4. If you sign in with the same Gmail as the admin account, you get the admin
   account, not a member — that is expected (the admin is Нур by default).

## 2. Not live yet (on `nurmss-v3`)

| Commit | What |
|---|---|
| `13e37b4` | **Кыбла** compass (`#/qibla`, also on Менин күнүм and in the menu): bearing from Budapest/Debrecen or the phone's location, distance to Makkah, live dial with the phone's compass. The sun/moon in the header no longer cover text. |
| `d8293c8` | The admin **writes** in every house's conversation, marked "админ". Needs `supabase/admin-chat-2026-11.sql`. Tested on a local Postgres: captains still cannot write elsewhere or as someone else. |
| `0d02b2b` | Google return handled by the app; failed sign-ins are explained (see §1). |
| `dcbeb81` | **Тартип** on Менин күнүм: four weeks of practice as gold diamonds (zikr/salawat, tasbihat, Quran pages), current run and best run. Only what the phone already counts — nothing invented. Unit-tested. |
| `c88eed9` | Сезон → 4-week reports: the leader set large, the climber and the span beside it; a period with only one week no longer repeats one number in four columns. |
| `b9ed074` | This handover file. |
| `7155355` | **Куран → Өтүү**: from any reading page, go to any page (type a number or drag a slider 1–604, the surah name shows as you drag), a surah by name or number, an ayah (`2:255`), or a juz (1–30). Works in Барак, Мааниси and Мусхаф. |
| `1868a4a` | **Any week** of the season: tap the week name in the header (between ‹ and ›) and pick from the list with dates. |
| `edf6e29` | After-prayer tasbih: the three steps (Субханаллах 33 · Алхамдулиллах 33 · Аллаху акбар 34) are tappable, so you can go straight to the one you are on. Сезон → reports: any 4-week period from a list (when there are more than two). |
| `ff7bcdd` | Үйдүн сөзү: scrolled up to read older messages, a button takes you back to the newest and shows how many arrived meanwhile. |
| `363e575` | **Менин жыйынтыгым** (`#/house/me`, from Үйүм and from Менин күнүм): a signed-in member's own results — any week of the season (arrows, list, or tap the chart), the score against the plan, every practice with done / plan and how far past it, the season's path next to the house average, season numbers, and their own awards with the next ones in reach. Only awards that depend on the person alone are shown (a member's account can read only their own house). The profile sheet on the site uses the same readable rows instead of the cut-off columns. |

## 3. Manual steps (in this order)

1. Supabase SQL Editor → run `supabase/admin-chat-2026-11.sql` (safe to re-run;
   only changes one function; needs `house-chat-2026-11.sql`, which is
   already on the live database).
2. Check the two Google settings in §1.
3. Open the Vercel preview of `nurmss-v3`, look through it, then say
   "push to main".

Nothing was run against the production database and no production setting
was changed by me.

## 4. Tests

- Type check, lint, production build: pass.
- Unit tests: 193 pass (4 new for the practice calendar).
- End-to-end (mock Supabase, Playwright): member sign-in and results, house
  chat, news, app numbers → captain form, captain data entry with typo check,
  desk + keyboard, Тазалык (admin, inspector, captain), Жаттоо — 26 steps,
  all pass. Google sign-in simulated both ways (success; return in another
  browser).
- Page sweep: every route × admin / captain / member / visitor × light / dark
  × phone / desktop — no page errors, no horizontal overflow.

## 5. Future work (recommendations, not done)

- Share card for the Тартип run ("12 days in a row").
- Captain: one tap to remind members who have not opened the app this week.
- Season → people's ranking over the whole season as a chart.
- Push reminders at prayer times (needs a push service; today notifications
  work only while the app is open or in the background).
