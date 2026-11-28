# The Quran text and translations

- **Text:** the Madinah mushaf, Hafs narration, as published by the King Fahd
  Complex for the Printing of the Holy Quran ("QPC Hafs" text), fetched from
  the quran.com API (`text_qpc_hafs`). It is stored exactly as received —
  never edit these files by hand.
- **Typeface:** `public/fonts/UthmanicHafs1Ver18.woff2`, the Complex's own
  typeface for this text (from the quran.com open-source project).
- **Checked:** 114 surahs, 6236 verses, 604 pages, 14 places of sajda; every
  verse key also exists in the Tanzil text.
- **Translations** (`ky/`, `en/`), from QuranEnc.com (`/api/v1/translation/sura/…`),
  stored exactly as received, one file per surah, checked against the verse
  count of every surah:
  - `ky/` — Kyrgyz, Shamsuddin Hakimov Abdulkhaliq, under the supervision of
    the Rowwad Translation Center (`kyrgyz_hakimov`, v1.0.2).
  - `en/` — English, Saheeh International (`english_saheeh`).
- **Russian translation** (`ru/`), Elmir Kuliev, from the quran.com API
  (`/api/v4/quran/translations/45?chapter_number=…`), stored exactly as
  received, checked against the verse count of every surah (6236).
  QuranEnc asks that translations be shown unchanged and with their source.

`index.json` — one entry per surah: number, Arabic name, name in Latin
letters, verse count, place of revelation, first page, first juz, whether it
opens with the basmala.
`<n>.json` — the verses of surah n: `[text, page, juz, sajda]`.
`juz.json` — where each of the 30 juz begins: `[surah, ayah]` (derived from
the verse files).
`ky/<n>.json`, `en/<n>.json`, `ru/<n>.json` — `[translation, footnotes?]` per verse.
