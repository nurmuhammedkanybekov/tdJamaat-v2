import { t } from '../i18n';
// Hijri (Islamic) date from the browser's built-in Umm al-Qura calendar —
// no library, no network. Month names in Kyrgyz. The local date can differ
// by a day from moon sighting; this is the calculated calendar.
export const HIJRI_MONTHS = [
    t('Мухаррам'), t('Сафар'), t('Рабиул-аввал'), t('Рабиус-сани'), t('Жумадал-ула'), t('Жумадал-ахыр'),
    t('Ражаб'), t('Шаабан'), t('Рамазан'), t('Шаввал'), t('Зулкаада'), t('Зулхижжа')
];

export interface HijriDate { day: number; month: number; year: number }

export const toHijri = (date: Date): HijriDate | null => {
    try {
        const parts = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { day: 'numeric', month: 'numeric', year: 'numeric' }).formatToParts(date);
        const get = (it: string) => Number(parts.find(p => p.type === it)?.value);
        const h = { day: get('day'), month: get('month'), year: get('year') };
        return Number.isFinite(h.day) && Number.isFinite(h.month) && Number.isFinite(h.year) && h.month >= 1 && h.month <= 12 ? h : null;
    } catch {
        return null;
    }
};

export const formatHijri = (h: HijriDate) => `${h.day} ${HIJRI_MONTHS[h.month - 1]} ${h.year}`;

export const isRamadan = (h: HijriDate | null) => h?.month === 9;
