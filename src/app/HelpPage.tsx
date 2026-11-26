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

type Who = 'member' | 'leader' | 'inspector' | 'admin';
type Step = { title: string; body: string; where?: string; to?: string };

const steps = (who: Who): Step[] => {
    if (who === 'leader') return [
        { title: t('Кирүү'), body: t('Кирүү бетинде «Капитан» деген жерди басып, үйүңүздүн сыр сөзүн жазыңыз. Сыр сөздү админден аласыз. Бир жолу киргенден кийин телефон эстеп калат.'), where: t('Кирүү → Капитан'), to: '#/overview' },
        { title: t('Аптанын сандарын киргизүү'), body: t('Ар жума «Жыйынтыктар» бетиндеги «Маалымат кошуу» баскычын басыңыз. Ар бир адамдын сандарын жазып, ылдыйдагы «Сактоо» баскычын басыңыз. Кийин оңдосоңуз да болот.'), where: t('Жыйынтыктар → Маалымат кошуу'), to: '#/overview' },
        { title: t('Мүчөлөрдү киргизүү'), body: t('Меню → «Мүчөлөрдүн кирүүсү». Ар бир адамдын Gmail дарегин жазыңыз. Ошондон кийин ал Google менен кирип, өз жыйынтыгын көрөт, зикир жана салаватын өзү санайт. Сиз аларды формада даяр көрөсүз.'), where: t('Меню → Мүчөлөрдүн кирүүсү'), to: '#/overview' },
        { title: t('Жаттоону белгилөө'), body: t('Бирөө жаттаганын жатка айтып бергенде, «Жаттоо» бетинен ошол адамды тандап, сүрөнү жана аяттарды белгилеңиз. Бул упай бербейт, бирок анын профилинде көрүнөт.'), where: t('Меню → Жаттоо'), to: '#/overview' },
        { title: t('Жыйында көрсөтүү'), body: t('Жыйында меню → «Чоң экран (жыйын үчүн)». Тамгалар чоңоюп, проектордо же телевизордо жакшы көрүнөт. «Аптанын жыйынтыгы» баскычы аптаны кыска окуя катары көрсөтөт.'), where: t('Меню → Чоң экран') },
        { title: t('Үйдүн сөзү'), body: t('«Баарлашуу» бетинде үйүңүздүн, капитандардын жана бүт жамааттын сөзү бар. Жаңы билдирүү келгенде телефон билдирсин десеңиз, ошол жерден күйгүзүңүз.'), where: t('Меню → Баарлашуу'), to: '#/chat' }
    ];
    if (who === 'inspector') return [
        { title: t('Кирүү'), body: t('Кирүү бетинде «CL» деген жерди басып, сыр сөзүңүздү жазыңыз.'), where: t('Кирүү → CL'), to: '#/overview' },
        { title: t('Баалоо'), body: t('Ар бир үйдүн ар бир бөлүгүнө 0дөн 5ке чейин баа коюңуз да, «Сактоо» баскычын басыңыз. Админ ошол аптада тазалыкты күйгүзгөн болсо, баа үйдүн упайына кошулат (25 упайга чейин).'), where: t('Жыйынтыктар → Тазалык'), to: '#/overview' },
        { title: t('Капитандар менен сүйлөшүү'), body: t('«Капитандар» сөзүн капитандар, CL жана админ гана көрөт.'), where: t('Меню → Баарлашуу'), to: '#/chat' }
    ];
    if (who === 'admin') return [
        { title: t('Апта ачуу'), body: t('Админ панелинен жаңы аптаны ачып, датасын коюңуз. Капитандар ошондон кийин сандарды киргизе алышат.'), where: t('Меню → Админ панели'), to: '#/overview' },
        { title: t('Капитандарды кармап туруу'), body: t('Аптанын башкы бетинде кайсы үй киргизди, кайсы үй киргизе элек экени көрүнөт. Баары киргизгенде аптаны кулпулаңыз.'), where: t('Жыйынтыктар → Апта'), to: '#/overview' },
        { title: t('Адамдар жана пландар'), body: t('Жаңы адам келсе же бирөө башка үйгө көчсө, админ панелиндеги тизмеден өзгөртүңүз. Пландар ролго жараша (капитан, орун басар, мүчө) коюлат.'), where: t('Меню → Админ панели') },
        { title: t('Баарлашуу'), body: t('Жаңы сөз ачып, аны ким көрөрүн тандай аласыз: бүт жамаат же капитандар гана. Админ жазганда баары «Админ» деген белгини көрөт.'), where: t('Баарлашуу → Сөз ачуу'), to: '#/chat' }
    ];
    return [
        { title: t('Google менен кирүү'), body: t('Кирүү бетинде «Google менен кирүү» баскычын басыңыз. Капитаныңыз Gmail дарегиңизди жазып койгон болушу керек. Болбосо ага айтыңыз.'), where: t('Кирүү → Мүчө'), to: '#/overview' },
        { title: t('Күн сайын'), body: t('«Менин күнүм» бетинде кийинки намаз, бүгүнкү тасбихат жана Куран окуу турат. Тасбихатты окуп бүткөндө белгилеп коюңуз.'), where: t('Менин күнүм'), to: '#/today' },
        { title: t('Санап туруу'), body: t('Зикир, салават жана окулган беттерди колдонмодо санасаңыз, жума сайын капитаныңыз аларды формада даяр көрөт. Кагазга жазуунун кереги жок.'), where: t('Зикир'), to: '#/zikr' },
        { title: t('Өз жыйынтыгыңыз'), body: t('Меню → «Менин жыйынтыгым». Ар бир аптаңыз, планга канчалык жеткениңиз, сыйлыктарыңыз жана жаттаганыңыз ушул жерде. Бөлүшсөңүз да болот.'), where: t('Меню → Менин жыйынтыгым'), to: '#/house/me' },
        { title: t('Үй жана жамаат'), body: t('Үйүңүздүн адамдарын жана сөзүн «Үйүм» бетинен, бүт жамааттын жарышын «Жамааттын жыйынтыгы» бетинен көрөсүз.'), where: t('Меню → Үйүм'), to: '#/house' }
    ];
};

