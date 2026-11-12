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
