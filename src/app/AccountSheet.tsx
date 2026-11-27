// The menu of the everyday pages: three lines and the person's own face in
// the top bar. It opens a drawer that names every place in the app in plain
// words (what it is, not just its title), grouped the way people think about
// them: my day, my results, the jamaat, and the account itself.
import React, { useContext, useEffect, useState } from 'react';
import { BookOpen, BookOpenCheck, ChartNoAxesColumn, CircleDot, CircleHelp, Clock3, Compass, Home, LogIn, LogOut, MessageCircle, ScrollText, Settings2, Sparkles, SunMedium, Trophy, UserRound, Users, X } from 'lucide-react';
import { t } from '../i18n';
import { Mark } from '../components/Ornament';
import { useModal } from '../hooks/useModal';
import { useBackCloses } from '../hooks/useBackCloses';
import { AppContext } from './context';
import { useSelf } from './self';
import { useMyPhoto } from './myPhoto';
import { go } from './route';
import { signOutMember } from '../services/memberService';
import { signOut } from '../services/authService';

const ROLE_NAME: Record<string, () => string> = {
    admin: () => t('Жамааттын админи'), leader: () => t('Капитан'), inspector: () => t('CL · Тазалык'), member: () => t('Мүчө'), guest: () => t('Жеке аккаунт')
};

// ---------------------------------------------------------------- my photo

/** A round face: the photo, or the first letter of the name on gold. */
const Face: React.FC<{ name: string; url: string | null; size: number }> = ({ name, url, size }) => {
    const [bad, setBad] = useState(false);
    useEffect(() => setBad(false), [url]);
    if (url && !bad) return <img src={url} alt="" referrerPolicy="no-referrer" onError={() => setBad(true)} className="rounded-full object-cover flex-shrink-0" style={{ width: size, height: size, boxShadow: '0 0 0 1px var(--gold), 0 0 0 3px var(--page-plane)' }} />;
    return (
        <span aria-hidden="true" className="rounded-full inline-flex items-center justify-center font-display flex-shrink-0" style={{ width: size, height: size, fontSize: size * 0.46, color: 'var(--gold)', border: '1px solid var(--gold)' }}>
            {name ? name.slice(0, 1) : '·'}
        </span>
    );
};

/** The menu button in the top bar: three lines, and who is here. */
export const AccountMark: React.FC<{ onClick: () => void }> = ({ onClick }) => {
    const ctx = useContext(AppContext);
    const { self } = useSelf();
    const own = useMyPhoto(self);
    const guest = ctx.member?.status === 'unlinked' && !ctx.signedIn ? ctx.member : null;
    const role = ctx.signedIn ? ctx.role : ctx.member?.status === 'linked' ? 'member' : guest ? 'guest' : null;
    const name = self?.name ?? (ctx.member?.status === 'linked' ? ctx.member.link.name : guest?.name ?? '');
    const photo = own ?? guest?.photo ?? null;
    return (
        <button onClick={onClick} aria-label={t('Меню')} title={t('Меню')} className="menu-pill mr-1">
            <span className="menu-lines" aria-hidden="true"><i /><i /><i /></span>
            {role === 'admin' ? <span className="chat-admin-seal" style={{ width: 30, height: 30 }}><Mark size={16} /></span>
                : role === 'inspector' && !self ? <span className="chat-cl-seal" style={{ width: 30, height: 30, fontSize: '0.62rem' }}>CL</span>
                    : role ? <Face name={name} url={photo} size={30} />
                        : null}
        </button>
    );
};

type Item = { key: string; icon: React.ComponentType<{ className?: string; strokeWidth?: number }>; label: string; sub: string; to: string; dot?: boolean };