const WHO: Array<{ key: Who; label: () => string }> = [
    { key: 'member', label: () => t('Мүчө') }, { key: 'leader', label: () => t('Капитан') }, { key: 'inspector', label: () => 'CL' }, { key: 'admin', label: () => t('Админ') }
];

export const HelpPage: React.FC<{ theme: Theme; onToggleTheme: () => void }> = ({ theme, onToggleTheme }) => {
    const { signedIn, role } = useContext(AppContext);
    const mine: Who = signedIn && (role === 'leader' || role === 'inspector' || role === 'admin') ? role : 'member';
    const [who, setWho] = useState<Who>(mine);
    const list = steps(who);
    return (
        <AppFrame page="today" title={t('Кантип колдонуу керек')} kicker={t('Жардам')} theme={theme} onToggleTheme={onToggleTheme}>
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
                        <p className="font-display text-[1.4rem] sm:text-[1.6rem] leading-snug mt-2" style={{ color: 'var(--text-primary)' }}>{t('Ар бир адамдын жумалык планы ушул сегизден турат. Планды аткарсаңыз 220 упай, ашык аткарсаңыз андан да көп.')}</p>
                        <dl className="help-metrics mt-6">
                            {METRICS.map(m => (
                                <div key={m}><dt className="tabular">{m}</dt><dd>{metricName(m)}</dd></div>
                            ))}
                        </dl>
                    </section>
                )}

                <p className="mt-14 text-[0.9rem] italic" style={{ color: 'var(--text-muted)' }}>{t('Дагы суроо болсо, «Баарлашуу» бетинен админге жазыңыз.')}</p>
            </div>
        </AppFrame>
    );
};
