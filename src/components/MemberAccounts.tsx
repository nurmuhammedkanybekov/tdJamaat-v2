// Мүчөлөрдүн кирүүсү: the captain writes each person's Gmail address; the
// person then signs in with Google and sees their own results, and the app's
// counts reach the captain's form. The admin can do it for every house.
import React, { useEffect, useMemo, useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import type { DataFile } from '../types';
import type { MemberAccount } from '../services/memberService';
import { fetchMemberAccounts, saveMemberAccount } from '../services/memberService';
import { Sheet } from './ui';
import { t } from '../i18n';

const Row: React.FC<{ name: string; account?: MemberAccount; onSave: (email: string) => Promise<void> }> = ({ name, account, onSave }) => {
    const [email, setEmail] = useState(account?.email ?? '');
    const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const [message, setMessage] = useState('');
    useEffect(() => { setEmail(account?.email ?? ''); }, [account?.email]);
    const changed = email.trim().toLowerCase() !== (account?.email ?? '');
    const valid = !email.trim() || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim());
    const save = async () => {
        setState('saving'); setMessage('');
        try { await onSave(email); setState('saved'); }
        catch (e) { setState('error'); setMessage(/duplicate|unique/i.test(String((e as Error)?.message)) ? t('Бул дарек башка адамга жазылган') : (e as Error)?.message ?? ''); }
    };
    return (
        <li className="account-row">
            <div className="min-w-0">
                <span className="block font-display text-[1.15rem] leading-tight truncate" style={{ color: 'var(--text-primary)' }}>{name}</span>
                <span className="block text-[0.72rem] italic" style={{ color: account?.linked ? 'var(--gold)' : 'var(--text-muted)' }}>
                    {account?.linked ? <span className="inline-flex items-center gap-1"><Check className="w-3 h-3" />{t('кирди')}</span> : account ? t('күтүүдө') : t('дарек жок')}
                </span>
            </div>
            <div className="flex items-center gap-2 min-w-0">
                <input type="email" inputMode="email" autoComplete="off" value={email} onChange={e => { setEmail(e.target.value); setState('idle'); }} placeholder="name@gmail.com" aria-label={t('{0}: Gmail дареги', name)} aria-invalid={!valid || undefined}
                    className="entry-input login-field flex-1 min-w-0 px-2 py-2 text-[0.95rem]" style={{ fontFamily: 'var(--font-serif)' }} />
                <button className="btn btn-ghost disabled:opacity-30" disabled={!changed || !valid || state === 'saving'} onClick={save}>
                    {state === 'saving' ? <Loader2 className="w-4 h-4 animate-spin" /> : state === 'saved' && !changed ? <Check className="w-4 h-4" /> : null}{t('Сактоо')}
                </button>
            </div>
            {state === 'error' && <p className="account-error text-[0.82rem]" style={{ color: 'var(--danger)' }}>{message}</p>}
        </li>
    );
};

export const MemberAccountsSheet: React.FC<{ data: DataFile; houseId: string | null; onClose: () => void }> = ({ data, houseId, onClose }) => {
    const latest = data.weeks[data.weeks.length - 1];
    const teams = useMemo(() => (latest?.teams ?? []).filter(tm => !houseId || tm.id === houseId), [latest, houseId]);
    const [pick, setPick] = useState(teams[0]?.id ?? '');
    const [accounts, setAccounts] = useState<MemberAccount[] | null | undefined>(undefined);
    const load = () => fetchMemberAccounts().then(setAccounts).catch(() => setAccounts(null));
    useEffect(() => { load(); }, []);
    const team = teams.find(tm => tm.id === pick) ?? teams[0];
    const byMember = new Map((accounts ?? []).map(a => [a.memberId, a]));
    return (
        <Sheet title={t('Мүчөлөрдүн кирүүсү')} onClose={onClose} width="34rem">
            <div className="px-5 sm:px-7 py-6">
                <p className="text-[0.92rem] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    {t('Адамдын Gmail дарегин жазыңыз. Ал «Google менен кирүү» аркылуу кирип, өз жыйынтыгын көрөт. Колдонмодогу сандары сиздин формаңызга бир басуу менен түшөт.')}
                </p>
                {!houseId && teams.length > 1 && (
                    <div className="chip-row mt-5" role="tablist">
                        {teams.map(tm => <button key={tm.id} role="tab" aria-selected={tm.id === team?.id} className={`chip ${tm.id === team?.id ? 'is-active' : ''}`} onClick={() => setPick(tm.id)}>{tm.name}</button>)}
                    </div>
                )}
                {accounts === undefined && <div className="py-10 flex justify-center"><div className="skeleton h-1 w-24" /></div>}
                {accounts === null && (
                    <p className="mt-6 px-4 py-3 text-[0.9rem]" style={{ borderLeft: '2px solid var(--gold)', color: 'var(--text-secondary)' }}>
                        {t('Бул үчүн админ supabase/members-2026-11.sql файлын иштетиши керек (SETUP.md).')}
                    </p>
                )}
                {accounts && team && (
                    <ul className="mt-4">
                        {team.members.map(m => (
                            <Row key={m.id} name={m.name} account={byMember.get(m.id)} onSave={async email => { await saveMemberAccount(m.id, email); await load(); }} />
                        ))}
                    </ul>
                )}
            </div>
        </Sheet>
    );
};
