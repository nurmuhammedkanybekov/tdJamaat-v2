// Page boundaries of the Madinah mushaf (King Fahd Complex, 604 pages), taken
// from the site's own text (public/quran/<surah>.json: each ayah's page and
// juz), so "I read juz 7" or "I read Yasin" turns into the right pages.

/** First page of each juz, 1–30. */
export const JUZ_START = [1, 22, 42, 62, 82, 102, 121, 142, 162, 182, 201, 222, 242, 262, 282, 302, 322, 342, 362, 382, 402, 422, 442, 462, 482, 502, 522, 542, 562, 582];

/** [first page, last page] of each surah, 1–114. */
export const SURAH_PAGES: Array<[number, number]> = [[1, 1], [2, 49], [50, 76], [77, 106], [106, 127], [128, 150], [151, 176], [177, 186], [187, 207], [208, 221], [221, 235], [235, 248], [249, 255], [255, 261], [262, 267], [267, 281], [282, 293], [293, 304], [305, 312], [312, 321], [322, 331], [332, 341], [342, 349], [350, 359], [359, 366], [367, 376], [377, 385], [385, 396], [396, 404], [404, 410], [411, 414], [415, 417], [418, 427], [428, 434], [434, 440], [440, 445], [446, 452], [453, 458], [458, 467], [467, 476], [477, 482], [483, 489], [489, 495], [496, 498], [499, 502], [502, 506], [507, 510], [511, 515], [515, 517], [518, 520], [520, 523], [523, 525], [526, 528], [528, 531], [531, 534], [534, 537], [537, 541], [542, 545], [545, 548], [549, 551], [551, 552], [553, 554], [554, 555], [556, 557], [558, 559], [560, 561], [562, 564], [564, 566], [566, 568], [568, 570], [570, 571], [572, 573], [574, 575], [575, 577], [577, 578], [578, 580], [580, 581], [582, 583], [583, 584], [585, 585], [586, 586], [587, 587], [587, 589], [589, 589], [590, 590], [591, 591], [591, 592], [592, 592], [593, 594], [594, 594], [595, 595], [595, 596], [596, 596], [596, 596], [597, 597], [597, 597], [598, 598], [598, 599], [599, 599], [599, 600], [600, 600], [600, 600], [601, 601], [601, 601], [601, 601], [602, 602], [602, 602], [602, 602], [603, 603], [603, 603], [603, 603], [604, 604], [604, 604], [604, 604]];

export const PAGES = 604;
export const clampPage = (p: number) => Math.min(PAGES, Math.max(1, Math.round(p) || 1));

/** The juz a page is in. */
export const juzOf = (page: number) => {
    let j = 1;
    for (let i = 0; i < 30; i++) if (JUZ_START[i] <= page) j = i + 1;
    return j;
};

/** [first, last] page of a juz. */
export const juzPages = (j: number): [number, number] => [JUZ_START[j - 1], j < 30 ? JUZ_START[j] - 1 : PAGES];

export const pageList = (from: number, to: number) => {
    const a = clampPage(Math.min(from, to)), b = clampPage(Math.max(from, to));
    return Array.from({ length: b - a + 1 }, (_, i) => a + i);
};

/** 1,2,3,5,7,8 → [[1,3],[5,5],[7,8]] */
export const toRanges = (pages: number[]): Array<[number, number]> => {
    const out: Array<[number, number]> = [];
    for (const p of [...new Set(pages)].sort((a, b) => a - b)) {
        const last = out[out.length - 1];
        if (last && p === last[1] + 1) last[1] = p; else out.push([p, p]);
    }
    return out;
};

/** Which juz are fully inside these pages. */
export const wholeJuz = (pages: number[]) => {
    const have = new Set(pages);
    return Array.from({ length: 30 }, (_, i) => i + 1).filter(j => { const [a, b] = juzPages(j); for (let p = a; p <= b; p++) if (!have.has(p)) return false; return true; });
};

/** The surah whose text a page starts with (the last one starting on or before it). */
export const surahAt = (page: number) => {
    let n = 1;
    for (let i = 0; i < 114; i++) if (SURAH_PAGES[i][0] <= page) n = i + 1;
    return n;
};
