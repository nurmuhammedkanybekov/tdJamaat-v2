// Жаттоо (memorization): the captain's sheet for writing down what people
// recited, and the sections that show it — on a profile, a house page, the
// community page and the awards. No points; badges only.
import React, { useMemo, useState } from 'react';
import { Check, Loader2, Plus, Trash2 } from 'lucide-react';
import type { DataFile } from '../types';
import { Sheet, SectionHeader } from './ui';
import { addJattooGoal, addJattooRecord, deleteJattooGoal, deleteJattooRecord } from '../services/dataService';
import type { JattooCategory, JattooGoal, JattooRecord } from '../utils/jattoo';
import { CATEGORIES, CATEGORY_LABEL, goalProgress, jattooBadges, summarize, unitLabel } from '../utils/jattoo';
import { SURAHS, surah as surahOf } from '../utils/quranMeta';
import { isoDay } from '../utils/weekDates';
import { Avatar } from './Avatar';
import { t } from '../i18n';

const today = () => isoDay(new Date(Date.UTC(new Date().getFullYear(), new Date().getMonth(), new Date().getDate())));
const field: React.CSSProperties = { backgroundColor: 'var(--surface)', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)' };
const STATUS: Record<string, { label: string; color: string }> = {
    done: { label: t('Аткарылды'), color: 'var(--success)' },
    ontrack: { label: t('Убагында'), color: 'var(--gold)' },
    behind: { label: t('Артта калып жатат'), color: 'var(--danger)' },
    overdue: { label: t('Мөөнөтү өттү'), color: 'var(--danger)' },
    open: { label: t('Мөөнөтсүз'), color: 'var(--text-muted)' }
};
const dateLabel = (iso: string) => { const [y, m, d] = iso.split('-'); return `${+d}.${m}.${y}`; };

/** Everyone's name by id, from every week (people who left keep theirs). */
const namesOf = (data: DataFile) => {
    const m = new Map<string, string>();
    data.weeks.forEach(w => w.teams.forEach(team => team.members.forEach(x => m.set(x.id, x.name))));
    return m;
};

const summaryLine = (records: JattooRecord[]) => {
    const s = summarize(records);
    const parts: string[] = [];
    if (s.ayahs) parts.push(unitLabel('quran', s.ayahs));
    if (s.surahsComplete.length) parts.push(t('{0} толук сүрө', s.surahsComplete.length));
    (['hadith', 'dua', 'zikr', 'names', 'other'] as const).forEach(c => { if (s.counts[c]) parts.push(unitLabel(c, s.counts[c])); });
    return parts.join(' · ');
};

