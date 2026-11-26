// "Менин аккаунтум": opened from the round mark in the top bar. Who is here,
// the pages that are theirs (results, house, Жаттоо, conversations, prayer
// times) — and the way out, in plain sight.
import React, { useContext, useState } from 'react';
import { BookOpenCheck, ChartNoAxesColumn, Clock3, Compass, Home, LogOut, MessageCircle, Settings2, Sparkles, Trophy, Users } from 'lucide-react';
import { t } from '../i18n';
import { Sheet } from '../components/ui';
import { Avatar } from '../components/Avatar';
import { Mark } from '../components/Ornament';
import { AppContext } from './context';
import { useSelf } from './self';
import { go } from './route';
import { signOutMember } from '../services/memberService';
import { signOut } from '../services/authService';

const ROLE_NAME: Record<string, () => string> = {
    admin: () => t('Жамааттын админи'), leader: () => t('Капитан'), inspector: () => t('CL · Тазалык'), member: () => t('Мүчө')
};

/** The round mark in the top bar: the admin's seal, CL, or the person's initial. */
export const AccountMark: React.FC<{ onClick: () => void }> = ({ onClick }) => {
    const ctx = useContext(AppContext);
    const { self } = useSelf();
    const role = ctx.signedIn ? ctx.role : 'member';
    const name = self?.name ?? (ctx.member?.status === 'linked' ? ctx.member.link.name : '');
    const label = t('Менин аккаунтум');
    if (role === 'admin') return <button onClick={onClick} aria-label={label} title={label} className="mr-1 w-9 h-9 rounded-full inline-flex items-center justify-center chat-admin-seal"><Mark size={18} /></button>;
    if (role === 'inspector') return <button onClick={onClick} aria-label={label} title={label} className="mr-1 chat-cl-seal" style={{ width: '2.25rem', height: '2.25rem' }}>CL</button>;
    return <button onClick={onClick} aria-label={label} title={label} className="mr-1 w-9 h-9 rounded-full inline-flex items-center justify-center font-display text-[1.05rem]" style={{ border: '1px solid var(--gold)', color: 'var(--gold)' }}>{name ? name.slice(0, 1) : '·'}</button>;
};

export const AccountSheet: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const ctx = useContext(AppContext);
    const { self } = useSelf();
    const [busy, setBusy] = useState(false);
    const linked = ctx.member?.status === 'linked' ? ctx.member.link : null;
    const role = ctx.signedIn ? ctx.role ?? 'member' : 'member';
    const person = self ?? (linked ? { ...linked, via: 'google' as const } : null);
    const open = (hash: string) => { onClose(); go(hash); };

    const items: Array<{ key: string; icon: React.ComponentType<{ className?: string; strokeWidth?: number }>; label: string; sub?: string; to: string }> = [
        ...(person ? [
            { key: 'me', icon: ChartNoAxesColumn, label: t('Менин жыйынтыгым'), sub: t('Апта, сезон, сыйлыктар, бөлүшүү'), to: '#/house/me' },
            { key: 'jattoo', icon: BookOpenCheck, label: t('Жаттоо'), sub: t('Жаттаганым жана пландарым'), to: '#/house/me?jattoo' },
            { key: 'house', icon: Home, label: person.houseName, sub: t('Менин үйүм'), to: '#/house' }
        ] : []),
        ...(role === 'admin' ? [{ key: 'houses', icon: Home, label: t('Бардык үйлөр'), sub: t('Ар бир үй жана анын сөзү'), to: '#/house' }] : []),
        ...((ctx.signedIn && role !== 'inspector') || linked ? [{ key: 'jamaat', icon: Users, label: t('Жамааттын жыйынтыгы'), sub: t('Бирге окулган Куран, үйлөрдүн жарышы'), to: '#/jamaat' }] : []),
        ...(ctx.signedIn || linked ? [{ key: 'talk', icon: MessageCircle, label: t('Баарлашуу'), sub: t('Жамааттын сөзү жана башкалар'), to: '#/chat' }] : []),
        ...(ctx.signedIn && role !== 'inspector' ? [{ key: 'results', icon: Trophy, label: t('Жыйынтыктар'), sub: t('Үйлөрдүн апталык жарышы'), to: '#/overview' }] : []),
        ...(role === 'inspector' ? [{ key: 'tazalyk', icon: Sparkles, label: t('Тазалык'), sub: t('Үйлөрдү баалоо'), to: '#/overview' }] : []),
        { key: 'namaz', icon: Clock3, label: t('Намаз убактылары'), to: '#/namaz' },
        { key: 'qibla', icon: Compass, label: t('Кыбла'), to: '#/qibla' },
        ...(role === 'admin' ? [{ key: 'check', icon: Settings2, label: t('Кирүүнү текшерүү'), sub: t('Google менен кирүү кадам-кадамы менен'), to: '#/kiruu' }] : [])
    ];

    const leave = async () => {
        setBusy(true);
        try { if (ctx.signedIn) await signOut(); else await signOutMember(); } catch { /* signed out anyway */ }
        onClose();
        go('#/today');
        window.location.reload();
    };

    return (
        <Sheet title={t('Менин аккаунтум')} onClose={onClose} width="30rem">
            <div className="px-5 sm:px-7 pb-7">
                <div className="flex items-center gap-4 pt-5 pb-5" style={{ borderBottom: '1px solid var(--gold-dim)' }}>
                    {role === 'admin' ? <span className="chat-admin-seal" style={{ width: '3.5rem', height: '3.5rem' }}><Mark size={30} /></span>
                        : role === 'inspector' && !person ? <span className="chat-cl-seal" style={{ width: '3.5rem', height: '3.5rem', fontSize: '1.1rem' }}>CL</span>
                            : <Avatar name={person?.name ?? '?'} role={role === 'leader' ? 'imam' : 'member'} photoUrl={null} size="lg" />}
                    <div className="min-w-0">
                        <div className="font-display text-[1.6rem] leading-tight truncate" style={{ color: 'var(--text-primary)' }}>{role === 'admin' ? t('Админ') : role === 'inspector' ? 'CL' : person?.name ?? t('Мүчө')}</div>
                        <div className="eyebrow mt-1">{ROLE_NAME[role]?.()}{person && role !== 'admin' ? ` · ${person.houseName}` : ''}</div>
                    </div>
                </div>
                <ul>
                    {items.map(it => (
                        <li key={it.key} style={{ borderBottom: '1px solid var(--border)' }}>
                            <button onClick={() => open(it.to)} className="row-link w-full text-left py-3.5 px-1 flex items-center gap-4">
                                <it.icon className="w-5 h-5 flex-shrink-0" strokeWidth={1.4} />
                                <span className="flex-1 min-w-0">
                                    <span className="block text-[1.02rem]" style={{ color: 'var(--text-primary)' }}>{it.label}</span>
                                    {it.sub && <span className="block text-[0.8rem]" style={{ color: 'var(--text-muted)' }}>{it.sub}</span>}
                                </span>
                            </button>
                        </li>
                    ))}
                </ul>
                <button onClick={leave} disabled={busy} className="btn btn-ghost w-full mt-6" style={{ color: 'var(--danger)', borderColor: 'color-mix(in oklab, var(--danger) 45%, transparent)' }}>
                    <LogOut className="w-4 h-4" />{t('Аккаунттан чыгуу')}
                </button>
            </div>
        </Sheet>
    );
};
