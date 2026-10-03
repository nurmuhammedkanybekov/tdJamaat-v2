import React from 'react';
import { MoreVertical, PlusSquare, Share } from 'lucide-react';
import { Sheet } from './ui';

// Shown where the browser has no install button of its own (Safari on
// iPhone/iPad): how to add tdJamaat to the home screen by hand.
export const InstallSheet: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const steps = ios
        ? [
            { icon: Share, text: <>Safari'де төмөнкү <b>«Бөлүшүү»</b> баскычын басыңыз.</> },
            { icon: PlusSquare, text: <>Тизмеден <b>«На экран „Домой“»</b> (Add to Home Screen) тандаңыз.</> },
            { icon: null, text: <>Жогору жактан <b>«Добавить»</b> басыңыз — tdJamaat иконкасы экранда пайда болот.</> }
        ]
        : [
            { icon: MoreVertical, text: <>Браузердин менюсун ачыңыз (⋮ же ⋯).</> },
            { icon: PlusSquare, text: <><b>«Установить приложение»</b> же <b>«Добавить на главный экран»</b> тандаңыз.</> },
            { icon: null, text: <>tdJamaat иконкасы телефондун экранында пайда болот.</> }
        ];
    return (
        <Sheet title="Телефонго орнотуу" onClose={onClose} width="30rem">
            <div className="px-5 sm:px-6 py-6">
                <div className="flex items-center gap-4 mb-6">
                    <img src="/favicon.svg" alt="" className="w-16 h-16 rounded-[16px]" style={{ boxShadow: 'var(--shadow-card)' }} />
                    <p className="text-[0.9rem]" style={{ color: 'var(--text-secondary)' }}>
                        tdJamaat'ты кадимки тиркеме сыяктуу экранга кошуп алыңыз: бир басуу менен ачылат, толук экранда, тез иштейт.
                    </p>
                </div>
                <ol className="space-y-3">
                    {steps.map((s, i) => (
                        <li key={i} className="card p-3.5 flex items-center gap-3">
                            <span className="w-8 h-8 rounded-full flex items-center justify-center font-display font-bold flex-shrink-0" style={{ backgroundColor: 'var(--gold-soft)', color: 'var(--gold)' }}>{i + 1}</span>
                            <span className="flex-1 text-[0.88rem]" style={{ color: 'var(--text-secondary)' }}>{s.text}</span>
                            {s.icon && <s.icon className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--accent)' }} />}
                        </li>
                    ))}
                </ol>
            </div>
        </Sheet>
    );
};