// ---------------------------------------------------------------- the form
const RecordForm: React.FC<{ memberId: string; mode: 'record' | 'goal'; onSaved: () => void }> = ({ memberId, mode, onSaved }) => {
    const [category, setCategory] = useState<JattooCategory>('quran');
    const [surahN, setSurahN] = useState(67);
    const [from, setFrom] = useState(1);
    const [to, setTo] = useState(10);
    const [title, setTitle] = useState('');
    const [amount, setAmount] = useState(1);
    const [date, setDate] = useState(today());
    const [due, setDue] = useState('');
    const [note, setNote] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [saved, setSaved] = useState(false);
    const s = surahOf(surahN)!;
    const rangeOk = category !== 'quran' || (from >= 1 && to >= from && to <= s.ayahs);
    const ok = rangeOk && (category === 'quran' || title.trim().length > 0) && amount >= 1;

    const save = async () => {
        setBusy(true); setError(null);
        try {
            const base = { memberId, category, title: category === 'quran' ? s.name : title, surah: category === 'quran' ? surahN : null, ayahFrom: category === 'quran' ? from : null, ayahTo: category === 'quran' ? to : null, note };
            if (mode === 'record') await addJattooRecord({ ...base, amount: category === 'quran' ? to - from + 1 : amount, recitedOn: date });
            else await addJattooGoal({ ...base, target: category === 'quran' ? to - from + 1 : amount, dueDate: due || null });
            setSaved(true); setTitle(''); setNote(''); onSaved();
        } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
        finally { setBusy(false); }
    };

    return (
        <div className="space-y-4">
            <div className="jattoo-kinds" role="radiogroup" aria-label={t('Түрү')}>
                {CATEGORIES.map(c => <button key={c} type="button" role="radio" aria-checked={category === c} onClick={() => { setCategory(c); setSaved(false); }} data-on={category === c || undefined}>{CATEGORY_LABEL[c]}</button>)}
            </div>
            {category === 'quran' ? (
                <div className="grid grid-cols-[1fr_auto_auto] gap-2 items-end">
                    <label className="min-w-0">
                        <span className="eyebrow block mb-1.5">{t('Сүрө')}</span>
                        <select value={surahN} onChange={e => { const n = Number(e.target.value); setSurahN(n); setFrom(1); setTo(surahOf(n)!.ayahs); setSaved(false); }} className="w-full px-2.5 py-2.5 text-[0.95rem]" style={field}>
                            {SURAHS.map(([name, , ayahs], i) => <option key={i} value={i + 1}>{`${i + 1}. ${name} (${ayahs})`}</option>)}
                        </select>
                    </label>
                    <label><span className="eyebrow block mb-1.5">{t('Аяттан')}</span>
                        <input type="number" inputMode="numeric" min={1} max={s.ayahs} value={from} onChange={e => { setFrom(Number(e.target.value)); setSaved(false); }} className="w-[4.6rem] px-2.5 py-2.5 text-[0.95rem] tabular" style={field} /></label>
                    <label><span className="eyebrow block mb-1.5">{t('Аятка')}</span>
                        <input type="number" inputMode="numeric" min={1} max={s.ayahs} value={to} onChange={e => { setTo(Number(e.target.value)); setSaved(false); }} className="w-[4.6rem] px-2.5 py-2.5 text-[0.95rem] tabular" style={field} /></label>
                    <div className="col-span-3 flex items-center justify-between gap-3 text-[0.85rem]" style={{ color: rangeOk ? 'var(--text-muted)' : 'var(--danger)' }}>
                        <span dir="rtl" lang="ar" className="text-[1.15rem]" style={{ color: 'var(--text-secondary)' }}>{s.ar}</span>
                        <span>{rangeOk ? unitLabel('quran', to - from + 1) : t('Аяттар 1ден {0}ге чейин', s.ayahs)}</span>
                        <button type="button" className="underline-offset-4 hover:underline" style={{ color: 'var(--gold)' }} onClick={() => { setFrom(1); setTo(s.ayahs); setSaved(false); }}>{t('Бүт сүрө')}</button>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
                    <label className="min-w-0"><span className="eyebrow block mb-1.5">{t('Эмне жатталды')}</span>
                        <input value={title} onChange={e => { setTitle(e.target.value); setSaved(false); }} maxLength={160} placeholder={category === 'hadith' ? t('мис. Нававинин 40 хадиси: 12-хадис') : category === 'dua' ? t('мис. Таң эртеңки дуба') : ''} className="w-full px-3 py-2.5 text-[0.95rem]" style={field} /></label>
                    <label><span className="eyebrow block mb-1.5">{t('Канча')}</span>
                        <input type="number" inputMode="numeric" min={1} value={amount} onChange={e => { setAmount(Number(e.target.value)); setSaved(false); }} className="w-[4.6rem] px-2.5 py-2.5 text-[0.95rem] tabular" style={field} /></label>
                </div>
            )}
            <div className="jattoo-step pt-3"><span>3</span>{mode === 'record' ? t('Качан жана сактоо') : t('Мөөнөт жана сактоо')}</div>
            <div className="flex flex-wrap items-end gap-2">
                {mode === 'record'
                    ? <label><span className="eyebrow block mb-1.5">{t('Качан айтып берди')}</span><input type="date" value={date} max={today()} onChange={e => setDate(e.target.value)} className="px-2.5 py-2 text-[0.95rem]" style={{ ...field, colorScheme: 'light dark' }} /></label>
                    : <label><span className="eyebrow block mb-1.5">{t('Мөөнөтү (милдеттүү эмес)')}</span><input type="date" value={due} min={today()} onChange={e => setDue(e.target.value)} className="px-2.5 py-2 text-[0.95rem]" style={{ ...field, colorScheme: 'light dark' }} /></label>}
                {mode === 'record' && <input value={note} onChange={e => setNote(e.target.value)} maxLength={300} placeholder={t('Эскертүү (милдеттүү эмес)')} className="flex-1 min-w-[10rem] px-3 py-2 text-[0.95rem]" style={field} />}
                <button type="button" className="btn btn-primary" disabled={!ok || busy} onClick={save}>
                    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    {saved ? t('Сакталды') : mode === 'record' ? t('Жазуу') : t('План коюу')}
                </button>
            </div>
            {error && <p role="alert" className="text-[0.85rem] px-3 py-2" style={{ borderLeft: '2px solid var(--danger)', color: 'var(--danger)' }}>{error}</p>}
        </div>
    );
};

