# The tasbihat texts

- **Source:** «Санарип таспихат» — https://addua.vercel.app — the text the
  community already reads from: what is said after each of the five prayers,
  in Kyrgyz letters, with the directions (hands, how many times) and the
  meanings.
- **Kept as it stands there.** The files were produced by reading each page of
  the source and saving its words unchanged. Only the layout was converted:
  runs of spaces collapsed, picture emoji dropped, and the source's red text
  split into *directions* and *words set apart*. Do not edit the words here;
  if the source is corrected, regenerate.
- **Not included:** the source's audio recordings.

`<prayer>.json` — `{ id, title, blocks }`. A block is a heading
(`{ t: 'h', v }`) or a paragraph (`{ t: 'p', parts, c?, b?, m?, ar? }`), where
`parts` are `[kind, text]` pairs (see `index.ts`), `m` is the meaning in
Kyrgyz and `ar` the Arabic where the source gives it.

## The Arabic (`arabic.json`)

The "Арабча" view shows the Arabic only where a verified source exists, and
it is copied from that source by a script, never typed:

- Quran passages (Ayat al-Kursi, 33:56, and each tasbihat's closing surah
  passage) — from `public/quran/<n>.json`, the King Fahd Complex text.
- "Allahumma antas-salam…" — Hisn al-Muslim no. 66 (the published Arabic
  text of the book; Muslim, 591).

Each entry is matched to the paragraph whose Kyrgyz text begins with its
`prefix`. Everything else (Salaatan tunjina, the salawat, the Names, the
istiaza duas) is shown in Kyrgyz letters until a verified Arabic text of
the tasbihat is available; add it here the same way.
