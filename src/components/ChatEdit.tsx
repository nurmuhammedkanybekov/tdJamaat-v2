// Editing one's own message, the same in every chat: the pencil by the time
// puts the text back in the box below, a strip above the box says what is
// being changed (with a way out), and the message then reads "өзгөртүлдү".
import React from 'react';
import { Pencil, X } from 'lucide-react';
import { t } from '../i18n';

export interface Editing { id: number; body: string }

export const EditButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
    <button onClick={onClick} aria-label={t('Өзгөртүү')} title={t('Өзгөртүү')} className="chat-delete chat-edit"><Pencil className="w-3.5 h-3.5" /></button>
);

export const EditedMark: React.FC<{ at: string | null }> = ({ at }) => (at ? <span className="chat-edited" title={new Date(at).toLocaleString()}>{t('өзгөртүлгөн')}</span> : null);

export const EditingBar: React.FC<{ editing: Editing; onCancel: () => void }> = ({ editing, onCancel }) => (
    <div className="chat-editing max-w-[42rem] mx-auto">
        <Pencil className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--gold)' }} />
        <div className="min-w-0 flex-1">
            <div className="chat-editing-h">{t('Билдирүүнү өзгөртүү')}</div>
            <div className="chat-editing-was">{editing.body}</div>
        </div>
        <button type="button" onClick={onCancel} aria-label={t('Жокко чыгаруу')} className="w-9 h-9 inline-flex items-center justify-center flex-shrink-0" style={{ color: 'var(--text-muted)' }}><X className="w-4 h-4" /></button>
    </div>
);