// ---------------------------------------------------------------- goals list
export const GoalList: React.FC<{ goals: JattooGoal[]; records: JattooRecord[]; onDelete?: (id: number) => void }> = ({ goals, records, onDelete }) => (
    <ul>
        {goals.map((g, i) => {
            const p = goalProgress(g, records, today());
            const st = STATUS[p.status];
            return (
                <li key={g.id} className="py-3" style={{ borderTop: i ? '1px solid var(--border)' : undefined }}>
                    <div className="flex items-baseline justify-between gap-3">
                        <span className="min-w-0">
                            <span className="font-display text-[1.15rem]" style={{ color: 'var(--text-primary)' }}>{g.category === 'quran' && g.surah ? `${g.title} ${g.ayahFrom}–${g.ayahTo}` : g.title}</span>
                            <span className="text-[0.78rem] ml-2" style={{ color: 'var(--text-muted)' }}>{CATEGORY_LABEL[g.category]}{g.dueDate ? ` · ${t('{0} чейин', dateLabel(g.dueDate))}` : ''}</span>
                        </span>
                        <span className="flex items-center gap-3 flex-shrink-0">
                            <span className="text-[0.8rem]" style={{ color: st.color }}>{st.label}</span>
                            {onDelete && <button type="button" onClick={() => { if (window.confirm(t('Бул планды өчүрөсүзбү?'))) onDelete(g.id); }} aria-label={t('Өчүрүү')} className="transition-colors hover:text-[var(--danger)]" style={{ color: 'var(--text-muted)' }}><Trash2 className="w-3.5 h-3.5" /></button>}
                        </span>
                    </div>
                    <div className="flex items-center gap-3 mt-2">
                        <span className="flex-1 h-[3px]" style={{ backgroundColor: 'var(--border)' }}><span className="block h-full" style={{ width: `${p.pct}%`, backgroundColor: st.color }} /></span>
                        <span className="text-[0.82rem] tabular" style={{ color: 'var(--text-secondary)' }}>{p.done} / {p.target}</span>
                    </div>
                    {p.perWeek !== null && p.status !== 'done' && <div className="text-[0.76rem] mt-1 italic" style={{ color: 'var(--text-muted)' }}>{t('Мөөнөткө жетүү үчүн жумасына ~{0}', unitLabel(g.category, p.perWeek))}</div>}
                </li>
            );
        })}
    </ul>
);

const RecordList: React.FC<{ records: JattooRecord[]; onDelete?: (id: number) => void; limit?: number }> = ({ records, onDelete, limit }) => {
    const list = [...records].sort((a, b) => (b.recitedOn > a.recitedOn ? 1 : b.recitedOn < a.recitedOn ? -1 : b.id - a.id)).slice(0, limit);
    return (
        <ol>
            {list.map((r, i) => (
                <li key={r.id} className="flex items-baseline justify-between gap-3 py-2.5" style={{ borderTop: i ? '1px solid var(--border)' : undefined }}>
                    <span className="min-w-0">
                        <span className="text-[0.95rem]" style={{ color: 'var(--text-primary)' }}>{r.category === 'quran' ? `${r.title} ${r.ayahFrom}–${r.ayahTo}` : r.title}</span>
                        <span className="text-[0.78rem] ml-2" style={{ color: 'var(--text-muted)' }}>{unitLabel(r.category, r.amount)}{r.note ? ` · ${r.note}` : ''}</span>
                    </span>
                    <span className="flex items-center gap-3 flex-shrink-0">
                        <span className="text-[0.78rem] tabular" style={{ color: 'var(--text-muted)' }}>{dateLabel(r.recitedOn)}</span>
                        {onDelete && <button type="button" onClick={() => { if (window.confirm(t('Бул жазууну өчүрөсүзбү?'))) onDelete(r.id); }} aria-label={t('Өчүрүү')} className="transition-colors hover:text-[var(--danger)]" style={{ color: 'var(--text-muted)' }}><Trash2 className="w-3.5 h-3.5" /></button>}
                    </span>
                </li>
            ))}
        </ol>
    );
};

