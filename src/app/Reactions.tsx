// Reactions under a chat message, as in Telegram: one per person, ❤️ by a
// tap (or a double tap on the message), the rest from a small picker.
import React, { useEffect, useRef, useState } from 'react';
import { SmilePlus } from 'lucide-react';
import { t } from '../i18n';
import { REACTIONS, type Reaction } from '../services/reactions';

export const Reactions: React.FC<{
    list: Reaction[];
    me: string | null;
    /** null: take mine back */
    onPick: (emoji: string | null) => void;
    disabled?: boolean;
    align?: 'start' | 'end';
}> = ({ list, me, onPick, disabled, align = 'start' }) => {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (!open) return;
        const off = (e: MouseEvent | TouchEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
        document.addEventListener('mousedown', off); document.addEventListener('touchstart', off);
        return () => { document.removeEventListener('mousedown', off); document.removeEventListener('touchstart', off); };
    }, [open]);
    const mine = me ? list.find(r => r.who === me)?.emoji ?? null : null;
    const groups = REACTIONS.map(e => ({ e, n: list.filter(r => r.emoji === e).length })).filter(g => g.n > 0);
    const pick = (e: string) => { setOpen(false); onPick(mine === e ? null : e); };
    return (
        <div ref={ref} className={`reacts ${align === 'end' ? 'is-end' : ''}`}>
            {groups.map(g => (
                <button key={g.e} type="button" disabled={disabled} onClick={() => pick(g.e)} aria-pressed={mine === g.e} className={`react-chip ${mine === g.e ? 'is-mine' : ''}`}>
                    <span className="react-e">{g.e}</span><span className="tabular">{g.n}</span>
                </button>
            ))}
            {!disabled && (
                <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} aria-label={t('Реакция')} className="react-add"><SmilePlus className="w-3.5 h-3.5" /></button>
            )}
            {open && (
                <div className="react-pick pop-in" role="menu">
                    {REACTIONS.map(e => <button key={e} type="button" role="menuitem" onClick={() => pick(e)} className={mine === e ? 'is-mine' : ''}>{e}</button>)}
                </div>
            )}
        </div>
    );
};
