# The Quran text

- **Text:** the Madinah mushaf, Hafs narration, as published by the King Fahd
  Complex for the Printing of the Holy Quran ("QPC Hafs" text), fetched from
  the quran.com API (`text_qpc_hafs`). It is stored exactly as received —
  never edit these files by hand.
- **Typeface:** `public/fonts/UthmanicHafs1Ver18.woff2`, the Complex's own
  typeface for this text (from the quran.com open-source project).
- **Checked:** 114 surahs, 6236 verses, 604 pages, 14 places of sajda; every
  verse key also exists in the Tanzil text.

`index.json` — one entry per surah: number, Arabic name, name in Latin
letters, verse count, place of revelation, first page, first juz, whether it
opens with the basmala.
`<n>.json` — the verses of surah n: `[text, page, juz, sajda]`.
