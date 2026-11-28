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
    'Багымдат намазы': { ru: 'Фаджр-намаз', en: 'Fajr prayer' },
    'Бешим намазы': { ru: 'Зухр-намаз', en: 'Dhuhr prayer' },
    'Аср намазы': { ru: 'Аср-намаз', en: 'Asr prayer' },
    'Шам намазы': { ru: 'Магриб-намаз', en: 'Maghrib prayer' },
    'Куптан намазы': { ru: 'Иша-намаз', en: 'Isha prayer' },
    'Ан-Наария салаваты': { ru: 'Салават ан-Нариййа', en: 'The Naariyya salawat' },
    // headings
    'ИСТИАЗА ДУБАЛАРЫ': { ru: 'ДУА ИСТИАЗА', en: 'DUAS OF SEEKING REFUGE' },
    'ТАРЖУМАНИ ИСМИ АЗАМ': { ru: 'ТАРДЖУМАН ИСМ-И АЗАМ', en: 'TARJUMAN ISM-I AZAM' },
    'НАМАЗДЫН ТАСБИХТЕРИ': { ru: 'ТАСБИХИ ПОСЛЕ НАМАЗА', en: 'THE TASBIHS OF THE PRAYER' },
    '«ХАШР» СҮРӨСҮ': { ru: 'СУРА «АЛЬ-ХАШР»', en: 'SURAH AL-HASHR' },
    'ТАСБИХАТ УЛАНТЫЛАТ': { ru: 'ТАСБИХАТ ПРОДОЛЖАЕТСЯ', en: 'THE TASBIHAT CONTINUES' },
    '«НАБАА» СҮРӨСҮ': { ru: 'СУРА «АН-НАБА»', en: 'SURAH AN-NABA' },
    '«ФАТХ» СҮРӨСҮ': { ru: 'СУРА «АЛЬ-ФАТХ»', en: 'SURAH AL-FATH' },
    '«БАКАРА» СҮРӨСҮ': { ru: 'СУРА «АЛЬ-БАКАРА»', en: 'SURAH AL-BAQARAH' },
    'СОЛААТАН ТУНЖИНА': { ru: 'САЛЯТАН ТУНДЖИНА', en: 'SALATAN TUNJINA' },
    'САЛААТУ-САЛАМ': { ru: 'САЛЯТУ-САЛЯМ', en: 'SALATU-SALAM' },
    'колдор көтөрүлүп, алакан төмөн каратылат:': { ru: 'руки поднимают, ладонями вниз:', en: 'the hands are raised, palms facing down:' },
    // lead-in lines
    'Багымдат намаздын парзы окулуп, салам берилгенден кийин:': { ru: 'После фарда фаджр-намаза, когда дан салам:', en: 'After the fard of Fajr, once the salam is given:' },
    'Бешим намаздын парзы окулуп, салам берилгенден кийин:': { ru: 'После фарда зухр-намаза, когда дан салам:', en: 'After the fard of Dhuhr, once the salam is given:' },
    'Бешим намаздын сүннөтү окулуп, салам берилгенден кийин:': { ru: 'После сунны зухр-намаза, когда дан салам:', en: 'After the sunnah of Dhuhr, once the salam is given:' },
    'Аср намаздын парзы окулуп, салам берилгенден кийин:': { ru: 'После фарда аср-намаза, когда дан салам:', en: 'After the fard of Asr, once the salam is given:' },
    'Шам намаздын парзы окулуп, салам берилгенден кийин:': { ru: 'После фарда магриб-намаза, когда дан салам:', en: 'After the fard of Maghrib, once the salam is given:' },
    'Шам намаздын сүннөтү окулуп, салам берилгенден кийин:': { ru: 'После сунны магриб-намаза, когда дан салам:', en: 'After the sunnah of Maghrib, once the salam is given:' },
    'Куптан намаздын парзы окулуп, салам берилгенден кийин:': { ru: 'После фарда иша-намаза, когда дан салам:', en: 'After the fard of Isha, once the salam is given:' },
    'Намаз тасбихтери айтылат:': { ru: 'Произносятся тасбихи намаза:', en: 'The tasbihs of the prayer are said:' },
    'Тасбихаттагы салаату-саламдар окулат:': { ru: 'Читаются салаваты тасбихата:', en: 'The salawat of the tasbihat are read:' },
    '"Таржумани исми азам" дубасы окулат:': { ru: 'Читается дуа «Тарджуман исм-и азам»:', en: 'The dua "Tarjuman ism-i azam" is read:' },
    'Бул дубадан кийин тасбихат улантылат:': { ru: 'После этого дуа тасбихат продолжается:', en: 'After this dua the tasbihat continues:' },
    // directions
    'деп айтылат.': { ru: '— так говорят.', en: '— is said.' },
    'Анан колдор көтөрүлүп, алакандар жайылып "Солаатан тунжина" дубасы айтылат:': { ru: 'Затем поднимают руки, раскрыв ладони, и читают дуа «Салятан тунджина»:', en: 'Then the hands are raised, palms open, and the dua "Salatan tunjina" is said:' },
    '("аафаат" деп айтып жатканда алакан төмөн, бүткөндө өйдө каратылат.)': { ru: '(на словах «аафаат» ладони обращены вниз, после — вверх.)', en: '(while saying "aafaat" the palms face down, and up once it is said.)' },
    'деп алакандар бетке сүртүлөт.': { ru: '— и проводят ладонями по лицу.', en: '— and the palms are passed over the face.' },
    '(1 жолу),': { ru: '(1 раз),', en: '(once),' },
    '(1 жолу)': { ru: '(1 раз)', en: '(once)' },
    '(10 жолу окулуп, 10-нун аягында)': { ru: '(читается 10 раз, в конце десятого)', en: '(read 10 times, at the end of the tenth)' },
    '(кошулат).': { ru: '(добавляется).', en: '(is added).' },
    '(3, 5 же 7 жолу окулат).': { ru: '(читается 3, 5 или 7 раз).', en: '(read 3, 5 or 7 times).' },
    '(ушул жерде алакандар жогору каратылат)': { ru: '(здесь ладони обращают вверх)', en: '(here the palms are turned up)' },
    '(бул 3 жолу айтылат)': { ru: '(говорится 3 раза)', en: '(said 3 times)' },
    '(Алакандар бетке сүрүлөт.)': { ru: '(Ладонями проводят по лицу.)', en: '(The palms are passed over the face.)' },
    'деп айтылат жана «Аятал Курси» окулат:': { ru: '— так говорят и читают «Аят аль-Курси»:', en: '— is said, and Ayat al-Kursi is read:' },
    '(33 жолу),': { ru: '(33 раза),', en: '(33 times),' },
    'деп айтылып дуба кылынат.': { ru: '— так говорят и делают дуа.', en: '— is said, and a dua is made.' },
    '(33 жолу окулат. Каалагандар багымдат жана куптан намаздардан кийин 100 жолу окуса болот.)': { ru: '(читается 33 раза. Желающие могут после фаджра и иша читать 100 раз.)', en: '(read 33 times. Whoever wishes may read it 100 times after Fajr and Isha.)' },
    '(Алакандар өйдө каратылат.)': { ru: '(Ладони обращены вверх.)', en: '(The palms face up.)' },
    '«Хашр» сүрөсүнүн 20-24 аяттары окулат:': { ru: 'Читаются аяты 20–24 суры «Аль-Хашр»:', en: 'Ayahs 20–24 of Surah al-Hashr are read:' },
    '(бул жерге чейин 1 жолу окулат)': { ru: '(до этого места читается 1 раз)', en: '(read once up to here)' },
    '(Багымдат намазда гана 10 жолу окулат.)': { ru: '(Только после фаджра читается 10 раз.)', en: '(Read 10 times after Fajr only.)' },
    '(Алакандар төмөн каратылат.)': { ru: '(Ладони обращены вниз.)', en: '(The palms face down.)' },
    '(Алакандар кайра өйдө каратылат.)': { ru: '(Ладони снова обращают вверх.)', en: '(The palms are turned up again.)' },
    '«Фатх» сүрөсүнүн акыркы аяттары окулат:': { ru: 'Читаются последние аяты суры «Аль-Фатх»:', en: 'The last ayahs of Surah al-Fath are read:' },
    '«Бакара» сүрөсүнүн акыркы 285-286 аяттары окулат:': { ru: 'Читаются последние аяты 285–286 суры «Аль-Бакара»:', en: 'The last ayahs, 285–286, of Surah al-Baqarah are read:' },
    '«Набаа» сүрөсүнүн аяттары окулуп, тасбихат бүтүрүлөт:': { ru: 'Читаются аяты суры «Ан-Наба», и тасбихат завершается:', en: 'Ayahs of Surah an-Naba are read, and the tasbihat ends:' }
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
