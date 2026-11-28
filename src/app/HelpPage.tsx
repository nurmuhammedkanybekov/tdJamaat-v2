// #/help — how to use the app, told to each kind of person separately. A
// captain who has never seen the site should be able to do a week's work
// from this page alone: where to go in, what to press, in what order.
import React, { useContext, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import type { Theme } from '../theme';
import { t } from '../i18n';
import { AppFrame } from './AppFrame';
import { AppContext } from './context';
import { go } from './route';
import { METRICS } from '../utils/insights';
import { metricName } from '../utils/metrics';

type Who = 'member' | 'leader' | 'inspector';
type Step = { title: string; body: string; where?: string; to?: string };

const steps = (who: Who): Step[] => {
    if (who === 'leader') return [
        { title: t('Кирүү'), body: t('«Капитан, CL же админ» бөлүмүндө үйүңүздү тандап, сыр сөздү жазасыз. Сыр сөз админде. Телефон кийин эстеп калат.'), where: t('Кирүү → Капитан'), to: '#/overview' },
        { title: t('Аптанын сандарын киргизүү'), body: t('Жыйынтыктар → «Маалымат кошуу». Ар бир адамдын сандары, андан кийин «Сактоо». Кийин оңдоого болот.'), where: t('Жыйынтыктар → Маалымат кошуу'), to: '#/overview' },
        { title: t('Мүчөлөрдү киргизүү'), body: t('«Мүчөлөрдүн кирүүсү» бөлүмүнө үйдөгүлөрдүн Gmail даректерин жазасыз. Алар Google менен кирип, өз жыйынтыгын көрөт. Колдонмодо санаганы формага өзү түшөт.'), where: t('Меню → Мүчөлөрдүн кирүүсү'), to: '#/overview' },
        { title: t('Жаттоону белгилөө'), body: t('Жатка айтып берилгенин ушул жерге жазасыз: ким, кайсы сүрө, кайсы аяттар. Упай бербейт, профилде көрүнөт.'), where: t('Меню → Жаттоо'), to: '#/overview' },
        { title: t('Пландар'), body: t('Үйдүн ар бир адамынын жаттоо, Куран жана китеп пландары. Көңүл керек болгондор биринчи турат. Мөөнөттү узартасыз, окуп бергенин «Угулду» деп белгилейсиз.'), where: t('Меню → Пландар'), to: '#/overview' },
        { title: t('Жыйында көрсөтүү'), body: t('«Чоң экран» режими проектор жана телевизор үчүн. «Аптанын жыйынтыгы» аптаны кыскача көрсөтөт.'), where: t('Меню → Чоң экран') },
        { title: t('Үйдүн чаты'), body: t('Үйдүн, капитандардын жана бүт жамааттын чаты. Билдирмелер ошол жерден күйөт.'), where: t('Меню → Чаттар'), to: '#/chat' },
        { title: t('Сурамжылоо жана жеке кат'), body: t('Чатта жазуунун жанындагы диаграмма баскычы сурамжылоо ачат. «Жеке каттар» бөлүмүндө жамааттагы каалаган адамга жеке жазасыз.'), where: t('Меню → Чаттар'), to: '#/chat' },
        { title: t('Топтор'), body: t('«Жаңы топ»: атын жазып, адамдарын тандайсыз. Аны ошол адамдар гана көрөт. Кийин атын, адамдарын өзгөртүп же жаап коёсуз.'), where: t('Меню → Чаттар → Жаңы топ'), to: '#/chat' }
    ];
    if (who === 'inspector') return [
        { title: t('Кирүү'), body: t('«Капитан, CL же админ» бөлүмүндө CL жана сыр сөз.'), where: t('Кирүү → CL'), to: '#/overview' },
        { title: t('Баалоо'), body: t('Ар бир бөлүккө 0дөн 5ке чейин. Админ тазалыкты күйгүзгөн аптада үйгө 25 упайга чейин кошулат.'), where: t('Жыйынтыктар → Тазалык'), to: '#/overview' },
        { title: t('Капитандар менен сүйлөшүү'), body: t('«Капитандар» чатын капитандар, CL жана админ гана көрөт.'), where: t('Меню → Чаттар'), to: '#/chat' }
    ];
    return [
        { title: t('Google менен кирүү'), body: t('Google аркылуу. Gmail дарегиңиз капитанда жазылган болушу керек.'), where: t('Кирүү → Мүчө'), to: '#/overview' },
        { title: t('Күн сайын'), body: t('«Менин күнүм»: кийинки намаз, бүгүнкү тасбихат, Куран.'), where: t('Менин күнүм'), to: '#/today' },
        { title: t('Санап туруу'), body: t('Колдонмодо саналган зикир, салават жана беттер капитандын формасына өзү түшөт.'), where: t('Зикир'), to: '#/zikr' },
        { title: t('Пландарым'), body: t('Жаттоо, Куран окуу жана китеп пландары. Жаттаганыңызды капитаныңызга окуп бергенде, ал «Угулду» деп белгилейт.'), where: t('Меню → Жаттоо'), to: '#/house/me?jattoo' },
        { title: t('Календарь жана орозо'), body: t('Хижрий күн, майрамдар жана сүннөт орозо күндөрү. Орозоңузду (ниет, кармадым, кармай албадым), каза эсебин, ар бир күндүн иштерин жана эскертмесин ушул жерде жүргүзөсүз.'), where: t('Меню → Календарь'), to: '#/calendar' },
        { title: t('Өз жыйынтыгыңыз'), body: t('Апталар, план, сыйлыктар жана жаттоо. Бөлүшүүгө болот.'), where: t('Меню → Менин барагым'), to: '#/house/me' },
        { title: t('Үй жана жамаат'), body: t('«Үйүм»: үйдүн адамдары жана чаты. «Жамааттын жыйынтыгы»: үйлөрдүн жарышы.'), where: t('Меню → Үйүм'), to: '#/house' },
        { title: t('Жеке кат'), body: t('Жамааттагы каалаган адамга жеке жаза аласыз. Аны экөөңүз гана көрөсүз.'), where: t('Чаттар → Жеке каттар'), to: '#/chat' },
        { title: t('Жооп берүү жана өзгөртүү'), body: t('Билдирүүнү басыңыз: жооп берүү, көчүрүү, өзгөртүү (48 саат ичинде) же өчүрүү чыгат. Жооп берилген билдирүү үстүндө көрүнүп турат.'), where: t('Чаттар'), to: '#/chat' },
        { title: t('Колдонмо катары'), body: t('Телефонго, планшетке же компьютерге колдонмо катары орнотсоңуз, бир басуу менен ачылат жана интернетсиз да иштейт.'), where: t('Меню → Колдонмону орнотуу'), to: '#/install' }
    ];
};

const WHO: Array<{ key: Who; label: () => string }> = [
    { key: 'member', label: () => t('Мүчө') }, { key: 'leader', label: () => t('Капитан') }, { key: 'inspector', label: () => 'CL' }
];

export const HelpPage: React.FC<{ theme: Theme; onToggleTheme: () => void }> = ({ theme, onToggleTheme }) => {
    const { signedIn, role } = useContext(AppContext);
    const mine: Who = signedIn && (role === 'leader' || role === 'inspector') ? role : role === 'admin' ? 'leader' : 'member';
    const [who, setWho] = useState<Who>(mine);
    const list = steps(who);
    return (
        <AppFrame page="help" title={t('Кантип колдонуу керек')} kicker={t('Жардам')} theme={theme} onToggleTheme={onToggleTheme}>
            <div className="max-w-[44rem] mx-auto pt-8">
                <div className="help-who" role="tablist" aria-label={t('Ким үчүн')}>
                    {WHO.map(w => (
                        <button key={w.key} role="tab" aria-selected={who === w.key} onClick={() => setWho(w.key)} className={who === w.key ? 'is-on' : ''}>
                            {w.label()}{w.key === mine && <span className="help-you">{t('сиз')}</span>}
                        </button>
                    ))}
                </div>

                <ol className="help-steps mt-10">
                    {list.map((s, i) => (
                        <li key={s.title}>
                            <span className="help-n font-display tabular" aria-hidden="true">{i + 1}</span>
                            <div className="min-w-0">
                                <h2 className="font-display text-[1.55rem] sm:text-[1.8rem] leading-tight" style={{ color: 'var(--text-primary)' }}>{s.title}</h2>
                                <p className="mt-2 text-[1rem] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{s.body}</p>
                                {s.where && (
                                    s.to
                                        ? <button onClick={() => go(s.to!)} className="help-where mt-3">{s.where}<ArrowRight className="w-3.5 h-3.5" /></button>
                                        : <span className="help-where mt-3">{s.where}</span>
                                )}
                            </div>
                        </li>
                    ))}
                </ol>

                {who !== 'inspector' && (
                    <section className="mt-16">
                        <div className="eyebrow" style={{ color: 'var(--gold)' }}>{t('Сегиз амал')}</div>
                        <p className="font-display text-[1.4rem] sm:text-[1.6rem] leading-snug mt-2" style={{ color: 'var(--text-primary)' }}>{t('Жумалык план ушул сегиз амалдан турат. План толук аткарылса 220 упай.')}</p>
                        <dl className="help-metrics mt-6">
                            {METRICS.map(m => (
                                <div key={m}><dt className="tabular">{m}</dt><dd>{metricName(m)}</dd></div>
                            ))}
                        </dl>
                    </section>
                )}

                <p className="mt-14 text-[0.9rem] italic" style={{ color: 'var(--text-muted)' }}>{t('Суроолор: «Чаттар» аркылуу админге.')}</p>
            </div>
        </AppFrame>
    );
};
