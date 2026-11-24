// In the captain's form: what the members' app counted this jamaat week
// (Thursday → Wednesday), put into the form with one tap. A number is only
// raised, never lowered: a person may have counted more outside the app.
import React, { useEffect, useState } from 'react';
import { Check, Smartphone } from 'lucide-react';
import type { AppNumbers } from '../services/memberService';
import { fetchAppNumbers } from '../services/memberService';
import { formatWeekRange } from '../utils/weekDates';
import { t } from '../i18n';

export const AppNumbersBar: React.FC<{
    memberIds: string[];
    start: string | null | undefined;
    end: string | null | undefined;
    onApply: (numbers: Map<string, AppNumbers>) => number;
}> = ({ memberIds, start, end, onApply }) => {
    const [numbers, setNumbers] = useState<Map<string, AppNumbers> | null>(null);
    const [applied, setApplied] = useState<number | null>(null);
    const key = memberIds.join(',');
    useEffect(() => {
        setNumbers(null); setApplied(null);
        if (!start || !end || !key) return;
        let alive = true;
        fetchAppNumbers(key.split(','), start, end).then(n => { if (alive) setNumbers(n); }).catch(() => undefined);
        return () => { alive = false; };
    }, [key, start, end]);
    if (!numbers || numbers.size === 0) return null;
    return (
        <div className="mb-4 px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[0.9rem]" style={{ borderLeft: '2px solid var(--gold)', backgroundColor: 'var(--accent-soft)', color: 'var(--text-secondary)' }}>
            <Smartphone className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--gold)' }} />
            <span className="flex-1 min-w-[12rem]">
                {t('Колдонмодо {0} адамдын сандары бар ({1})', numbers.size, formatWeekRange(start ?? null, end ?? null))}
                <span className="block text-[0.78rem]" style={{ color: 'var(--text-muted)' }}>{t('СВТ, ИСТГ, ТСП, К-К. Формадагы сан кичине болсо гана алмашат.')}</span>
            </span>
            {applied === null
                ? <button type="button" className="btn btn-ghost" onClick={() => setApplied(onApply(numbers))}>{t('Формага коюу')}</button>
                : <span className="inline-flex items-center gap-1.5" style={{ color: 'var(--gold)' }}><Check className="w-4 h-4" />{t('{0} сан коюлду — текшерип, сактаңыз', applied)}</span>}
        </div>
    );
};
