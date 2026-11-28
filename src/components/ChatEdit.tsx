// The parts every chat shares (the house chat, the jamaat's chats, private
// messages): a message's text with its links, the quote of the message it
// answers, the quiet row of actions (answer, copy, change, remove) that shows
// when a message is touched (or the mouse is over it), and the strip above the
// box below saying what is being answered or changed.
import React, { useState } from 'react';
import { Check, Copy, CornerUpLeft, Pencil, Trash2, X } from 'lucide-react';
import { t } from '../i18n';

export interface Editing { id: number; body: string }
export interface Replying { id: number; who: string; body: string }

/** The text, with web addresses as links (opened in a new tab). */
const LINK = /(https?:\/\/[^\s<>"']+[^\s<>"'.,;:!?)\]])/g;
export const MessageText: React.FC<{ text: string }> = ({ text }) => {
    const parts = text.split(LINK);
    return <>{parts.map((p, i) => (i % 2 === 1 ? <a key={i} href={p} target="_blank" rel="noopener noreferrer nofollow" className="chat-link" onClick={e => e.stopPropagation()}>{p.replace(/^https?:\/\//, '')}</a> : <React.Fragment key={i}>{p}</React.Fragment>))}</>;
};

/** The message this one answers, quoted; a tap goes to it. */
export const Quote: React.FC<{ who: string | null; body: string | null; onClick?: () => void }> = ({ who, body, onClick }) => (
    <button type="button" className="chat-quote" onClick={e => { e.stopPropagation(); onClick?.(); }} disabled={!onClick}>
        <span className="chat-quote-who">{who ?? ''}</span>
        <span className="chat-quote-body">{body ?? t('Бул билдирүү өчүрүлгөн')}</span>
    </button>
);

/** Answer, copy, change, remove: shown when the message is touched or under the mouse. */
export const Acts: React.FC<{ text: string; onReply?: () => void; onEdit?: () => void; onDelete?: () => void }> = ({ text, onReply, onEdit, onDelete }) => {
    const [copied, setCopied] = useState(false);
    const copy = () => { navigator.clipboard?.writeText(text).then(() => { setCopied(true); window.setTimeout(() => setCopied(false), 1500); }).catch(() => undefined); };
    return (
        <span className="chat-acts" onClick={e => e.stopPropagation()}>
            {onReply && <button onClick={onReply} aria-label={t('Жооп берүү')} title={t('Жооп берүү')}><CornerUpLeft className="w-3.5 h-3.5" /></button>}
            <button onClick={copy} aria-label={t('Көчүрүү')} title={copied ? t('Көчүрүлдү') : t('Көчүрүү')}>{copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}</button>
            {onEdit && <button onClick={onEdit} aria-label={t('Өзгөртүү')} title={t('Өзгөртүү')}><Pencil className="w-3.5 h-3.5" /></button>}
            {onDelete && <button onClick={onDelete} aria-label={t('Өчүрүү')} title={t('Өчүрүү')} className="is-danger"><Trash2 className="w-3.5 h-3.5" /></button>}
        </span>
    );
};

export const EditedMark: React.FC<{ at: string | null }> = ({ at }) => (at ? <span className="chat-edited" title={new Date(at).toLocaleString()}>{t('өзгөртүлгөн')}</span> : null);

/** The strip above the box: what is being changed, or what is being answered. */
export const ComposerBar: React.FC<{ editing?: Editing | null; replying?: Replying | null; onCancel: () => void }> = ({ editing, replying, onCancel }) => {
    if (!editing && !replying) return null;
    return (
        <div className="chat-editing max-w-[42rem] mx-auto">
            {editing ? <Pencil className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--gold)' }} /> : <CornerUpLeft className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--gold)' }} />}
            <div className="min-w-0 flex-1">
                <div className="chat-editing-h">{editing ? t('Билдирүүнү өзгөртүү') : t('Жооп: {0}', replying!.who)}</div>
                <div className="chat-editing-was">{editing ? editing.body : replying!.body}</div>
            </div>
            <button type="button" onClick={onCancel} aria-label={t('Жокко чыгаруу')} className="w-9 h-9 inline-flex items-center justify-center flex-shrink-0" style={{ color: 'var(--text-muted)' }}><X className="w-4 h-4" /></button>
        </div>
    );
};
