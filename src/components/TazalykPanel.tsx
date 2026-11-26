// Тазалык: rating the houses' cleanliness for a week. Used by the inspector
// (every house — it is their whole screen), by a captain (their own house)
// and by the admin (every house). Each checklist item gets 0–5; the house
// gets up to 25 points in the weeks the admin counts Тазалык in.
import React, { useEffect, useMemo, useState } from 'react';
import { Check, Loader2, Lock, Sparkles } from 'lucide-react';
import { fetchTazalykBoard, saveTazalyk } from '../services/dataService';
import type { TazalykBoard } from '../services/dataService';
import { ITEM_MAX, TAZALYK_MAX, normalizeScores, tazalykPoints } from '../utils/tazalyk';
import type { TazalykScores } from '../utils/tazalyk';
import { formatWeekRange } from '../utils/weekDates';
import { t } from '../i18n';

const WHO: Record<string, string> = { inspector: t('Тазалык текшерүүчү'), leader: t('Капитан'), admin: t('Админ') };

/** The week's place in its season ("5-апта"), the way the rest of the site numbers weeks. */
const seasonWeekOf = (board: TazalykBoard, week: number) => {
    const season = [...board.seasons].sort((a, b) => b.firstWeek - a.firstWeek).find(s => week >= s.firstWeek && (s.lastWeek === null || week <= s.lastWeek));
    return season ? week - season.firstWeek + 1 : week;
};

// One item: six small squares, 0 … 5 (a tap sets the rating).
const Rating: React.FC<{ value: number | undefined; onChange: (v: number) => void; disabled: boolean; label: string }> = ({ value, onChange, disabled, label }) => (
    <div className="flex items-center gap-1" role="radiogroup" aria-label={label}>
        {Array.from({ length: ITEM_MAX + 1 }).map((_, v) => {
            const on = value === v;
            return (
                <button
                    key={v}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    aria-label={`${label}: ${v}`}
                    disabled={disabled}
                    onClick={() => onChange(v)}
                    className="taz-cell"
                    data-on={on || undefined}
                    data-filled={value !== undefined && v <= value && v > 0 ? true : undefined}
                >{v}</button>
            );
        })}
    </div>
);

const HouseRow: React.FC<{
    board: TazalykBoard; houseId: string; week: number; locked: boolean; canEdit: boolean; onSaved: () => void;
}> = ({ board, houseId, week, locked, canEdit, onSaved }) => {
    const house = board.houses.find(h => h.id === houseId)!;
    const saved = board.rows.find(r => r.house_id === houseId && r.week_number === week);
    const savedScores = useMemo(() => normalizeScores(saved?.scores, board.items), [saved, board.items]);
    const [scores, setScores] = useState<TazalykScores>(savedScores);
    const [note, setNote] = useState(saved?.note ?? '');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [done, setDone] = useState(false);
    // Fresh numbers from the database replace the form; "saved" stays until
    // something is changed again (the label shows it only while nothing is).
    useEffect(() => { setScores(savedScores); setNote(saved?.note ?? ''); setError(null); }, [savedScores, saved]);
    useEffect(() => { setDone(false); }, [week]);

    const dirty = JSON.stringify(scores) !== JSON.stringify(savedScores) || (note.trim() || '') !== (saved?.note ?? '');
    const total = tazalykPoints(scores, board.items);
    const rated = board.items.filter(i => scores[i] !== undefined).length;
    const editable = canEdit && !locked;

    const save = async () => {
        setBusy(true); setError(null);
        try { await saveTazalyk(houseId, week, scores, note); setDone(true); onSaved(); }
        catch (e) { setError(e instanceof Error ? e.message : String(e)); }
        finally { setBusy(false); }
    };

    return (
        <section className="taz-house">
            <header className="flex items-end justify-between gap-4">
                <div className="min-w-0">
                    <h3 className="font-display text-[1.6rem] leading-tight truncate" style={{ color: 'var(--text-primary)' }}>{house.name}</h3>
                    <div className="text-[0.76rem] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {saved?.saved_by_role ? t('Баалаган: {0}', WHO[saved.saved_by_role] ?? saved.saved_by_role) : t('Бааланган жок')}
                        {rated > 0 && rated < board.items.length && <> · {t('{0} / {1} пункт', rated, board.items.length)}</>}
                    </div>
                </div>
                <div className="text-right flex-shrink-0">
                    <span className="font-display text-[2.4rem] leading-none tabular" style={{ color: rated ? 'var(--gold)' : 'var(--text-muted)' }}>{rated ? total : '—'}</span>
                    <span className="text-[0.85rem] tabular" style={{ color: 'var(--text-muted)' }}> / {TAZALYK_MAX}</span>
                </div>
            </header>
            <ul className="mt-3">
                {board.items.map(item => (
                    <li key={item} className="flex items-center justify-between gap-3 py-2.5" style={{ borderTop: '1px solid var(--border)' }}>
                        <span className="text-[0.95rem] min-w-0" style={{ color: 'var(--text-secondary)' }}>{item}</span>
                        <Rating value={scores[item]} disabled={!editable || busy} label={item} onChange={v => { setScores(s => ({ ...s, [item]: v })); setDone(false); }} />
                    </li>
                ))}
            </ul>
            {editable && (
                <div className="flex flex-wrap items-center gap-3 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
                    <input value={note} onChange={e => { setNote(e.target.value); setDone(false); }} maxLength={200} placeholder={t('Эскертүү (милдеттүү эмес)')} className="login-field flex-1 min-w-[12rem] px-3 py-2 text-[0.9rem]" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)' }} />
                    <button type="button" className="btn btn-primary" disabled={!dirty || busy} onClick={save}>
                        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : done && !dirty ? <Check className="w-4 h-4" /> : null}
                        {done && !dirty ? t('Сакталды') : t('Сактоо')}
                    </button>
                </div>
            )}
            {!editable && saved?.note && <p className="text-[0.85rem] italic pt-2" style={{ color: 'var(--text-muted)' }}>{saved.note}</p>}
            {error && <p role="alert" className="text-[0.85rem] mt-2 px-3 py-2" style={{ borderLeft: '2px solid var(--danger)', color: 'var(--danger)' }}>{error}</p>}
        </section>
    );
};