// ---------------------------------------------------------------- the sheet
export const JattooSheet: React.FC<{
    data: DataFile;
    /** The captain's house; null for the admin (every house). */
    houseId: string | null;
    onChanged: () => Promise<void> | void;
    onClose: () => void;
}> = ({ data, houseId, onChanged, onClose }) => {
    const latest = data.weeks[data.weeks.length - 1];
    const houses = latest ? latest.teams.filter(team => !houseId || team.id === houseId) : [];
    const [house, setHouse] = useState(houses[0]?.id ?? '');
    const people = houses.find(h => h.id === house)?.members ?? [];
    const [memberId, setMemberId] = useState(people[0]?.id ?? '');
    const [mode, setMode] = useState<'record' | 'goal'>('record');
    const [error, setError] = useState<string | null>(null);
    const records = (data.jattoo?.records ?? []).filter(r => r.memberId === memberId);
    const goals = (data.jattoo?.goals ?? []).filter(g => g.memberId === memberId);
    const remove = async (fn: () => Promise<void>) => { setError(null); try { await fn(); await onChanged(); } catch (e) { setError(e instanceof Error ? e.message : String(e)); } };

    return (
        <Sheet title={t('Жаттоо')} onClose={onClose} width="44rem">
            <div className="px-5 sm:px-7 py-5 space-y-6">
                <p className="text-[0.9rem]" style={{ color: 'var(--text-muted)' }}>{t('Адам жаттаганын окуп бергенде, ушул жерге жазыңыз. Упай берилбейт, бирок профилинде жана үйдүн бетинде көрүнөт.')}</p>
                {houses.length > 1 && (
                    <div className="flex flex-wrap gap-1" role="tablist" aria-label={t('Үй')}>
                        {houses.map(h => <button key={h.id} role="tab" aria-selected={house === h.id} onClick={() => { setHouse(h.id); setMemberId(h.members[0]?.id ?? ''); }} className={`chip ${house === h.id ? 'is-active' : ''}`}>{h.name}</button>)}
                    </div>
                )}
                <div>
                    <div className="jattoo-step"><span>1</span>{t('Ким айтып берди')}</div>
                    {/* The house as a row of faces: easier to find someone than in a list of names. */}
                    <div className="jattoo-roster">
                        {people.map(p => {
                            const has = (data.jattoo?.records ?? []).some(r => r.memberId === p.id);
                            return (
                                <button key={p.id} type="button" onClick={() => setMemberId(p.id)} aria-pressed={memberId === p.id} className="jattoo-face" data-on={memberId === p.id || undefined}>
                                    <span className="relative"><Avatar name={p.name} role={p.role} photoUrl={p.photoUrl} size="md" />{has && <i className="jattoo-has" title={t('Жаттаганы бар')} />}</span>
                                    <span className="jattoo-face-n">{p.name}</span>
                                </button>
                            );
                        })}
                    </div>
                    {memberId && <div className="text-[0.88rem] mt-3 italic" style={{ color: 'var(--text-secondary)' }}>{summaryLine(records) || t('Азырынча жазуу жок.')}</div>}
                </div>

                {memberId && (
                    <section className="pt-5" style={{ borderTop: '1px solid var(--border)' }}>
                        <div className="jattoo-step"><span>2</span>{t('Эмнени')}</div>
                        <div className="flex gap-6 mb-4" role="tablist">
                            {(['record', 'goal'] as const).map(m => <button key={m} role="tab" aria-selected={mode === m} onClick={() => setMode(m)} className="jattoo-tab" data-on={mode === m || undefined}>{m === 'record' ? t('Жатталды') : t('План')}</button>)}
                        </div>
                        <RecordForm key={`${memberId}-${mode}`} memberId={memberId} mode={mode} onSaved={() => onChanged()} />
                    </section>
                )}
                {error && <p role="alert" className="text-[0.85rem] px-3 py-2" style={{ borderLeft: '2px solid var(--danger)', color: 'var(--danger)' }}>{error}</p>}
                {goals.length > 0 && (
                    <section>
                        <div className="eyebrow mb-1" style={{ color: 'var(--gold)' }}>{t('Пландар')}</div>
                        <GoalList goals={goals} records={records} onDelete={id => remove(() => deleteJattooGoal(id))} />
                    </section>
                )}
                {records.length > 0 && (
                    <section>
                        <div className="eyebrow mb-1" style={{ color: 'var(--gold)' }}>{t('Жазуулар')}</div>
                        <RecordList records={records} onDelete={id => remove(() => deleteJattooRecord(id))} />
                    </section>
                )}
            </div>
        </Sheet>
    );
};

