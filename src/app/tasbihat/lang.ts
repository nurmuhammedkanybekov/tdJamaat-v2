// The tasbihat in Russian and English: the source («Санарип таспихат») is in
// Kyrgyz. What is read aloud stays exactly as the source writes it (in its
// Cyrillic letters, or spelled in Latin letters letter by letter, or the
// verified Arabic); the directions, headings and titles around it are
// translated here. The meanings of the duas are the source's own Kyrgyz and
// are shown as they are.
import { getLang } from '../../i18n';

type Tr = { ru: string; en: string };
const TR: Record<string, Tr> = {
    // titles
    'Багымдат намазы': { ru: 'Намаз фаджр', en: 'Fajr prayer' },
    'Бешим намазы': { ru: 'Намаз зухр', en: 'Dhuhr prayer' },
    'Аср намазы': { ru: 'Намаз аср', en: 'Asr prayer' },
    'Шам намазы': { ru: 'Намаз магриб', en: 'Maghrib prayer' },
    'Куптан намазы': { ru: 'Намаз иша', en: 'Isha prayer' },
    'Ан-Наария салаваты': { ru: 'Салават «ан-Нариййа»', en: 'The Nariyya salawat' },
    // headings
    'ИСТИАЗА ДУБАЛАРЫ': { ru: 'ДУА ИСТИАЗА', en: 'DUAS OF ISTI‘ADHA' },
    'ТАРЖУМАНИ ИСМИ АЗАМ': { ru: 'ТАРДЖУМАН ИСМ-И А‘ЗАМ', en: 'TARJUMAN ISM-I A‘ZAM' },
    'НАМАЗДЫН ТАСБИХТЕРИ': { ru: 'ТАСБИХИ ПОСЛЕ НАМАЗА', en: 'TASBIHS AFTER THE PRAYER' },
    '«ХАШР» СҮРӨСҮ': { ru: 'СУРА «АЛЬ-ХАШР»', en: 'SURAH AL-HASHR' },
    'ТАСБИХАТ УЛАНТЫЛАТ': { ru: 'ПРОДОЛЖЕНИЕ ТАСБИХАТА', en: 'THE TASBIHAT CONTINUES' },
    '«НАБАА» СҮРӨСҮ': { ru: 'СУРА «АН-НАБА»', en: 'SURAH AN-NABA' },
    '«ФАТХ» СҮРӨСҮ': { ru: 'СУРА «АЛЬ-ФАТХ»', en: 'SURAH AL-FATH' },
    '«БАКАРА» СҮРӨСҮ': { ru: 'СУРА «АЛЬ-БАКАРА»', en: 'SURAH AL-BAQARAH' },
    'СОЛААТАН ТУНЖИНА': { ru: 'САЛЯТАН ТУНДЖИНА', en: 'SALATAN TUNJINA' },
    'САЛААТУ-САЛАМ': { ru: 'САЛЯТ И САЛЯМ', en: 'SALAT AND SALAM' },
    'колдор көтөрүлүп, алакан төмөн каратылат:': { ru: 'руки поднимают ладонями вниз:', en: 'raise the hands, palms facing down:' },
    // lead-in lines
    'Багымдат намаздын парзы окулуп, салам берилгенден кийин:': { ru: 'После фарза намаза фаджр, когда сделан салам:', en: 'After the fard of Fajr, once the salam has been given:' },
    'Бешим намаздын парзы окулуп, салам берилгенден кийин:': { ru: 'После фарза намаза зухр, когда сделан салам:', en: 'After the fard of Dhuhr, once the salam has been given:' },
    'Бешим намаздын сүннөтү окулуп, салам берилгенден кийин:': { ru: 'После сунны намаза зухр, когда сделан салам:', en: 'After the sunnah of Dhuhr, once the salam has been given:' },
    'Аср намаздын парзы окулуп, салам берилгенден кийин:': { ru: 'После фарза намаза аср, когда сделан салам:', en: 'After the fard of Asr, once the salam has been given:' },
    'Шам намаздын парзы окулуп, салам берилгенден кийин:': { ru: 'После фарза намаза магриб, когда сделан салам:', en: 'After the fard of Maghrib, once the salam has been given:' },
    'Шам намаздын сүннөтү окулуп, салам берилгенден кийин:': { ru: 'После сунны намаза магриб, когда сделан салам:', en: 'After the sunnah of Maghrib, once the salam has been given:' },
    'Куптан намаздын парзы окулуп, салам берилгенден кийин:': { ru: 'После фарза намаза иша, когда сделан салам:', en: 'After the fard of Isha, once the salam has been given:' },
    'Намаз тасбихтери айтылат:': { ru: 'Читаются тасбихи после намаза:', en: 'The tasbihs after the prayer are recited:' },
    'Тасбихаттагы салаату-саламдар окулат:': { ru: 'Читаются салаваты тасбихата:', en: 'The salawat of the tasbihat are recited:' },
    '"Таржумани исми азам" дубасы окулат:': { ru: 'Читается дуа «Тарджуман исм-и а‘зам»:', en: 'The dua "Tarjuman ism-i a‘zam" is recited:' },
    'Бул дубадан кийин тасбихат улантылат:': { ru: 'После этого дуа тасбихат продолжается:', en: 'After this dua the tasbihat continues:' },
    // directions (they follow the words they refer to)
    'деп айтылат.': { ru: '— читается.', en: '— is recited.' },
    'Анан колдор көтөрүлүп, алакандар жайылып "Солаатан тунжина" дубасы айтылат:': { ru: 'Затем руки поднимают, раскрыв ладони, и читают дуа «Салятан тунджина»:', en: 'Then the hands are raised, palms open, and the dua "Salatan tunjina" is recited:' },
    '("аафаат" деп айтып жатканда алакан төмөн, бүткөндө өйдө каратылат.)': { ru: '(при словах «аафаат» ладони обращены вниз, затем снова вверх.)', en: '(at the word "aafaat" the palms face down, then up again.)' },
    'деп алакандар бетке сүртүлөт.': { ru: '— и ладонями проводят по лицу.', en: '— and the palms are passed over the face.' },
    '(1 жолу),': { ru: '(1 раз),', en: '(once),' },
    '(1 жолу)': { ru: '(1 раз)', en: '(once)' },
    '(10 жолу окулуп, 10-нун аягында)': { ru: '(читается 10 раз, а в конце десятого)', en: '(recited 10 times, and at the end of the tenth)' },
    '(кошулат).': { ru: '(добавляется).', en: '(is added).' },
    '(3, 5 же 7 жолу окулат).': { ru: '(читается 3, 5 или 7 раз).', en: '(recited 3, 5 or 7 times).' },
    '(ушул жерде алакандар жогору каратылат)': { ru: '(здесь ладони обращают вверх)', en: '(here the palms are turned upward)' },
    '(бул 3 жолу айтылат)': { ru: '(читается 3 раза)', en: '(recited 3 times)' },
    '(Алакандар бетке сүрүлөт.)': { ru: '(Ладонями проводят по лицу.)', en: '(The palms are passed over the face.)' },
    'деп айтылат жана «Аятал Курси» окулат:': { ru: '— читается, затем читают «Аят аль-Курси»:', en: '— is recited, followed by Ayat al-Kursi:' },
    '(33 жолу),': { ru: '(33 раза),', en: '(33 times),' },
    'деп айтылып дуба кылынат.': { ru: '— читается, затем делают дуа.', en: '— is recited, and then a dua is made.' },
    '(33 жолу окулат. Каалагандар багымдат жана куптан намаздардан кийин 100 жолу окуса болот.)': { ru: '(читается 33 раза. После фаджра и иша по желанию можно читать 100 раз.)', en: '(recited 33 times. After Fajr and Isha it may be recited 100 times if one wishes.)' },
    '(Алакандар өйдө каратылат.)': { ru: '(Ладони обращены вверх.)', en: '(The palms face upward.)' },
    '«Хашр» сүрөсүнүн 20-24 аяттары окулат:': { ru: 'Читаются аяты 20–24 суры «Аль-Хашр»:', en: 'Ayahs 20–24 of Surah al-Hashr are recited:' },
    '(бул жерге чейин 1 жолу окулат)': { ru: '(до этого места — 1 раз)', en: '(once, up to this point)' },
    '(Багымдат намазда гана 10 жолу окулат.)': { ru: '(Только после фаджра — 10 раз.)', en: '(After Fajr only: 10 times.)' },
    '(Алакандар төмөн каратылат.)': { ru: '(Ладони обращены вниз.)', en: '(The palms face downward.)' },
    '(Алакандар кайра өйдө каратылат.)': { ru: '(Ладони снова обращают вверх.)', en: '(The palms are turned upward again.)' },
    '«Фатх» сүрөсүнүн акыркы аяттары окулат:': { ru: 'Читаются последние аяты суры «Аль-Фатх»:', en: 'The last ayahs of Surah al-Fath are recited:' },
    '«Бакара» сүрөсүнүн акыркы 285-286 аяттары окулат:': { ru: 'Читаются последние аяты суры «Аль-Бакара» (285–286):', en: 'The last two ayahs of Surah al-Baqarah (285–286) are recited:' },
    '«Набаа» сүрөсүнүн аяттары окулуп, тасбихат бүтүрүлөт:': { ru: 'Тасбихат завершают чтением аятов суры «Ан-Наба»:', en: 'The tasbihat ends with ayahs of Surah an-Naba:' }
};

/** A direction, heading or title in the site's language (the source's Kyrgyz otherwise). */
export const local = (text: string): string => {
    const lang = getLang();
    if (lang === 'ky') return text;
    const hit = TR[text] ?? TR[text.trim()];
    if (!hit) return text;
    // keep the line breaks around the source text
    const lead = text.match(/^\s*/)?.[0] ?? '', tail = text.match(/\s*$/)?.[0] ?? '';
    return lead + hit[lang] + tail;
};

// Kyrgyz Cyrillic → Latin letters, one letter at a time (for readers who do
// not read Cyrillic). Nothing is added or changed but the letters.
const LAT: Record<string, string> = {
    а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'j', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', ң: 'ng',
    о: 'o', ө: 'ö', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ү: 'ü', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sh', ъ: "'", ы: 'ı',
    ь: '', э: 'e', ю: 'yu', я: 'ya'
};
export const toLatin = (text: string) => text.replace(/[а-яёңөүА-ЯЁҢӨҮ]/g, ch => {
    const low = ch.toLowerCase();
    const lat = LAT[low] ?? ch;
    return ch === low ? lat : lat.charAt(0).toUpperCase() + lat.slice(1);
});
