// House names are always shown in Latin letters, in both languages (Nur, Oct
// 2026): they are Hungarian place and street names. A name stored in Latin
// is shown exactly as stored; one stored in Cyrillic is shown in its Latin
// spelling. The database keeps whatever was entered.

// Known names, with their Hungarian spelling (a letter-by-letter
// transliteration would give "Damyanich", "Debretsen").
const KNOWN: Record<string, string> = {
    'местер': 'Mester',
    'дамянич': 'Damjanich',
    'дамьянич': 'Damjanich',
    'дамжанич': 'Damjanich',
    'данянич': 'Damjanich',
    'паннония': 'Pannonia',
    'панония': 'Pannonia',
    'баксай': 'Baksai',
    'добози': 'Dobozy',
    'будапешт': 'Budapest',
    'дебрецен': 'Debrecen',
    'сегед': 'Szeged',
    'мишкольц': 'Miskolc',
    'печ': 'Pécs',
    'дьёр': 'Győr',
    'дьер': 'Győr'
};

const LETTERS: Record<string, string> = {
    а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'j', з: 'z', и: 'i', й: 'y',
    к: 'k', л: 'l', м: 'm', н: 'n', ң: 'ng', о: 'o', ө: 'ö', п: 'p', р: 'r', с: 's', т: 't',
    у: 'u', ү: 'ü', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch', ъ: '', ы: 'y', ь: '',
    э: 'e', ю: 'yu', я: 'ya'
};

const CYRILLIC = /[Ѐ-ӿ]/;

const transliterate = (word: string): string => {
    const known = KNOWN[word.toLowerCase()];
    if (known) return known;
    let out = '';
    for (const ch of word) {
        const lower = ch.toLowerCase();
        const latin = LETTERS[lower];
        if (latin === undefined) { out += ch; continue; }
        out += ch !== lower && latin ? latin[0].toUpperCase() + latin.slice(1) : latin;
    }
    return out;
};

/** The house name as people see it: always in Latin letters. */
export const houseDisplayName = (name: string): string => {
    if (!CYRILLIC.test(name)) return name;
    const whole = KNOWN[name.trim().toLowerCase()];
    if (whole) return whole;
    return name.replace(/[Ѐ-ӿ]+/g, transliterate);
};