// ---------------------------------------------------------------- display
const BadgeRow: React.FC<{ records: JattooRecord[] }> = ({ records }) => {
    const badges = jattooBadges(summarize(records));
    if (!badges.length) return null;
    return (
        <div className="flex flex-wrap gap-2 mt-4">
            {badges.map(b => (
                <span key={b.id} title={b.rule} className="jattoo-badge" data-tier={b.tier}><span className="jattoo-badge-dot" aria-hidden="true" />{b.name}</span>
            ))}
        </div>
    );
};

/** Profile: what this person has memorized. */
export const JattooProfile: React.FC<{ data: DataFile; memberId: string; hideGoals?: boolean }> = ({ data, memberId, hideGoals }) => {
    // Only what a captain has heard counts as memorized.
    const records = (data.jattoo?.records ?? []).filter(r => r.memberId === memberId && r.verified !== false);
    const goals = hideGoals ? [] : (data.jattoo?.goals ?? []).filter(g => g.memberId === memberId);
    if (!data.jattoo || (!records.length && !goals.length)) return null;
    const s = summarize(records);
    return (
        <section>
            <div className="flex items-baseline justify-between gap-3 mb-4">
                <h3 className="font-display text-[1.6rem]" style={{ color: 'var(--text-primary)' }}>{hideGoals ? t('Жатталганы') : t('Жаттоо')}</h3>
                <span className="text-[0.8rem]" style={{ color: 'var(--text-muted)' }}>{s.lastDate ? t('акыркысы {0}', dateLabel(s.lastDate)) : ''}</span>
            </div>
            <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
                {s.ayahs > 0 && <span><span className="font-display text-[2.6rem] leading-none tabular gold-sheen">{s.ayahs}</span> <span className="text-[0.9rem]" style={{ color: 'var(--text-muted)' }}>{t('аят')}</span></span>}
                {(['hadith', 'dua', 'zikr', 'names', 'other'] as const).filter(c => s.counts[c]).map(c => (
                    <span key={c}><span className="font-display text-[1.7rem] leading-none tabular" style={{ color: 'var(--text-primary)' }}>{s.counts[c]}</span> <span className="text-[0.85rem]" style={{ color: 'var(--text-muted)' }}>{CATEGORY_LABEL[c].toLowerCase()}</span></span>
                ))}
            </div>
            {s.surahsComplete.length > 0 && <p className="text-[0.88rem] mt-2" style={{ color: 'var(--text-secondary)' }}>{t('Толук жатталган сүрөлөр: {0}', s.surahsComplete.map(n => surahOf(n)!.name).join(', '))}</p>}
            <BadgeRow records={records} />
            {goals.length > 0 && <div className="mt-5"><div className="eyebrow mb-1" style={{ color: 'var(--gold)' }}>{t('Пландар')}</div><GoalList goals={goals} records={records} /></div>}
            {records.length > 0 && <div className="mt-5"><div className="eyebrow mb-1" style={{ color: 'var(--gold)' }}>{t('Акыркы жазуулар')}</div><RecordList records={records} limit={5} /></div>}
        </section>
    );
};

/** House page: every member's memorization at a glance. */
export const JattooHouse: React.FC<{ data: DataFile; houseId: string; memberIds: string[]; onOpenProfile: (id: string) => void }> = ({ data, houseId, memberIds, onOpenProfile }) => {
    const names = useMemo(() => namesOf(data), [data]);
    const records = (data.jattoo?.records ?? []).filter(r => memberIds.includes(r.memberId) || r.houseId === houseId);
    if (!data.jattoo || !records.length) return null;
    const ids = [...new Set([...memberIds, ...records.map(r => r.memberId)])].filter(id => records.some(r => r.memberId === id));
    const rows = ids.map(id => ({ id, s: summarize(records.filter(r => r.memberId === id)) })).sort((a, b) => b.s.ayahs - a.s.ayahs || b.s.records - a.s.records);
    return (
        <section>
            <SectionHeader eyebrow={t('Жатталгандар')} title={t('Жаттоо')} sub={t('Упай кошулбайт. Капитан угуп, жазып коёт.')} />
            <ol>
                {rows.map(({ id }, i) => (
                    <li key={id} style={{ borderTop: i ? '1px solid var(--border)' : undefined }}>
                        <button type="button" onClick={() => onOpenProfile(id)} className="row-link w-full text-left py-3 px-1 flex items-baseline justify-between gap-4">
                            <span className="font-display text-[1.15rem] truncate" style={{ color: 'var(--text-primary)' }}>{names.get(id) ?? '—'}</span>
                            <span className="text-[0.85rem] text-right" style={{ color: 'var(--text-secondary)' }}>{summaryLine(records.filter(r => r.memberId === id))}</span>
                        </button>
                    </li>
                ))}
            </ol>
        </section>
    );
};

