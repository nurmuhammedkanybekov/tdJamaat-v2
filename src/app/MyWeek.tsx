// "My week": what this phone counted in the jamaat week (Thursday → Wednesday),
// in the captain's own terms — СВТ, ИСТГ, ТСП, Куран pages — with one tap to
// copy it into a message to the captain.
import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { t } from '../i18n';
import { formatWeekRange } from '../utils/weekDates';
import type { WeekTotals } from './practice';
import { weekText } from './useWeekTotals';

export const MyWeek: React.FC<{ totals: WeekTotals; synced?: boolean }> = ({ totals, synced }) => {
    const [copied, setCopied] = useState(false);
    const rows: Array<[string, string, number]> = [
        ['СВТ', t('Салават'), totals.salawat],
        ['ИСТГ', t('Истигфар, зикир'), totals.zikr],
        ['ТСП', t('Тасбихат'), totals.tasbihat],
        ['К-К', t('Куран (бет)'), totals.pages]
    ];
    const share = async () => {
        try { await navigator.clipboard.writeText(weekText(totals)); setCopied(true); window.setTimeout(() => setCopied(false), 2000); } catch { /* clipboard blocked */ }
    };
    return (
        <div>
            <ul>
                {rows.map(([code, name, value]) => (
                    <li key={code} className="flex items-baseline gap-3 py-2.5" style={{ borderBottom: '1px solid var(--border)' }}>
                        <span className="w-12 text-[0.78rem] font-semibold tracking-[0.08em]" style={{ color: 'var(--text-muted)' }}>{code}</span>
                        <span className="text-[0.95rem]" style={{ color: 'var(--text-secondary)' }}>{name}</span>
                        <span className="leader" />
                        <span className="font-display text-[1.45rem] tabular leading-none" style={{ color: value > 0 ? 'var(--text-primary)' : 'var(--text-muted)' }}>{value}</span>
                    </li>
                ))}
            </ul>
            <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
                <span className="text-[0.8rem]" style={{ color: 'var(--text-muted)' }}>{t('{0} · бейшембиден шаршембиге', formatWeekRange(totals.start, totals.end))}{synced && <><br />{t('Капитаныңыз бул сандарды өзү көрөт.')}</>}</span>
                <button className="btn btn-ghost" onClick={share}>{copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}{copied ? t('Көчүрүлдү') : t('Капитанга көчүрүү')}</button>
            </div>
        </div>
    );
};
