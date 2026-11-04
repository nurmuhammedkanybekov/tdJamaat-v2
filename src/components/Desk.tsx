// The desk: the first thing a captain or the admin sees on the overview —
// their own house's week (or, for the admin, who is still missing) and the
// one action that matters next. Numbers come from src/utils/desk.ts.
import React, { useState } from 'react';
import { ArrowRight, Check, CheckCircle2, Clock3, Lock, PenLine, Send, Settings } from 'lucide-react';
import type { AdminDesk, HouseDesk } from '../utils/desk';
import { metricName } from '../utils/metrics';
import { TEAM_COLORS } from '../utils/scoring';
import { CountUp } from './motion';
import { placeSuffix, t } from '../i18n';

const fmt = (n: number) => (Math.round(n * 10) / 10).toString();
const signed = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : '±'}${fmt(Math.abs(n))}`;
const cell: React.CSSProperties = { boxShadow: '1px 0 0 var(--border), 0 1px 0 var(--border)' };

const Status: React.FC<{ entered: boolean; locked: boolean }> = ({ entered, locked }) => (
    entered
        ? <span className="inline-flex items-center gap-1.5" style={{ color: 'var(--success)' }}><CheckCircle2 className="w-3.5 h-3.5" />{t('маалымат киргизилди')}</span>
        : locked
            ? <span className="inline-flex items-center gap-1.5" style={{ color: 'var(--danger)' }}><Lock className="w-3.5 h-3.5" />{t('апта бекитилди — киргизилген жок')}</span>
            : <span className="inline-flex items-center gap-1.5" style={{ color: 'var(--gold)' }}><Clock3 className="w-3.5 h-3.5" />{t('маалымат күтүлүүдө')}</span>
);

const Fact: React.FC<{ label: string; children: React.ReactNode; note?: React.ReactNode }> = ({ label, children, note }) => (
    <div className="px-5 py-4 sm:px-6 sm:py-5 min-w-0" style={cell}>
        <div className="eyebrow">{label}</div>
        <div className="font-display text-[1.45rem] leading-tight mt-1.5 tabular truncate" style={{ color: 'var(--text-primary)' }}>{children}</div>
        {note && <div className="text-[0.8rem] mt-1 line-clamp-2" style={{ color: 'var(--text-muted)' }}>{note}</div>}
    </div>
);

export const CaptainDesk: React.FC<{
    desk: HouseDesk;
    canEdit: boolean;
    onEnter: () => void;
    onOpenHouse: () => void;
    onOpenPerson: (id: string) => void;
}> = ({ desk, canEdit, onEnter, onOpenHouse, onOpenPerson }) => {
    const action = canEdit && (
        <button onClick={onEnter} className={`btn ${desk.entered ? 'btn-ghost' : 'btn-primary'}`}>
            <PenLine className="w-4 h-4" />{desk.entered ? t('Өзгөртүү') : t('{0}-аптаны киргизүү', desk.weekNumber)}
        </button>
    );
    return (
        <section className="card overflow-hidden animate-view-in relative" aria-label={t('Сиздин үй')} style={{ borderTop: '2px solid var(--gold)' }}>
            <div className="card-pad flex flex-col sm:flex-row sm:items-center gap-5 sm:gap-8">
                <div className="flex-1 min-w-0">
                    <div className="eyebrow" style={{ color: 'var(--gold)' }}>{t('Сиздин үй · {0}-апта', desk.weekNumber)}</div>
                    <h2 className="font-display text-[2.1rem] sm:text-[2.4rem] leading-tight truncate" style={{ color: 'var(--text-primary)' }}>{desk.houseName}</h2>
                    <div className="text-[0.85rem] mt-0.5"><Status entered={desk.entered} locked={desk.locked} /></div>
                </div>
                {desk.rank !== null && desk.rating !== null && (
                    <div className="flex items-end gap-6">
                        <div>
                            <div className="eyebrow">{t('Орун')}</div>
                            <div className="flex items-baseline mt-1">
                                <span className="font-display text-[2.8rem] leading-none tabular" style={{ color: 'var(--gold)' }}>{desk.rank}</span>
                                <span className="text-[0.85rem]" style={{ color: 'var(--gold)' }}>{placeSuffix(desk.rank)}</span>
                                <span className="text-[0.85rem] ml-1.5 whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>· {t('{0} үйдөн', desk.ranked)}</span>
                            </div>
                        </div>
                        <div>
                            <div className="eyebrow">{t('Үй рейтинги')}</div>
                            <div className="flex items-baseline gap-2 mt-1">
                                <CountUp value={desk.rating} className="font-display text-[2.8rem] leading-none tabular" style={{ color: 'var(--text-primary)' }} />
                                {desk.change !== null && desk.change !== 0 && (
                                    <span className="text-[0.82rem] tabular" style={{ color: desk.change > 0 ? 'var(--success)' : 'var(--danger)' }}>{signed(desk.change)}</span>
                                )}
                            </div>
                        </div>
                    </div>
                )}
                {action && <div className="flex-shrink-0">{action}</div>}
            </div>

            {desk.entered && desk.rank !== null ? (
                <div className="grid grid-cols-1 sm:grid-cols-3" style={{ borderTop: '1px solid var(--border)' }}>
                    {desk.above ? (
                        <Fact label={t('Алдыңкы орунга чейин')} note={t('{0} үйүнө жетиш үчүн', desk.above.name)}>
                            {t('{0} упай', fmt(desk.above.gap))}
                        </Fact>
                    ) : (
                        <Fact label={t('Биринчи орун')} note={desk.below ? t('{0} үйүнөн алдыда', desk.below.name) : undefined}>
                            {desk.below ? t('{0} упай алдыда', fmt(desk.below.gap)) : t('Жалгыз үй')}
                        </Fact>
                    )}
                    <Fact label={t('Планды толук аткаргандар')} note={desk.best ? <>{t('Эң жогорку упай:')} <button className="underline decoration-dotted underline-offset-2 hover:text-[var(--gold)]" onClick={() => onOpenPerson(desk.best!.id)}>{desk.best.name}</button> · {fmt(desk.best.score)}</> : undefined}>
                        {desk.onPlan} <span className="text-[1rem]" style={{ color: 'var(--text-muted)' }}>/ {desk.people}</span>
                    </Fact>
                    {desk.weakest ? (
                        <Fact label={t('Эң көп упай кеткен жер')} note={t('Планга жетпегендер: {0}.', desk.weakest.below.join(', '))}>
                            {metricName(desk.weakest.metric)} <span className="text-[1rem]" style={{ color: 'var(--danger)' }}>−{fmt(desk.weakest.missing)}</span>
                        </Fact>
                    ) : (
                        <Fact label={t('Эң көп упай кеткен жер')}>
                            <span style={{ color: 'var(--gold)' }}>{t('Бардык пландар аткарылды')}</span>
                        </Fact>
                    )}
                </div>
            ) : (
                <p className="px-5 sm:px-7 py-4 text-[0.9rem]" style={{ borderTop: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                    {desk.locked
                        ? t('Бул апта бекитилген: киргизилбеген маалымат нөл болуп эсептелди.')
                        : t('{0}-аптанын жыйынтыктары али киргизиле элек. Киргизгенден кийин үйүңүздүн орду, упайы жана эмнеге көңүл буруу керектиги ушул жерде чыгат.', desk.weekNumber)}
                </p>
            )}

            <button onClick={onOpenHouse} className="row-link w-full flex items-center justify-between gap-3 px-5 sm:px-7 py-3 text-[0.72rem] uppercase tracking-[0.2em]" style={{ borderTop: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                {t('Үйдүн толук отчету')}
                <ArrowRight className="w-4 h-4" style={{ color: 'var(--gold)' }} />
            </button>
        </section>
    );
};

// A ready reminder for the houses that haven't entered: shared straight to
// WhatsApp (or anywhere) on a phone, copied to the clipboard on a computer.
const ReminderButton: React.FC<{ weekNumber: number; houses: string[] }> = ({ weekNumber, houses }) => {
    const [copied, setCopied] = useState(false);
    const text = t('{0}-апта: {1} али маалымат киргизе элек. Сураныч, киргизип коюңуз: {2}', weekNumber, houses.join(', '), window.location.origin);
    const send = async () => {
        try {
            if (navigator.share) { await navigator.share({ text }); return; }
        } catch { /* closed the share sheet: fall back to copying */ }
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2500);
        } catch { window.prompt(t('Көчүрүп алыңыз:'), text); }
    };
    return (
        <button onClick={send} className="btn btn-ghost" aria-label={copied ? t('Көчүрүлдү') : t('Эскертүү жөнөтүү')} title={t('Эскертүү жөнөтүү')}>
            {copied ? <Check className="w-3.5 h-3.5" /> : <Send className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{copied ? t('Көчүрүлдү') : t('Эскертүү')}</span>
        </button>
    );
};

// The admin's desk: the week's progress at a glance (one segment per house),
// what to do next in one line, and every house as a tile — entered (✓ and its
// rating) or still missing (enter it for the captain). Any tile opens the
// data entry form for that house.
export const AdminDeskPanel: React.FC<{
    desk: AdminDesk;
    onEnterFor: (houseId: string) => void;
    onAdmin: () => void;
}> = ({ desk, onEnterFor, onAdmin }) => {
    const waiting = !desk.locked && desk.waiting.length > 0;
    const allIn = !desk.locked && desk.waiting.length === 0;
    return (
        <section className="card overflow-hidden animate-view-in" aria-label={t('Админ')} style={{ borderTop: '2px solid var(--gold)' }}>
            <div className="card-pad pb-5! sm:pb-6!">
                <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                        <div className="eyebrow" style={{ color: 'var(--gold)' }}>{t('Админ · {0}-апта', desk.weekNumber)}</div>
                        <div className="flex items-baseline gap-3 mt-1">
                            <span className="font-display text-[2.6rem] leading-none tabular" style={{ color: 'var(--text-primary)' }}>
                                {desk.entered}<span style={{ color: 'var(--text-muted)' }}> / {desk.total}</span>
                            </span>
                            <span className="text-[0.95rem]" style={{ color: 'var(--text-secondary)' }}>{t('үй киргизди')}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                        {waiting && <ReminderButton weekNumber={desk.weekNumber} houses={desk.waiting.map(h => h.name)} />}
                        <button onClick={onAdmin} className={`btn ${allIn ? 'btn-primary' : 'btn-ghost'}`} aria-label={t('Админ панели')} title={t('Админ панели')}>
                            <Settings className="w-3.5 h-3.5" /><span className="hidden sm:inline">{t('Админ панели')}</span>
                        </button>
                    </div>
                </div>
                {/* One segment per house: gold once it has entered. */}
                <div className="flex gap-1.5 mt-4" aria-hidden="true">
                    {[...desk.houses].sort((a, b) => Number(b.entered) - Number(a.entered)).map(h => (
                        <span key={h.id} className="flex-1 h-[3px] transition-colors" style={{ backgroundColor: h.entered ? 'var(--gold)' : 'var(--border-strong)' }} />
                    ))}
                </div>
                <p className="text-[0.88rem] mt-3" style={{ color: desk.locked ? 'var(--text-secondary)' : allIn ? 'var(--success)' : 'var(--text-secondary)' }}>
                    {desk.locked
                        ? <span className="inline-flex items-center gap-1.5"><Lock className="w-3.5 h-3.5" />{t('Апта бекитилген: жыйынтыктар акыркы.')}</span>
                        : allIn
                            ? t('Баары киргизди. Эми аптаны бекитсеңиз болот — жыйынтыктар акыркы болот.')
                            : t('Калды: {0}', desk.waiting.map(h => h.name).join(', '))}
                </p>
            </div>
            {/* Every house: a tile that opens its data entry; the missing ones first. */}
            <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5" style={{ borderTop: '1px solid var(--border)' }}>
                {[...desk.houses].sort((a, b) => Number(a.entered) - Number(b.entered)).map(h => {
                    const missing = !h.entered;
                    return (
                        <li key={h.id} style={{ boxShadow: '1px 0 0 var(--border), 0 1px 0 var(--border)' }}>
                            <button onClick={() => onEnterFor(h.id)} className="group row-link w-full h-full text-left px-5 py-4 flex flex-col gap-1.5"
                                aria-label={missing ? t('{0}: киргизүү', h.name) : t('{0}: өзгөртүү', h.name)}>
                                <span className="flex items-center gap-2 min-w-0">
                                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: TEAM_COLORS[h.colorIndex % TEAM_COLORS.length] }} />
                                    <span className="font-display text-[1.2rem] leading-tight truncate" style={{ color: 'var(--text-primary)' }}>{h.name}</span>
                                </span>
                                {missing
                                    ? desk.locked
                                        ? <span className="text-[0.82rem] italic" style={{ color: 'var(--danger)' }}>{t('киргизилген жок')}</span>
                                        : <span className="inline-flex items-center gap-1.5 text-[0.82rem]" style={{ color: 'var(--gold)' }}>
                                            <PenLine className="w-3.5 h-3.5" />{t('Киргизүү')}<ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                                        </span>
                                    : <span className="inline-flex items-center gap-1.5 text-[0.82rem]" style={{ color: 'var(--text-muted)' }}>
                                        <CheckCircle2 className="w-3.5 h-3.5" style={{ color: 'var(--success)' }} />
                                        {h.rating !== null ? <span className="font-display text-[1.05rem] tabular" style={{ color: 'var(--text-secondary)' }}>{fmt(h.rating)}</span> : t('киргизилди')}
                                    </span>}
                            </button>
                        </li>
                    );
                })}
            </ul>
        </section>
    );
};
