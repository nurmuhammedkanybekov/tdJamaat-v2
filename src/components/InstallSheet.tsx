import React from 'react';
import { MoreHorizontal, MoreVertical, Share } from 'lucide-react';
import { isIos } from '../pwa';
import { Sheet } from './ui';
import { t } from '../i18n';

// Shown where the browser has no install button of its own. On iPhone/iPad
// Apple lets no website install itself: the only way is the browser's own
// "Add to Home Screen", so this explains where to find it.

// Apps that open links in their own window (no "Add to Home Screen" there).
const inAppBrowser = () => /Instagram|FBAN|FBAV|Telegram|WhatsApp|Line\//i.test(navigator.userAgent);
const otherIosBrowser = () => /CriOS|FxiOS|EdgiOS|OPiOS|YaBrowser/i.test(navigator.userAgent);

const Name: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <span style={{ color: 'var(--text-primary)' }}>{children}</span>
);

const Alt: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <span className="block text-[0.8rem] italic mt-0.5" style={{ color: 'var(--text-muted)' }}>{children}</span>
);

const Key: React.FC<{ icon: React.ElementType }> = ({ icon: Icon }) => (
    <span className="inline-flex items-center justify-center w-7 h-7 mx-0.5 align-middle rounded-full" style={{ border: '1px solid var(--border-strong)', color: 'var(--gold)' }}>
        <Icon className="w-3.5 h-3.5" strokeWidth={1.6} />
    </span>
);

export const InstallSheet: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const ios = isIos();
    const steps: React.ReactNode[] = ios
        ? [
            <><Name>{otherIosBrowser() ? t('Дарек сабындагы') : t('Төмөнкү')}</Name> <Key icon={MoreHorizontal} />  {t('же')} <Key icon={Share} />  {t('баскычын басыңыз.')}<Alt>{t('Эски iPhone\'дордо Бөлүшүү')} <Share className="inline w-3 h-3" />  {t('баскычы түз эле төмөндө турат.')}</Alt></>,
            <>{t('Тизмеден')} <Name>{t('«Бөлүшүү»')}</Name>{t(', андан кийин')} <Name>{t('«Экранга кошуу»')}</Name>  {t('тандаңыз.')}<Alt>{t('Add to Home Screen · На экран «Домой» · Főképernyőhöz adás')}</Alt></>,
            <>{t('Жогорку оң бурчтагы')} <Name>{t('«Кошуу»')}</Name>  {t('баскычын басыңыз.')}<Alt>{t('Add · Добавить · Hozzáadás')}</Alt></>
        ]
        : [
            <>{t('Браузердин менюсун ачыңыз')} <Key icon={MoreVertical} />.</>,
            <>{t('Тизмеден')} <Name>{t('«Тиркемени орнотуу»')}</Name>  {t('же')} <Name>{t('«Башкы экранга кошуу»')}</Name>  {t('тандаңыз.')}<Alt>{t('Install app · Add to Home screen · Установить приложение')}</Alt></>,
            <>{t('tdJamaat иконкасы телефондун экранында пайда болот.')}</>
        ];

    return (
        <Sheet title={t('Телефонго орнотуу')} onClose={onClose} width="30rem">
            <div className="px-5 sm:px-7 py-7">
                <div className="flex items-center gap-4">
                    <img src="/apple-touch-icon.png" alt="" className="flex-shrink-0 w-16 h-16 rounded-[16px]" style={{ border: '1px solid var(--border-strong)' }} />
                    <p className="text-[0.92rem]" style={{ color: 'var(--text-secondary)' }}>
                        
                        {t('tdJamaat экраныңызда кадимки тиркеме сыяктуу турат: бир басуу менен, толук экранда ачылат.')}
                    </p>
                </div>

                {ios && (
                    <p className="text-[0.85rem] italic mt-6 pl-3" style={{ color: 'var(--text-muted)', borderLeft: '1px solid var(--gold)' }}>
                        
                        {t('iPhone\'до сайттар өзүн-өзү орното албайт — Apple уруксат бербейт. Ошондуктан бул үч кадам колго жасалат, бир мүнөт да кетпейт.')}
                    </p>
                )}
                {inAppBrowser() && (
                    <p className="text-[0.85rem] mt-4 pl-3" style={{ color: 'var(--text-secondary)', borderLeft: '1px solid var(--danger)' }}>
                        {t('Шилтеме Telegram, WhatsApp же Instagram\'дын ичинде ачылып турат. Адегенде аны {0}\'де ачыңыз (меню → «{1}»).', ios ? 'Safari' : 'Chrome', ios ? 'Open in Safari' : 'Open in Chrome')}
                    </p>
                )}

                <ol className="mt-6">
                    {steps.map((s, i) => (
                        <li key={i} className="flex gap-4 py-4" style={{ borderTop: '1px solid var(--border)' }}>
                            <span className="font-display text-[1.6rem] leading-none w-6 flex-shrink-0 tabular" style={{ color: 'var(--gold)' }}>{i + 1}</span>
                            <span className="flex-1 text-[0.95rem] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{s}</span>
                        </li>
                    ))}
                </ol>
            </div>
        </Sheet>
    );
};
