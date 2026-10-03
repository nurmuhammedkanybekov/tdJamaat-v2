import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRightLeft, CheckCircle2, Loader2, Plus, Save, UserMinus, UserPlus } from 'lucide-react';
import type { DataFile, House, Member, Role } from '../types';
import { addHouse, addMember, fetchHouses, fetchMembers, renameSeason, startNewSeason, updateHouse, updateMember } from '../services/dataService';
import { runningSeason } from '../utils/seasons';
import { ROLE_LABEL } from '../utils/insights';

// Admin: the season lifecycle and the roster (who is in which house).
// People change houses after each season — the roster tab is where that
// happens. Moving someone never touches their past results: every saved
// week remembers the house it was earned in.

type Run = (key: string, fn: () => Promise<string | void>) => Promise<void>;

const input: React.CSSProperties = { backgroundColor: 'var(--surface)', border: '1px solid var(--border-strong)', borderRadius: 2, color: 'var(--text-primary)' };
const ROLES: Role[] = ['imam', 'zam', 'member'];

// "2026–27" → "2027–28", "2027" → "2028"; anything else stays a suggestion to edit.
const nextSeasonName = (name: string) => {
    const pair = name.match(/(\d{4})\s*[–-]\s*(\d{2,4})/);
    if (pair) {
        const a = Number(pair[1]) + 1;
        return `${a}–${String(a + 1).slice(-2)}`;
    }
    const single = name.match(/\d{4}/);
    return single ? String(Number(single[0]) + 1) : `${name} (жаңы)`;
};

