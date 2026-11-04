// The week's top three: a podium on tablet/desktop (II · I · III, pedestals
// rising in turn), and three rows with metal rings on a phone.
import React from 'react';
import type { MemberSeries, MemberWeek } from '../utils/insights';
import { movement, ROLE_LABEL } from '../utils/insights';
import { Avatar } from './Avatar';
import { Movement } from './ui';
import { CountUp } from './motion';

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
const METAL = ['var(--metal-gold)', 'var(--metal-silver)', 'var(--metal-bronze)'];

// One of the week's top three, on a phone: a ring in the place's metal
// (photo inside if there is one), the Roman place, the name, the score.
export const Laureate: React.FC<{ s: MemberSeries; w: MemberWeek; weekIndex: number; onOpen: () => void; delay: number }> = ({ s, w, weekIndex, onOpen, delay }) => {
    const metal = METAL[(w.rank ?? 1) - 1] ?? METAL[2];
    return (
        <button onClick={onOpen} className="group flex items-center gap-4 text-left w-full py-4 pop-in" style={{ animationDelay: `${delay}ms` }}>
            <span className="relative flex-shrink-0 rounded-full p-[5px]" style={{ border: `1px solid ${metal}` }}>
                <Avatar name={s.name} role={w.member.role} photoUrl={w.member.photoUrl} size="lg" />
                <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-2 font-display text-[0.95rem] leading-none" style={{ color: metal, backgroundColor: 'var(--page-plane)' }}>{ROMAN[(w.rank ?? 1) - 1]}</span>
            </span>
            <span className="flex-1 min-w-0">
                <span className="block font-display text-[1.45rem] leading-tight line-clamp-2 transition-colors group-hover:text-[var(--gold)]" style={{ color: 'var(--text-primary)' }}>{w.member.name}</span>
                <span className="block text-[0.82rem] italic truncate" style={{ color: 'var(--text-muted)' }}>{w.houseName} · {ROLE_LABEL[w.member.role].toLowerCase()}</span>
            </span>
            <span className="flex-shrink-0 flex items-center gap-2">
                <CountUp value={w.score} className="font-display text-[1.9rem] leading-none tabular" style={{ color: 'var(--text-primary)' }} />
                <Movement delta={movement(s.weeks, weekIndex)} />
            </span>
        </button>
    );
};

// Tablet/desktop: a real podium — second, first, third — on pedestals that
// rise in turn; the winner is larger, with a slowly turning halo.
const PODIUM_ORDER = [1, 0, 2];
const PEDESTAL = ['h-28', 'h-20', 'h-14'];
export const Podium: React.FC<{ top: { s: MemberSeries; w: MemberWeek }[]; weekIndex: number; onOpen: (id: string) => void }> = ({ top, weekIndex, onOpen }) => (
    <div className="grid grid-cols-3 items-end gap-4 lg:gap-8 max-w-[56rem] mx-auto">
        {PODIUM_ORDER.map(i => top[i] ? { ...top[i], i } : null).map((x, col) => {
            if (!x) return <div key={`empty-${col}`} />;
            const { s, w, i } = x;
            const place = (w.rank ?? i + 1) - 1;
            const metal = METAL[place] ?? METAL[2];
            const first = i === 0;
            const delay = [450, 150, 700][i];
            return (
                <div key={s.id} className="flex flex-col items-center">
                    <button onClick={() => onOpen(s.id)} className="group flex flex-col items-center text-center w-full pop-in" style={{ animationDelay: `${delay + 350}ms` }}>
                        <span className="relative rounded-full p-[6px]" style={{ border: `1px solid ${metal}`, boxShadow: first ? `0 0 40px -6px color-mix(in oklab, ${metal} 60%, transparent)` : undefined }}>
                            {first && <span className="rays" aria-hidden="true" />}
                            {first && (
                                <svg className="absolute -inset-3 spin-halo pointer-events-none" viewBox="0 0 100 100" aria-hidden="true" style={{ width: 'calc(100% + 1.5rem)', height: 'calc(100% + 1.5rem)' }}>
                                    <circle cx="50" cy="50" r="48" fill="none" stroke={metal} strokeWidth="0.6" strokeDasharray="1.5 4.5" opacity="0.8" />
                                </svg>
                            )}
                            <Avatar name={s.name} role={w.member.role} photoUrl={w.member.photoUrl} size={first ? 'xl' : 'lg'} />
                        </span>
                        <span className={`block font-display leading-tight mt-4 truncate max-w-full transition-colors group-hover:text-[var(--gold)] ${first ? 'text-[1.9rem]' : 'text-[1.45rem]'}`} style={{ color: 'var(--text-primary)' }}>{w.member.name}</span>
                        <span className="block text-[0.8rem] italic truncate max-w-full" style={{ color: 'var(--text-muted)' }}>{w.houseName} · {ROLE_LABEL[w.member.role].toLowerCase()}</span>
                        <span className="flex items-center gap-2 mt-2">
                            <CountUp value={w.score} className={`font-display leading-none tabular ${first ? 'text-[2.6rem] gold-sheen' : 'text-[2rem]'}`} style={first ? undefined : { color: 'var(--text-primary)' }} />
                            <Movement delta={movement(s.weeks, weekIndex)} />
                        </span>
                    </button>
                    {/* The pedestal: a hairline block in the place's metal, engraved with the Roman place. */}
                    <div className={`pedestal relative w-full mt-5 ${PEDESTAL[place] ?? PEDESTAL[2]} flex items-start justify-center pt-3`}
                        style={{ animationDelay: `${delay}ms`, borderTop: `2px solid ${metal}`, background: `linear-gradient(180deg, color-mix(in oklab, ${metal} 16%, transparent), transparent)` }}>
                        <span className="font-display text-[1.6rem] leading-none" style={{ color: metal }}>{ROMAN[place]}</span>
                    </div>
                </div>
            );
        })}
    </div>
);

