// Hijri (Islamic) date from the browser's built-in Umm al-Qura calendar —
// no library, no network. Month names in Kyrgyz. The local date can differ
// by a day from moon sighting; this is the calculated calendar.
export const HIJRI_MONTHS = [
    'Мухаррам', 'Сафар', 'Рабиул-аввал', 'Рабиус-сани', 'Жумадал-ула', 'Жумадал-ахыр',
    'Ражаб', 'Шаабан', 'Рамазан', 'Шаввал', 'Зулкаада', 'Зулхижжа'
];

export interface HijriDate { day: number; month: number; year: number }

export const toHijri = (date: Date): HijriDate | null => {
    try {
        const parts = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { day: 'numeric', month: 'numeric', year: 'numeric' }).formatToParts(date);
        const get = (t: string) => Number(parts.find(p => p.type === t)?.value);
        const h = { day: get('day'), month: get('month'), year: get('year') };
        return Number.isFinite(h.day) && Number.isFinite(h.month) && Number.isFinite(h.year) && h.month >= 1 && h.month <= 12 ? h : null;
    } catch {
        return null;
    }
};

export const formatHijri = (h: HijriDate) => `${h.day} ${HIJRI_MONTHS[h.month - 1]} ${h.year}`;

export const isRamadan = (h: HijriDate | null) => h?.month === 9;
