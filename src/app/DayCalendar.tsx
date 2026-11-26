// Four weeks of practice, one diamond per day: the more kinds of practice
// kept that day (zikr/salawat, tasbihat, Quran pages), the fuller the gold.
// The run of kept days and the best run sit beside it.
import React, { useMemo } from 'react';
import { isEnglish, t } from '../i18n';
import { loadZikr } from '../utils/zikr';
import { loadPractice } from './practice';
import { bestRun, currentRun, lastMarks } from './consistency';

const WEEKDAYS_KY = ['Дш', 'Шш', 'Шр', 'Бш', 'Жм', 'Иш', 'Жк'];
const WEEKDAYS_EN = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

export const DayCalendar: React.FC<{ now: Date }> = ({ now }) => {
    const { marks, run, best } = useMemo(() => {
        const zikr = loadZikr(), practice = loadPractice();
        // 4 full weeks, Monday-first, ending with the week of today.
        const offset = (now.getDay() + 6) % 7; // 0 = Monday
        const n = 21 + offset + 1;
        return { marks: lastMarks(zikr, practice, n, now), run: currentRun(zikr, practice, now), best: bestRun(zikr, practice) };
    }, [now]);
    const kept = marks.filter(m => m.level > 0).length;
    const names = isEnglish() ? WEEKDAYS_EN : WEEKDAYS_KY;
    const todayKey = marks[marks.length - 1]?.key;
    return (
        <div className="daycal">
            <div className="daycal-figures">
                <div>
                    <div className="font-display tabular leading-none daycal-run" style={{ color: run > 0 ? 'var(--gold)' : 'var(--text-muted)' }}>{run}</div>
                    <div className="eyebrow mt-2">{t('күн катары менен')}</div>
                </div>
                <div className="daycal-side">
                    <span><b className="font-display tabular">{best}</b> {t('эң узун катар')}</span>
                    <span><b className="font-display tabular">{kept}</b> / {marks.length} {t('күн')}</span>
                </div>
            </div>
            <div className="daycal-grid" role="img" aria-label={t('Акыркы {0} күндүн {1} күнүндө практика болду', marks.length, kept)}>
                {names.map(d => <span key={d} className="daycal-head">{d}</span>)}
                {marks.map(m => (
                    <span key={m.key} className={`daycal-day lv-${m.level} ${m.key === todayKey ? 'is-today' : ''}`}
                        title={`${m.date.toLocaleDateString(isEnglish() ? 'en-GB' : 'ru-RU', { day: 'numeric', month: 'short' })} · ${t('зикир {0} · тасбихат {1} · бет {2}', m.zikr, m.tasbihat, m.pages)}`}>
                        <i />
                    </span>
                ))}
            </div>
            <div className="daycal-legend">
                <span><i className="lv-1" />{t('бир түрү')}</span>
                <span><i className="lv-2" />{t('эки түрү')}</span>
                <span><i className="lv-3" />{t('зикир, тасбихат жана Куран')}</span>
            </div>
        </div>
    );
};
