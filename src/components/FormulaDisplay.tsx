import React from 'react';
import { MINI_CARD_POINTS, creditedPercentage, weights } from '../utils/scoring';
import { PLAN_SCORE } from '../utils/insights';
import { Sheet } from './ui';

const Formula: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="font-display text-[1.15rem] sm:text-[1.3rem] font-semibold px-4 py-3 rounded-[8px] text-center tabular" style={{ backgroundColor: 'var(--accent-soft)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}>
        {children}
    </div>
);

const Step: React.FC<{ n: number; title: string; children: React.ReactNode }> = ({ n, title, children }) => (
    <section className="py-5" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2.5 mb-3">
            <span className="w-7 h-7 rounded-full flex items-center justify-center font-display font-bold text-[0.95rem]" style={{ backgroundColor: 'var(--gold-soft)', color: 'var(--gold)', border: '1px solid color-mix(in oklab, var(--gold) 40%, transparent)' }}>{n}</span>
            <h3 className="font-bold text-[0.95rem]" style={{ color: 'var(--text-primary)' }}>{title}</h3>
        </div>
        {children}
    </section>
);

export const FormulaSheet: React.FC<{ onClose: () => void }> = ({ onClose }) => (
    <Sheet title="Упай эсептөө формуласы" onClose={onClose} width="40rem">
        <div className="px-4 sm:px-6 pb-6 text-[0.9rem]" style={{ color: 'var(--text-secondary)' }}>
            <Step n={1} title="Ар бир көрсөткүч үчүн ишке ашыруу пайызы">
                <Formula>Ишке ашыруу % = Факт ÷ План × 100</Formula>
                <p className="text-[0.82rem] mt-2" style={{ color: 'var(--text-muted)' }}>План коюлбаса (0), ал көрсөткүч 0% болот.</p>
            </Step>
            <Step n={2} title="Пландан ашканы: ар бир кошумча 100% азыраак упай берет">
                <Formula>100%га чейин: эсептелет = аткарылганы<br />100%дан ашса: эсептелет = 100% × (1 + ln(аткарылганы ÷ 100%))</Formula>
                <p className="text-[0.82rem] mt-2" style={{ color: 'var(--text-muted)' }}>Көп аткаруу дайыма көбүрөөк упай берет, бирок бир эле көрсөткүчтү 8 эсе ашыруу бүт аптаны көтөрүп кетпейт. Эмгек эки эсе көбөйгөн сайын +69% кошулат:</p>
                <div className="grid grid-cols-5 mt-2 text-center tabular" style={{ border: '1px solid var(--border)' }}>
                    {[100, 200, 400, 800, 1600].map((x, i) => (
                        <div key={x} className="py-2" style={{ borderLeft: i ? '1px solid var(--border)' : undefined }}>
                            <div className="text-[0.75rem]" style={{ color: 'var(--text-muted)' }}>{x}%</div>
                            <div className="font-display text-[1.1rem]" style={{ color: 'var(--text-primary)' }}>{Math.round(creditedPercentage(x))}%</div>
                        </div>
                    ))}
                </div>
            </Step>
            <Step n={3} title="Ар бир көрсөткүч үчүн упай">
                <Formula>Көрсөткүч упайы = (Эсептелген % ÷ 100) × Салмак</Formula>
                <p className="text-[0.82rem] mt-2" style={{ color: 'var(--text-muted)' }}>Ар кимдин планы ролуна жараша — ошондуктан упай адилеттүү.</p>
            </Step>
            <Step n={4} title="Салмактар">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {Object.entries(weights).map(([key, value]) => (
                        <div key={key} className="flex items-baseline justify-between px-3 py-2 rounded-[8px]" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
                            <span className="font-bold" style={{ color: 'var(--text-muted)' }}>{key}</span>
                            <span className="font-display font-bold text-[1.15rem] tabular" style={{ color: 'var(--text-primary)' }}>{value}</span>
                        </div>
                    ))}
                </div>
                <p className="text-[0.82rem] mt-2" style={{ color: 'var(--text-muted)' }}>Бардык планды так 100% аткарган адам <b>{PLAN_SCORE}</b> упай алат.</p>
            </Step>
            <Step n={5} title="Жалпы мүчө упайы">
                <Formula>Жалпы упай = Σ бардык көрсөткүчтөрдүн упайы</Formula>
            </Step>
            <Step n={6} title="Үйлөрдүн рейтинги">
                <Formula>Үй рейтинги = Мүчөлөрдүн орточо упайы + Мини-карта</Formula>
                <p className="text-[0.82rem] mt-2" style={{ color: 'var(--text-muted)' }}>Үйлөрдө адам саны ар башка, ошондуктан жалпы эмес, <b>орточо</b> упай алынат.</p>
                <Formula>Мини-карта = Σ (Факт ÷ План, эң көп 100%) × {MINI_CARD_POINTS}</Formula>
                <p className="text-[0.82rem] mt-2" style={{ color: 'var(--text-muted)' }}>Үй ал аптанын маалыматын киргизе элек болсо, апта ачык турганда «—» көрсөтүлөт жана эсепке кирбейт. Админ аптаны кулпулагандан кийин, киргизбеген үй ал апта үчүн 0 алат.</p>
                <p className="text-[0.82rem] mt-2" style={{ color: 'var(--text-muted)' }}>7 иштин ар бири толук аткарылса {MINI_CARD_POINTS} упай, бардыгы — {MINI_CARD_POINTS * 7} упай. Ар бир иш 100% менен чектелет: мисалы, СПОРТ планы 1 болсо, 7 жолу кылуу 700% болуп кетпейт.</p>
            </Step>
            <section className="pt-5" style={{ borderTop: '1px solid var(--border)' }}>
                <div className="eyebrow mb-2" style={{ color: 'var(--gold)' }}>Мисал</div>
                <div className="space-y-1.5 pl-3" style={{ borderLeft: '2px solid var(--gold)' }}>
                    <p><b>Капитан:</b> К-К план 20, факт 15 → 75% → 0.75 × {weights['К-К']} = <b>{Math.round(0.75 * weights['К-К'] * 100) / 100} упай</b></p>
                    <p><b>Мүчө:</b> К-К план 7, факт 7 → 100% → 1.0 × {weights['К-К']} = <b>{weights['К-К']} упай</b></p>
                    <p><b>Мүчө:</b> К-К план 7, факт 28 → 400% → эсептелет {Math.round(creditedPercentage(400))}% → {(creditedPercentage(400) / 100).toFixed(2)} × {weights['К-К']} = <b>{Math.round(creditedPercentage(400) / 100 * weights['К-К'] * 10) / 10} упай</b> (мурда {4 * weights['К-К']} болчу)</p>
                </div>
            </section>
        </div>
    </Sheet>
);
