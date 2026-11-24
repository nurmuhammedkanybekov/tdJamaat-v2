// The jamaat week's totals on this phone, kept fresh as counts change.
import { useEffect, useState } from 'react';
import { t } from '../i18n';
import { formatWeekRange } from '../utils/weekDates';
import { currentWeekTotals } from './practice';
import type { WeekTotals } from './practice';

export const useWeekTotals = (): WeekTotals => {
    const [totals, setTotals] = useState(currentWeekTotals);
    useEffect(() => {
        const on = () => setTotals(currentWeekTotals());
        window.addEventListener('tdjamaat-practice', on);
        window.addEventListener('focus', on);
        window.addEventListener('storage', on);
        return () => { window.removeEventListener('tdjamaat-practice', on); window.removeEventListener('focus', on); window.removeEventListener('storage', on); };
    }, []);
    return totals;
};

export const weekText = (w: WeekTotals) =>
    `${t('Менин аптам')} (${formatWeekRange(w.start, w.end)}):\n`
    + `СВТ (${t('салават')}): ${w.salawat}\n`
    + `ИСТГ (${t('истигфар, зикир')}): ${w.zikr}\n`
    + `ТСП (${t('тасбихат')}): ${w.tasbihat}\n`
    + `К-К (${t('Куран, бет')}): ${w.pages}`;