export const AccountSheet: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const ctx = useContext(AppContext);
    const { self } = useSelf();
    const own = useMyPhoto(self);
    const [busy, setBusy] = useState(false);
    useModal(onClose);
    useBackCloses(onClose);
    const linked = ctx.member?.status === 'linked' ? ctx.member.link : null;
    const guest = ctx.member?.status === 'unlinked' && !ctx.signedIn ? ctx.member : null;
    const role = ctx.signedIn ? ctx.role ?? 'member' : linked ? 'member' : guest ? 'guest' : null;
    const photo = own ?? guest?.photo ?? null;
    const accountItem: Item = { key: 'account', icon: UserRound, label: t('Менин аккаунтум'), sub: t('Эмне сакталат; чыгуу же өчүрүү'), to: '#/account' };
    const person = self ?? (linked ? { ...linked, via: 'google' as const } : null);
    const here = window.location.hash.split('?')[0];
    const open = (hash: string) => { onClose(); go(hash); };
    const staff = ctx.signedIn && role !== 'inspector';

    const groups: Array<{ title: string; items: Item[] }> = [
        ...(person ? [{
            title: t('Мен'), items: [
                { key: 'me', icon: ChartNoAxesColumn, label: t('Менин жыйынтыгым'), sub: t('Апта, сезон, сыйлыктар'), to: '#/house/me' },
                { key: 'jattoo', icon: BookOpenCheck, label: t('Жаттоо'), sub: t('Жаттаганым жана пландарым'), to: '#/house/me?jattoo' },
                { key: 'house', icon: Home, label: person.houseName, sub: t('Үйүмдүн адамдары жана чаты'), to: '#/house' },
                ...(linked ? [accountItem] : [])
            ]
        }] : guest ? [{ title: t('Мен'), items: [accountItem] }] : []),
        ...(ctx.signedIn || linked ? [{
            title: t('Жамаат'), items: [
                ...(staff ? [{ key: 'results', icon: Trophy, label: t('Жыйынтыктар'), sub: ctx.role === 'admin' ? t('Апта, үйлөр, сезон, админ куралдары') : t('Апта, үйлөр, сезон; сандарды ушул жерден киргизесиз'), to: '#/overview' }] : []),
                ...(role === 'inspector' ? [{ key: 'tazalyk', icon: Sparkles, label: t('Тазалык'), sub: t('Үйлөрдү баалоо'), to: '#/overview' }] : []),
                ...(role !== 'inspector' ? [{ key: 'jamaat', icon: Users, label: t('Жамааттын жыйынтыгы'), sub: t('Үйлөрдүн жарышы жана бирге окулган Куран'), to: '#/jamaat' }] : []),
                ...(role === 'admin' ? [{ key: 'houses', icon: Home, label: t('Бардык үйлөр'), sub: t('Ар бир үй жана анын чаты'), to: '#/house' }] : []),
                { key: 'talk', icon: MessageCircle, label: t('Чаттар'), sub: t('Жамааттын, капитандардын жана үйдүн чаты'), to: '#/chat' }
            ]
        }] : []),
        {
            title: t('Күн сайын'), items: [
                { key: 'today', icon: SunMedium, label: t('Менин күнүм'), sub: t('Кийинки намаз, бүгүнкү тасбихат жана окуу'), to: '#/today' },
                { key: 'namaz', icon: Clock3, label: t('Намаз убактылары'), sub: t('Бүгүнкү жана бул аптанын убактылары'), to: '#/namaz' },
                { key: 'quran', icon: BookOpen, label: t('Куран'), sub: t('Сүрөлөр, мусхаф, кыргызча мааниси'), to: '#/quran' },
                { key: 'tasbihat', icon: ScrollText, label: t('Тасбихат'), sub: t('Ар бир намаздан кийинки зикирлер'), to: '#/tasbihat' },
                { key: 'zikr', icon: CircleDot, label: t('Зикир'), sub: t('Санагыч: басып эле санай бериңиз'), to: '#/zikr' },
                { key: 'qibla', icon: Compass, label: t('Кыбла'), sub: t('Телефондун компасы менен'), to: '#/qibla' }
            ]
        },
        {
            title: t('Жардам'), items: [
                { key: 'help', icon: CircleHelp, label: t('Кантип колдонуу керек'), sub: role === 'leader' || role === 'admin' ? t('Капитанга кадам-кадамы менен') : t('Кыскача, ар бир бөлүм эмне үчүн'), to: '#/help' },
                ...(role === 'admin' ? [{ key: 'check', icon: Settings2, label: t('Кирүүнү текшерүү'), sub: t('Google менен кирүү кадам-кадамы менен'), to: '#/kiruu' }] : [])
            ]
        }
    ];

    const leave = async () => {
        setBusy(true);
        try { if (ctx.signedIn) await signOut(); else await signOutMember(); } catch { /* signed out anyway */ }
        onClose();
        go('#/today');
        window.location.reload();
    };

    const name = role === 'admin' ? t('Админ') : role === 'inspector' && !person ? 'CL' : person?.name ?? guest?.name ?? '';
    return (
        <div className="fixed inset-0 z-50 animate-fade-in" role="dialog" aria-modal="true" aria-label={t('Меню')}
            style={{ backgroundColor: 'color-mix(in oklab, #000 55%, transparent)', backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)' }}
            onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
            <aside className="nav-drawer">
                <div className="flex items-center justify-between px-6 pt-4 pb-2" style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>
                    <span className="inline-flex items-center gap-2" style={{ color: 'var(--gold)' }}><Mark size={26} solid /><span className="font-display text-[1.15rem]">tdJamaat</span></span>
                    <button onClick={onClose} aria-label={t('Жабуу')} className="w-10 h-10 -mr-2 inline-flex items-center justify-center transition-colors hover:text-[var(--gold)]" style={{ color: 'var(--text-muted)' }}><X className="w-5 h-5" strokeWidth={1.3} /></button>
                </div>

                {/* Who is here */}
                {role ? (
                    <div className="nav-who">
                        {role === 'admin' ? <span className="chat-admin-seal" style={{ width: 64, height: 64 }}><Mark size={34} /></span>
                            : role === 'inspector' && !person ? <span className="chat-cl-seal" style={{ width: 64, height: 64, fontSize: '1.2rem' }}>CL</span>
                                : <Face name={name} url={photo} size={64} />}
                        <div className="min-w-0">
                            <div className="font-display text-[1.75rem] leading-[1.05] truncate" style={{ color: 'var(--text-primary)' }}>{name}</div>
                            <div className="text-[0.82rem] mt-1" style={{ color: 'var(--text-muted)' }}>{ROLE_NAME[role]?.()}{person && role !== 'admin' ? ` · ${person.houseName}` : ''}</div>
                            {guest && <div className="text-[0.82rem] truncate" style={{ color: 'var(--text-muted)' }}>{guest.email}</div>}
                        </div>
                    </div>
                ) : (
                    <div className="nav-who">
                        <div className="min-w-0">
                            <div className="font-display text-[1.5rem] leading-tight" style={{ color: 'var(--text-primary)' }}>{t('Сиз кире элексиз')}</div>
                            <div className="text-[0.85rem] mt-1" style={{ color: 'var(--text-muted)' }}>{t('Баары кирбей эле иштейт. Google менен кирсеңиз, санагандарыңыз ар бир түзмөгүңүздө сакталат.')}</div>
                            <button onClick={() => open('#/overview')} className="btn btn-primary mt-4"><LogIn className="w-4 h-4" />{t('Кирүү')}</button>
                        </div>
                    </div>
                )}

                <nav className="flex-1 overflow-y-auto overscroll-contain px-6 pb-4">
                    {groups.map(g => (
                        <section key={g.title} className="pt-5">
                            <h3 className="nav-group">{g.title}</h3>
                            <ul>
                                {g.items.map(it => {
                                    const current = it.to.split('?')[0] === here && !it.to.includes('?') && it.key !== 'tazalyk';
                                    return (
                                        <li key={it.key}>
                                            <button onClick={() => open(it.to)} className={`nav-item ${current ? 'is-here' : ''}`} aria-current={current ? 'page' : undefined}>
                                                <it.icon className="w-[1.15rem] h-[1.15rem] flex-shrink-0 mt-[0.2rem]" strokeWidth={1.3} />
                                                <span className="min-w-0">
                                                    <span className="nav-item-l">{it.label}</span>
                                                    <span className="nav-item-s">{it.sub}</span>
                                                </span>
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        </section>
                    ))}
                </nav>

                {role && (
                    <div className="px-6 pt-3" style={{ borderTop: '1px solid var(--border)', paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
                        <button onClick={leave} disabled={busy} className="w-full h-11 inline-flex items-center justify-center gap-2 text-[0.72rem] tracking-[0.2em] uppercase transition-opacity hover:opacity-80" style={{ color: 'var(--danger)' }}>
                            <LogOut className="w-4 h-4" />{t('Аккаунттан чыгуу')}
                        </button>
                    </div>
                )}
            </aside>
        </div>
    );
};
