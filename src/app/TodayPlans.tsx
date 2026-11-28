// "Бүгүнкү пландар" on My Day: today's fast and tasks from the calendar,
// ticked right here, with a line to add one and the way to the calendar.
import React, { useEffect, useMemo, useState } from 'react';
import { Check, ChevronRight, Plus } from 'lucide-react';
import { t } from '../i18n';
import { go } from './route';
import { addTask, fastOn, isDone, leftOver, loadCalendar, saveCalendar, tasksOn, toggleTask } from './fasting';
import type { CalendarStore } from './fasting';
import { hijriOf, sunnahFast } from '../utils/islamicCalendar';

const KIND: Record<string, () => string> = { ramadan: () => t('Рамазан орозосу'), sunnah: () => t('Сүннөт орозо'), nafl: () => t('Нафил орозо'), qaza: () => t('Каза орозо') };

export const TodayPlans: React.FC<{ now: Date }> = ({ now }) => {
    const [store, setStore] = useState(loadCalendar);
    useEffect(() => {
        const on = () => setStore(loadCalendar());
        window.addEventListener('tdjamaat-calendar', on); window.addEventListener('tdjamaat-cloud', on);
        return () => { window.removeEventListener('tdjamaat-calendar', on); window.removeEventListener('tdjamaat-cloud', on); };
    }, []);
    const day = useMemo(() => { const d = new Date(now); d.setHours(12, 0, 0, 0); return d; }, [now]);
    const save = (fn: (s: CalendarStore) => CalendarStore) => { const next = fn(loadCalendar()); saveCalendar(next); setStore(next); };
    const tasks = tasksOn(store, day);
    const fast = fastOn(store, day);
    const sunnah = sunnahFast(day, hijriOf(day, store.offset));
    const left = leftOver(store, day).length;
    const [text, setText] = useState('');
    const done = tasks.filter(x => isDone(x, day)).length;

    return (
        <div className="today-plans">
            {(fast || sunnah) && (
                <button className="today-fast" onClick={() => go('#/calendar')}>
                    <i data-state={fast?.s} aria-hidden="true" />
                    <span>{fast ? `${KIND[fast.k]()} · ${fast.s === 'kept' ? t('кармалды') : fast.s === 'missed' ? t('кармалган жок') : t('ниет')}` : t('Бүгүн орозо кармоо сүннөт: {0}', sunnah)}</span>
                </button>
            )}
            {tasks.length > 0 && (
                <ul className="cal-tasks">
                    {tasks.map(x => {
                        const d = isDone(x, day);
                        return (
                            <li key={x.id} className="cal-task-row" data-done={d || undefined}>
                                <button className="cal-check" onClick={() => save(s => toggleTask(s, x.id, day))} aria-pressed={d} aria-label={d ? t('Аткарылды; кайра ачуу') : t('Аткарылды деп белгилөө')}>
                                    <i aria-hidden="true">{d && <Check className="w-3 h-3" strokeWidth={3} />}</i>
                                </button>
                                <span className="cal-task-text" style={{ cursor: 'default' }}>{x.text}</span>
                            </li>
                        );
                    })}
                </ul>
            )}
            <form className="cal-add" onSubmit={e => { e.preventDefault(); if (text.trim()) { save(s => addTask(s, day, text)); setText(''); } }}>
                <span className="cal-add-mark" aria-hidden="true"><Plus className="w-4 h-4" /></span>
                <input value={text} onChange={e => setText(e.target.value)} maxLength={300} placeholder={tasks.length ? t('Дагы бир иш…') : t('Бүгүн эмне кыласыз? Мис. 1 пара Куран')} aria-label={t('Жаңы иш')} />
            </form>
            <button className="today-plans-more" onClick={() => go('#/calendar')}>
                <span>{tasks.length ? t('Бүгүн {0} / {1} аткарылды', done, tasks.length) : t('Календарь: орозо, пландар, майрамдар')}{left > 0 ? ` · ${t('мурунку күндөрдөн {0}', left)}` : ''}</span>
                <ChevronRight className="w-4 h-4" />
            </button>
        </div>
    );
};