export const SeasonTab: React.FC<{ data: DataFile; busy: string | null; run: Run; onChanged: () => void }> = ({ data, busy, run, onChanged }) => {
    const running = runningSeason(data.seasons);
    const [names, setNames] = useState<Record<number, string>>(() => Object.fromEntries(data.seasons.map(s => [s.id, s.name])));
    const [step, setStep] = useState<'idle' | 'confirm' | 'done'>('idle');
    const [newName, setNewName] = useState(() => nextSeasonName(running?.name ?? '2026–27'));
    const [lock, setLock] = useState(true);
    const weeksIn = (id: number) => data.weeks.filter(w => w.seasonId === id).length;
    const legacy = data.seasons.length === 1 && data.seasons[0].id === 0;

    return (
        <div className="px-5 sm:px-7 pb-8 space-y-10">
            {legacy && (
                <p className="text-[0.88rem] italic" style={{ color: 'var(--warning)' }}>
                    Сезондор үчүн базаны жаңыртуу керек: supabase/seasons-2026-10.sql файлын Supabase SQL Editor аркылуу бир жолу иштетиңиз.
                </p>
            )}

            <section>
                <div className="eyebrow mb-4">Сезондор</div>
                <ol>
                    {data.seasons.map(s => (
                        <li key={s.id} className="flex flex-wrap items-center gap-3 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
                            <input
                                value={names[s.id] ?? s.name}
                                onChange={e => setNames(n => ({ ...n, [s.id]: e.target.value }))}
                                className="font-display text-[1.3rem] bg-transparent outline-none min-w-0 w-40 border-b border-transparent focus:border-[var(--gold)]"
                                style={{ color: 'var(--text-primary)' }}
                                aria-label="Сезондун аты"
                                disabled={legacy}
                            />
                            <span className="text-[0.85rem] italic flex-1" style={{ color: 'var(--text-muted)' }}>
                                {weeksIn(s.id)} апта{s.lastWeek === null ? ' · уланууда' : ' · бүттү'}
                            </span>
                            {!legacy && (names[s.id] ?? s.name) !== s.name && (
                                <button className="btn btn-ghost" disabled={busy === `rename${s.id}`} onClick={() => run(`rename${s.id}`, async () => { await renameSeason(s.id, names[s.id].trim()); onChanged(); return 'Сезондун аты сакталды.'; })}>
                                    <Save className="w-3.5 h-3.5" /> Сактоо
                                </button>
                            )}
                        </li>
                    ))}
                </ol>
            </section>

            {running && !legacy && (
                <section>
                    <div className="eyebrow mb-3">Сезонду аяктоо</div>
                    {step === 'idle' && (
                        <>
                            <p className="text-[0.92rem] mb-4" style={{ color: 'var(--text-secondary)' }}>
                                «{running.name}» сезону {weeksIn(running.id)} аптадан турат. Аяктаганда анын бардык жыйынтыктары, сыйлыктары жана үйлөрү архивде түбөлүк сакталат, жаңы сезон 1-аптадан башталат.
                            </p>
                            <button className="btn btn-ghost" onClick={() => setStep('confirm')}>Сезонду аяктоо…</button>
                        </>
                    )}
                    {step === 'confirm' && (
                        <div className="card card-pad space-y-4">
                            <label className="block">
                                <span className="eyebrow block mb-2">Жаңы сезондун аты</span>
                                <input value={newName} onChange={e => setNewName(e.target.value)} className="w-full px-3 py-2 text-[1rem]" style={input} />
                            </label>
                            <label className="flex items-start gap-3 cursor-pointer text-[0.9rem]" style={{ color: 'var(--text-secondary)' }}>
                                <input type="checkbox" checked={lock} onChange={e => setLock(e.target.checked)} className="mt-1 accent-[var(--gold)]" />
                                <span>«{running.name}» сезонунун апталарын кулпулоо (жетекчилер эски жыйынтыктарды өзгөртө албай калат; админ баары бир өзгөртө алат).</span>
                            </label>
                            <p className="text-[0.85rem] italic" style={{ color: 'var(--text-muted)' }}>
                                Эскертүү: учурдагы сезон акыркы ачылган аптада бүтөт. Аны кайра ачууга болбойт, ошондуктан бардык маалымат киргизилгенин текшериңиз.
                            </p>
                            <div className="flex flex-wrap gap-2">
                                <button className="btn btn-ghost" onClick={() => setStep('idle')}>Жокко чыгаруу</button>
                                <button
                                    className="btn btn-primary"
                                    disabled={busy === 'season' || !newName.trim()}
                                    onClick={() => run('season', async () => {
                                        await startNewSeason(newName.trim(), lock);
                                        setStep('done');
                                        onChanged();
                                        return `«${running.name}» аяктады. «${newName.trim()}» сезону башталды.`;
                                    })}
                                >
                                    {busy === 'season' ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                    Ырастоо: сезонду аяктоо
                                </button>
                            </div>
                        </div>
                    )}
                    {step === 'done' && (
                        <div className="card card-pad">
                            <div className="font-display text-[1.4rem] mb-3" style={{ color: 'var(--text-primary)' }}>Жаңы сезонго даярдык</div>
                            <ol className="space-y-2 text-[0.92rem]" style={{ color: 'var(--text-secondary)' }}>
                                <li><span style={{ color: 'var(--gold)' }}>1.</span> «Курам» бөлүмүндө адамдарды жаңы үйлөрүнө которуңуз, ролдорун текшериңиз.</li>
                                <li><span style={{ color: 'var(--gold)' }}>2.</span> «Максаттар» бөлүмүндө пландарды текшериңиз.</li>
                                <li><span style={{ color: 'var(--gold)' }}>3.</span> «Апталар» бөлүмүндө жаңы сезондун 1-аптасын ачыңыз.</li>
                            </ol>
                        </div>
                    )}
                </section>
            )}
        </div>
    );
};

export const RosterTab: React.FC<{ busy: string | null; run: Run; onChanged: () => void }> = ({ busy, run, onChanged }) => {
    const [houses, setHouses] = useState<House[] | null>(null);
    const [members, setMembers] = useState<Member[]>([]);
    const [drafts, setDrafts] = useState<Record<string, Partial<Member>>>({});
    const [houseNames, setHouseNames] = useState<Record<string, string>>({});
    const [newMember, setNewMember] = useState<Record<string, { name: string; role: Role }>>({});
    const [newHouse, setNewHouse] = useState({ name: '', slug: '' });
    const [showLeft, setShowLeft] = useState(false);

    const reload = async () => {
        const [h, m] = await Promise.all([fetchHouses(true), fetchMembers(true)]);
        setHouses(h); setMembers(m); setDrafts({}); setHouseNames({});
    };
    useEffect(() => { reload(); }, []);

    const sortedHouses = useMemo(() => [...(houses ?? [])].sort((a, b) => Number(b.active) - Number(a.active) || a.displayOrder - b.displayOrder), [houses]);
    if (!houses) return <div className="flex items-center justify-center gap-2 py-12" style={{ color: 'var(--text-muted)' }}><Loader2 className="w-5 h-5 animate-spin" /> Жүктөлүүдө…</div>;

    const value = <K extends keyof Member>(m: Member, k: K): Member[K] => (drafts[m.id]?.[k] ?? m[k]) as Member[K];
    const setDraft = (id: string, patch: Partial<Member>) => setDrafts(d => ({ ...d, [id]: { ...d[id], ...patch } }));
    const dirty = (m: Member) => !!drafts[m.id] && Object.entries(drafts[m.id]).some(([k, v]) => (m as unknown as Record<string, unknown>)[k] !== v);
    const left = members.filter(m => !m.active);

    const saveMember = (m: Member) => run(`m${m.id}`, async () => {
        const d = drafts[m.id] ?? {};
        await updateMember(m.id, { name: d.name?.trim(), role: d.role, houseId: d.houseId, active: d.active });
        await reload(); onChanged();
        const moved = d.houseId && d.houseId !== m.houseId ? ` → ${houses.find(h => h.id === d.houseId)?.name}` : '';
        return `${(d.name ?? m.name).trim()} сакталды${moved}.`;
    });

    const memberRow = (m: Member) => (
        <li key={m.id} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:grid-cols-[minmax(0,1.4fr)_8rem_10rem_auto] gap-2 items-center py-2.5" style={{ borderBottom: '1px solid var(--border)' }}>
            <input value={value(m, 'name')} onChange={e => setDraft(m.id, { name: e.target.value })} className="col-span-3 sm:col-span-1 px-2 py-1.5 min-w-0 text-[0.95rem]" style={input} aria-label="Аты" />
            <select value={value(m, 'role')} onChange={e => setDraft(m.id, { role: e.target.value as Role })} className="px-2 py-1.5 text-[0.88rem] min-w-0" style={input} aria-label="Ролу">
                {ROLES.map(r => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
            </select>
            <select value={value(m, 'houseId')} onChange={e => setDraft(m.id, { houseId: e.target.value })} className="px-2 py-1.5 text-[0.88rem] min-w-0" style={input} aria-label="Үйү">
                {houses.filter(h => h.active || h.id === m.houseId).map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
            <span className="flex gap-1.5 justify-end">
                {dirty(m) && (
                    <button className="btn btn-primary" disabled={busy === `m${m.id}`} onClick={() => saveMember(m)}>
                        {busy === `m${m.id}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : value(m, 'houseId') !== m.houseId ? <ArrowRightLeft className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />} Сактоо
                    </button>
                )}
                <button
                    className="btn btn-ghost btn-icon"
                    title={m.active ? 'Курамдан чыгаруу (тарыхы сакталат)' : 'Кайра кошуу'}
                    aria-label={m.active ? 'Курамдан чыгаруу' : 'Кайра кошуу'}
                    disabled={busy === `a${m.id}`}
                    onClick={() => run(`a${m.id}`, async () => { await updateMember(m.id, { active: !m.active }); await reload(); onChanged(); return m.active ? `${m.name} курамдан чыкты (тарыхы сакталды).` : `${m.name} кайра кошулду.`; })}
                >
                    {m.active ? <UserMinus className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                </button>
            </span>
        </li>
    );

    return (
        <div className="px-5 sm:px-7 pb-8 space-y-10">
            <p className="text-[0.9rem]" style={{ color: 'var(--text-secondary)' }}>
                Адамды башка үйгө которуу үчүн анын «Үйү» талаасын өзгөртүп, «Сактоо» басыңыз. Мурунку жыйынтыктары эски үйүндө калат. Курамдан чыгарылган адамдын тарыхы өчпөйт.
            </p>

            {sortedHouses.map(h => {
                const people = members.filter(m => m.houseId === h.id && m.active).sort((a, b) => a.displayOrder - b.displayOrder);
                const nm = newMember[h.id] ?? { name: '', role: 'member' as Role };
                const hn = houseNames[h.id] ?? h.name;
                return (
                    <section key={h.id} style={{ opacity: h.active ? 1 : 0.6 }}>
                        <div className="flex flex-wrap items-center gap-3 mb-2">
                            <input value={hn} onChange={e => setHouseNames(n => ({ ...n, [h.id]: e.target.value }))} className="font-display text-[1.5rem] bg-transparent outline-none min-w-0 flex-1 border-b border-transparent focus:border-[var(--gold)]" style={{ color: 'var(--text-primary)' }} aria-label="Үйдүн аты" />
                            {hn !== h.name && <button className="btn btn-primary" onClick={() => run(`h${h.id}`, async () => { await updateHouse(h.id, { name: hn.trim() }); await reload(); onChanged(); return 'Үйдүн аты сакталды.'; })}><Save className="w-3.5 h-3.5" /> Сактоо</button>}
                            <button className="btn btn-ghost" onClick={() => run(`ha${h.id}`, async () => { await updateHouse(h.id, { active: !h.active }); await reload(); onChanged(); return h.active ? `${h.name} жабылды (архивде калат).` : `${h.name} кайра ачылды.`; })}>
                                {h.active ? 'Үйдү жабуу' : 'Кайра ачуу'}
                            </button>
                        </div>
                        <div className="eyebrow mb-1">{people.length} адам</div>
                        <ul>{people.map(memberRow)}</ul>
                        {h.active && (
                            <div className="flex flex-wrap gap-2 mt-3">
                                <input placeholder="Жаңы адамдын аты" value={nm.name} onChange={e => setNewMember(n => ({ ...n, [h.id]: { ...nm, name: e.target.value } }))} className="px-2 py-1.5 flex-1 min-w-[10rem] text-[0.95rem]" style={input} />
                                <select value={nm.role} onChange={e => setNewMember(n => ({ ...n, [h.id]: { ...nm, role: e.target.value as Role } }))} className="px-2 py-1.5 text-[0.88rem]" style={input} aria-label="Ролу">
                                    {ROLES.map(r => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                                </select>
                                <button className="btn btn-ghost" disabled={!nm.name.trim() || busy === `n${h.id}`} onClick={() => run(`n${h.id}`, async () => {
                                    await addMember(h.id, nm.name.trim(), nm.role, people.length + 1);
                                    setNewMember(n => ({ ...n, [h.id]: { name: '', role: 'member' } }));
                                    await reload(); onChanged();
                                    return `${nm.name.trim()} ${h.name} үйүнө кошулду.`;
                                })}><Plus className="w-3.5 h-3.5" /> Кошуу</button>
                            </div>
                        )}
                    </section>
                );
            })}

            {left.length > 0 && (
                <section>
                    <button className="eyebrow" onClick={() => setShowLeft(v => !v)}>{showLeft ? '− ' : '+ '}Курамдан чыккандар ({left.length})</button>
                    {showLeft && <ul className="mt-2">{left.map(memberRow)}</ul>}
                </section>
            )}

            <section className="card card-pad space-y-3">
                <div className="eyebrow">Жаңы үй</div>
                <div className="flex flex-wrap gap-2">
                    <input placeholder="Аты (мис. Mester)" value={newHouse.name} onChange={e => setNewHouse(v => ({ ...v, name: e.target.value }))} className="px-2 py-1.5 flex-1 min-w-[10rem]" style={input} />
                    <input placeholder="Логин (латынча, мис. mester)" value={newHouse.slug} onChange={e => setNewHouse(v => ({ ...v, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))} className="px-2 py-1.5 flex-1 min-w-[10rem]" style={input} />
                    <button className="btn btn-ghost" disabled={!newHouse.name.trim() || !newHouse.slug || busy === 'newhouse'} onClick={() => run('newhouse', async () => {
                        await addHouse(newHouse.name.trim(), newHouse.slug, houses.length + 1);
                        setNewHouse({ name: '', slug: '' });
                        await reload(); onChanged();
                        return 'Үй кошулду. Жетекчилер кириши үчүн бул үйгө кирүү аккаунтун scripts/create-auth-users.js аркылуу түзүңүз.';
                    })}><Plus className="w-3.5 h-3.5" /> Үй кошуу</button>
                </div>
                <p className="text-[0.8rem] italic" style={{ color: 'var(--text-muted)' }}>Жаңы үйдүн жетекчилери кириши үчүн анын сыр сөзү (аккаунту) өзүнчө түзүлөт: scripts/create-auth-users.js.</p>
            </section>
        </div>
    );
};