/** Community page: what the jamaat memorized together. */
export const JattooCommunity: React.FC<{ data: DataFile }> = ({ data }) => {
    if (!data.jattoo || !data.jattoo.records.length) return null;
    const s = summarize(data.jattoo.records);
    const people = new Set(data.jattoo.records.map(r => r.memberId)).size;
    // Ayahs per person, then summed (two people memorizing the same surah both count).
    const byPerson = new Map<string, JattooRecord[]>();
    data.jattoo.records.forEach(r => byPerson.set(r.memberId, [...(byPerson.get(r.memberId) ?? []), r]));
    const ayahs = [...byPerson.values()].reduce((a, list) => a + summarize(list).ayahs, 0);
    const surahs = [...byPerson.values()].reduce((a, list) => a + summarize(list).surahsComplete.length, 0);
    return (
        <section>
            <SectionHeader eyebrow={t('Жалпы жамаат')} title={t('Жаттоо')} sub={t('{0} адам жаттаганын айтып берди.', people)} />
            <div className="flex flex-wrap items-baseline gap-x-8 gap-y-3">
                <span><span className="font-display text-[3rem] leading-none tabular gold-sheen">{ayahs}</span> <span style={{ color: 'var(--text-muted)' }}>{t('аят')}</span></span>
                {surahs > 0 && <span><span className="font-display text-[2rem] leading-none tabular" style={{ color: 'var(--text-primary)' }}>{surahs}</span> <span style={{ color: 'var(--text-muted)' }}>{t('толук сүрө')}</span></span>}
                {(['hadith', 'dua', 'zikr', 'names', 'other'] as const).filter(c => s.counts[c]).map(c => (
                    <span key={c}><span className="font-display text-[2rem] leading-none tabular" style={{ color: 'var(--text-primary)' }}>{s.counts[c]}</span> <span style={{ color: 'var(--text-muted)' }}>{CATEGORY_LABEL[c].toLowerCase()}</span></span>
                ))}
            </div>
        </section>
    );
};

/** Awards tab: who has which memorization badge. */
export const JattooAwards: React.FC<{ data: DataFile; onOpenProfile: (id: string) => void }> = ({ data, onOpenProfile }) => {
    const names = useMemo(() => namesOf(data), [data]);
    if (!data.jattoo || !data.jattoo.records.length) return null;
    const byPerson = new Map<string, JattooRecord[]>();
    data.jattoo.records.forEach(r => byPerson.set(r.memberId, [...(byPerson.get(r.memberId) ?? []), r]));
    const groups = new Map<string, { name: string; rule: string; tier: string; people: string[] }>();
    byPerson.forEach((list, id) => jattooBadges(summarize(list)).forEach(b => {
        const g = groups.get(b.id) ?? { name: b.name, rule: b.rule, tier: b.tier, people: [] };
        g.people.push(id); groups.set(b.id, g);
    }));
    if (!groups.size) return null;
    return (
        <section>
            <SectionHeader eyebrow={t('Упай үчүн эмес')} title={t('Жаттоо сыйлыктары')} />
            <ul>
                {[...groups.values()].map((g, i) => (
                    <li key={g.name} className="py-3.5" style={{ borderTop: i ? '1px solid var(--border)' : undefined }}>
                        <div className="flex items-baseline gap-3">
                            <span className="jattoo-badge" data-tier={g.tier}><span className="jattoo-badge-dot" aria-hidden="true" />{g.name}</span>
                            <span className="text-[0.8rem]" style={{ color: 'var(--text-muted)' }}>{g.rule}</span>
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                            {g.people.map(id => <button key={id} type="button" onClick={() => onOpenProfile(id)} className="text-[0.95rem] transition-colors hover:text-[var(--gold)]" style={{ color: 'var(--text-primary)' }}>{names.get(id) ?? '—'}</button>)}
                        </div>
                    </li>
                ))}
            </ul>
        </section>
    );
};
