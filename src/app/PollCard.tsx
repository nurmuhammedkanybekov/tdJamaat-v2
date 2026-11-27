// A poll in a jamaat chat: the question, the options with how many chose
// each, and the reader's own choice marked. And the form that makes one.
import React, { useState } from 'react';
import { Check, Loader2, Lock, Plus, X } from 'lucide-react';
import { t } from '../i18n';
import type { Poll } from '../services/jamaatChatService';

export const PollCard: React.FC<{ question: string; poll: Poll; me: string | null; canClose: boolean; onVote: (option: number, on: boolean) => void; onClose: () => void }> = ({ question, poll, me, canClose, onVote, onClose }) => {
    const voters = new Set(poll.votes.map(v => v.who)).size;
    const mine = new Set(poll.votes.filter(v => v.who === me).map(v => v.option));
    const max = Math.max(1, ...poll.options.map((_, i) => poll.votes.filter(v => v.option === i).length));
    const open = !poll.closed && !!me;
    return (
        <div className="poll">
            <div className="poll-kind">{poll.closed ? <><Lock className="w-3 h-3" />{t('Сурамжылоо жабылды')}</> : poll.multi ? t('Сурамжылоо · бир нече жооп') : t('Сурамжылоо · бир жооп')}</div>
            <div className="poll-q font-display">{question}</div>
            <ul className="poll-opts" role={poll.multi ? 'group' : 'radiogroup'}>
                {poll.options.map((o, i) => {
                    const n = poll.votes.filter(v => v.option === i).length;
                    const on = mine.has(i);
                    const lead = n > 0 && n === max;
                    return (
                        <li key={i}>
                            <button type="button" disabled={!open} onClick={() => onVote(i, !on)} role={poll.multi ? 'checkbox' : 'radio'} aria-checked={on} className="poll-opt" data-on={on || undefined} data-lead={lead || undefined}>
                                <span className={`poll-mark ${poll.multi ? 'is-box' : ''}`} aria-hidden="true">{on && <Check className="w-3 h-3" strokeWidth={2.6} />}</span>
                                <span className="poll-text">{o}</span>
                                <span className="poll-n tabular">{n}</span>
                                <i className="poll-bar" style={{ width: `${voters ? (n / voters) * 100 : 0}%` }} aria-hidden="true" />
                            </button>
                        </li>
                    );
                })}
            </ul>
            <div className="poll-foot">
                <span>{t('{0} киши катышты', voters)}</span>
                {canClose && !poll.closed && <button type="button" onClick={() => { if (window.confirm(t('Сурамжылоону жабасызбы? Мындан ары эч ким тандай албайт.'))) onClose(); }}>{t('Жабуу')}</button>}
            </div>
        </div>
    );
};

export const PollForm: React.FC<{ onSend: (q: string, options: string[], multi: boolean) => Promise<void>; onCancel: () => void }> = ({ onSend, onCancel }) => {
    const [q, setQ] = useState('');
    const [opts, setOpts] = useState(['', '']);
    const [multi, setMulti] = useState(false);
    const [busy, setBusy] = useState(false);
    const filled = opts.map(o => o.trim()).filter(Boolean);
    const ok = q.trim().length > 1 && filled.length >= 2 && new Set(filled).size === filled.length;
    return (
        <form className="poll-form max-w-[42rem] mx-auto" onSubmit={async e => { e.preventDefault(); if (!ok || busy) return; setBusy(true); try { await onSend(q, filled, multi); } finally { setBusy(false); } }}>
            <div className="flex items-center justify-between">
                <span className="eyebrow" style={{ color: 'var(--gold)' }}>{t('Жаңы сурамжылоо')}</span>
                <button type="button" onClick={onCancel} aria-label={t('Жабуу')} className="w-8 h-8 inline-flex items-center justify-center" style={{ color: 'var(--text-muted)' }}><X className="w-4 h-4" /></button>
            </div>
            <input value={q} onChange={e => setQ(e.target.value)} maxLength={300} placeholder={t('Суроо, мисалы: Жыйынды качан өткөрөбүз?')} aria-label={t('Суроо')} className="z-input font-display text-[1.15rem]" autoFocus />
            {opts.map((o, i) => (
                <div key={i} className="flex items-center gap-2">
                    <input value={o} onChange={e => setOpts(opts.map((x, j) => (j === i ? e.target.value : x)))} maxLength={80} placeholder={t('{0}-жооп', i + 1)} aria-label={t('{0}-жооп', i + 1)} className="z-input flex-1" />
                    {opts.length > 2 && <button type="button" onClick={() => setOpts(opts.filter((_, j) => j !== i))} aria-label={t('Өчүрүү')} className="w-8 h-8 inline-flex items-center justify-center" style={{ color: 'var(--text-muted)' }}><X className="w-4 h-4" /></button>}
                </div>
            ))}
            <div className="flex flex-wrap items-center justify-between gap-3 mt-3">
                {opts.length < 8 ? <button type="button" onClick={() => setOpts([...opts, ''])} className="z-new mt-0"><Plus className="w-4 h-4" />{t('Жооп кошуу')}</button> : <span />}
                <label className="inline-flex items-center gap-2 text-[0.85rem]" style={{ color: 'var(--text-secondary)' }}>
                    <input type="checkbox" checked={multi} onChange={e => setMulti(e.target.checked)} className="accent-[var(--gold)]" />{t('Бир нече жооп тандаса болот')}
                </label>
            </div>
            <div className="flex justify-end mt-3">
                <button type="submit" disabled={!ok || busy} className="btn btn-primary">{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}{t('Жөнөтүү')}</button>
            </div>
        </form>
    );
};
