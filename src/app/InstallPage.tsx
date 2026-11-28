// #/install — the app on one's own device: one tap where the browser can
// install it (Chrome, Edge, Android), and the steps where it can't be asked
// (iPhone and iPad, Safari on a Mac). The device in hand first; the others below.
import React from 'react';
import { Check, Download, Laptop, Monitor, Smartphone, Tablet } from 'lucide-react';
import type { Theme } from '../theme';
import { t } from '../i18n';
import { AppFrame } from './AppFrame';
import { useInstallPrompt } from '../pwa';

type Device = 'iphone' | 'ipad' | 'android' | 'mac-safari' | 'desktop' | 'firefox';

const detect = (): Device => {
    const ua = navigator.userAgent;
    const touchMac = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
    if (/ipad/i.test(ua) || touchMac) return 'ipad';
    if (/iphone|ipod/i.test(ua)) return 'iphone';
    if (/android/i.test(ua)) return 'android';
    if (/firefox/i.test(ua)) return 'firefox';
    if (/macintosh/i.test(ua) && /safari/i.test(ua) && !/chrome|chromium|edg/i.test(ua)) return 'mac-safari';
    return 'desktop';
};

const GUIDES: Record<Device, { icon: React.ComponentType<{ className?: string; strokeWidth?: number }>; name: () => string; steps: () => string[] }> = {
    iphone: { icon: Smartphone, name: () => t('iPhone'), steps: () => [t('Сайтты Safari менен ачыңыз.'), t('Төмөндөгү «Бөлүшүү» баскычын басыңыз (жебеси өйдө караган чарчы).'), t('«Башкы экранга кошуу» дегенди тандаңыз.'), t('«Кошуу» деп ырастаңыз. tdJamaat башка колдонмолордун жанында пайда болот.')] },
    ipad: { icon: Tablet, name: () => t('iPad'), steps: () => [t('Сайтты Safari менен ачыңыз.'), t('Жогору оң жактагы «Бөлүшүү» баскычын басыңыз.'), t('«Башкы экранга кошуу» дегенди тандаңыз.'), t('«Кошуу» деп ырастаңыз.')] },
    android: { icon: Smartphone, name: () => t('Android'), steps: () => [t('Сайтты Chrome менен ачыңыз.'), t('Жогорку оң бурчтагы үч чекитти басыңыз.'), t('«Колдонмону орнотуу» же «Башкы экранга кошуу» дегенди тандаңыз.'), t('«Орнотуу» деп ырастаңыз.')] },
    'mac-safari': { icon: Laptop, name: () => t('Mac, Safari'), steps: () => [t('Менюдан «Файл» → «Dock’ко кошуу» дегенди тандаңыз (macOS Sonoma жана жаңыраактары).'), t('«Кошуу» деп ырастаңыз. tdJamaat Dock’то өз терезеси менен ачылат.')] },
    desktop: { icon: Monitor, name: () => t('Компьютер: Chrome же Edge'), steps: () => [t('Дарек сабынын оң жагындагы орнотуу белгисин басыңыз (монитор жана жебе).'), t('Же менюдан: Chrome — «Сактоо жана бөлүшүү» → «Баракты колдонмо катары орнотуу»; Edge — «Колдонмолор» → «Бул сайтты колдонмо катары орнотуу».'), t('«Орнотуу» деп ырастаңыз. tdJamaat өз терезесинде ачылат жана Пуск менюсунда же Launchpad’да турат.')] },
    firefox: { icon: Monitor, name: () => t('Firefox'), steps: () => [t('Компьютердеги Firefox сайтты колдонмо катары орното албайт.'), t('Chrome, Edge же Safari менен ачып, ошол браузердин кадамдарын аткарыңыз. Телефондогу Firefox’то: меню → «Орнотуу».')] }
};
const ORDER: Device[] = ['iphone', 'android', 'ipad', 'desktop', 'mac-safari', 'firefox'];

const Guide: React.FC<{ d: Device; first?: boolean }> = ({ d, first }) => {
    const g = GUIDES[d];
    return (
        <section className={`install-guide ${first ? 'is-first' : ''}`}>
            <h2 className="install-h"><g.icon className="w-5 h-5" strokeWidth={1.4} /><span className="font-display">{g.name()}</span></h2>
            <ol className="install-steps">{g.steps().map((s, i) => <li key={i}><span className="font-display tabular" aria-hidden="true">{i + 1}</span><p>{s}</p></li>)}</ol>
        </section>
    );
};

export const InstallPage: React.FC<{ theme: Theme; onToggleTheme: () => void }> = ({ theme, onToggleTheme }) => {
    const { mode, install } = useInstallPrompt();
    const installed = typeof window !== 'undefined' && (window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true);
    const here = detect();
    return (
        <AppFrame page="help" title={t('Колдонмону орнотуу')} kicker={t('Телефон, планшет, компьютер')} theme={theme} onToggleTheme={onToggleTheme}>
            <div className="max-w-[40rem] mx-auto pt-8">
                <p className="text-center text-[1.02rem] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{t('tdJamaat колдонмо катары орнотулса, башкы экрандан бир басуу менен, өз терезесинде ачылат жана интернетсиз да иштейт (намаз убактылары, Куран, зикир). Дүкөндүн кереги жок, акысыз.')}</p>
                <div className="text-center mt-7">
                    {installed ? (
                        <p className="install-done"><Check className="w-4 h-4" />{t('Колдонмо ушул түзмөктө орнотулган.')}</p>
                    ) : mode === 'prompt' ? (
                        <button className="btn btn-primary" onClick={() => { install().catch(() => undefined); }}><Download className="w-4 h-4" />{t('Азыр орнотуу')}</button>
                    ) : null}
                </div>
                {!installed && <Guide d={here} first />}
                <div className="eyebrow text-center mt-14" style={{ color: 'var(--gold)' }}>{t('Башка түзмөктөр')}</div>
                {ORDER.filter(d => d !== here).map(d => <Guide key={d} d={d} />)}
            </div>
        </AppFrame>
    );
};