export const TazalykPanel: React.FC<{
    /** Only these houses (a captain: their own); all when omitted. */
    houseIds?: string[];
    /** May this session rate (the database checks it again). */
    canEdit: boolean;
    isAdmin: boolean;
    /** Called after a save (e.g. to refresh the results). */
    onSaved?: () => void;
}> = ({ houseIds, canEdit, isAdmin, onSaved }) => {
    const [board, setBoard] = useState<TazalykBoard | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [week, setWeek] = useState<number | null>(null);
    const load = () => fetchTazalykBoard().then(b => {
        setBoard(b);
        setWeek(w => w ?? (b.weeks.length ? b.weeks[b.weeks.length - 1].weekNumber : null));
    }).catch(e => setError(e instanceof Error ? e.message : String(e)));
    useEffect(() => { load(); }, []);

    if (error) return <p role="alert" className="px-5 py-8 text-center" style={{ color: 'var(--danger)' }}>{error}</p>;
    if (!board || week === null) return <div className="py-16 flex justify-center" aria-busy="true"><div className="skeleton h-1 w-24" /></div>;

    // The latest season's weeks, newest first.
    const latestSeason = [...board.seasons].sort((a, b) => b.firstWeek - a.firstWeek)[0];
    const weeks = board.weeks.filter(w => !latestSeason || w.weekNumber >= latestSeason.firstWeek).slice(-10).reverse();
    const current = board.weeks.find(w => w.weekNumber === week);
    const houses = board.houses.filter(h => !houseIds || houseIds.includes(h.id));

    return (
        <div>
            <div className="flex gap-1 overflow-x-auto scroll-row pb-1" role="tablist" aria-label={t('Апта')}>
                {weeks.map(w => (
                    <button key={w.weekNumber} role="tab" aria-selected={w.weekNumber === week} onClick={() => setWeek(w.weekNumber)} className={`chip flex-shrink-0 ${w.weekNumber === week ? 'is-active' : ''}`}>
                        {t('{0}-апта', seasonWeekOf(board, w.weekNumber))}{w.tazalyk && <Sparkles className="w-3 h-3 inline ml-1 -mt-0.5" aria-label={t('Тазалык эсептелет')} />}
                    </button>
                ))}
            </div>
            {current && (
                <p className="text-[0.85rem] mt-3 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                    {formatWeekRange(current.startDate, current.endDate) && <span className="tabular">{formatWeekRange(current.startDate, current.endDate)}. </span>}
                    {current.tazalyk
                        ? <span style={{ color: 'var(--gold)' }}>{t('Бул аптада Тазалык үй рейтингине кошулат (эң көп {0} упай).', TAZALYK_MAX)}</span>
                        : t('Бул аптада Тазалык азырынча рейтингге кошулбайт, админ күйгүзгөндө кошулат. Баалай берсеңиз болот.')}
                    {current.locked && <span className="inline-flex items-center gap-1 ml-1"><Lock className="w-3.5 h-3.5" />{isAdmin ? t('Апта кулпуланган (админ өзгөртө алат).') : t('Апта кулпуланган.')}</span>}
                </p>
            )}
            <div className="mt-5 space-y-9">
                {houses.map(h => (
                    <HouseRow key={`${h.id}-${week}`} board={board} houseId={h.id} week={week} locked={!!current?.locked && !isAdmin} canEdit={canEdit} onSaved={() => { load(); onSaved?.(); }} />
                ))}
            </div>
        </div>
    );
};
