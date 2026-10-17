import React from 'react';
import { MINI_CARD_POINTS, creditedPercentage, weights } from '../utils/scoring';
import { PLAN_SCORE } from '../utils/insights';
import { Sheet } from './ui';
import { t } from '../i18n';
import { metricLabel, metricName } from '../utils/metrics';
import type { MetricValues } from '../types';

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
    <Sheet title={t('Упай эсептөө формуласы')} onClose={onClose} width="40rem">
        <div className="px-4 sm:px-6 pb-6 text-[0.9rem]" style={{ color: 'var(--text-secondary)' }}>
            <Step n={1} title={t('Ар бир көрсөткүч боюнча аткаруу пайызы')}>
                <Formula>{t('Аткаруу % = Факт ÷ План × 100')}</Formula>
                <p className="text-[0.82rem] mt-2" style={{ color: 'var(--text-muted)' }}>{t('План коюлбаса (0), ал көрсөткүч 0% болот.')}</p>
            </Step>
            <Step n={2} title={t('Пландан ашканы: ар бир кошумча 100% азыраак упай берет')}>
                <Formula>{t('100%га чейин: эсептелген % = аткарылган %')}<br />{t('100%дан ашса: эсептелген % = 100% × (1 + ln(аткарылган % ÷ 100%))')}</Formula>
                <p className="text-[0.82rem] mt-2" style={{ color: 'var(--text-muted)' }}>{t('Көп аткаруу дайыма көбүрөөк упай берет, бирок бир эле көрсөткүчтү 8 эсе ашыруу бүт аптаны көтөрүп кетпейт. Эмгек эки эсе көбөйгөн сайын +69% кошулат:')}</p>
                <div className="grid grid-cols-5 mt-2 text-center tabular" style={{ border: '1px solid var(--border)' }}>
                    {[100, 200, 400, 800, 1600].map((x, i) => (
                        <div key={x} className="py-2" style={{ borderLeft: i ? '1px solid var(--border)' : undefined }}>
                            <div className="text-[0.75rem]" style={{ color: 'var(--text-muted)' }}>{x}%</div>
                            <div className="font-display text-[1.1rem]" style={{ color: 'var(--text-primary)' }}>{Math.round(creditedPercentage(x))}%</div>
                        </div>
                    ))}
                </div>
            </Step>
            <Step n={3} title={t('Ар бир көрсөткүч боюнча упай')}>
                <Formula>{t('Көрсөткүч упайы = (Эсептелген % ÷ 100) × Салмак')}</Formula>
                <p className="text-[0.82rem] mt-2" style={{ color: 'var(--text-muted)' }}>{t('Ар кимдин планы ролуна жараша — ошондуктан упай адилеттүү.')}</p>
            </Step>
            <Step n={4} title={t('Салмактар')}>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {Object.entries(weights).map(([key, value]) => (
                        <div key={key} className="flex items-baseline justify-between px-3 py-2 rounded-[8px]" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
                            <span className="font-bold" style={{ color: 'var(--text-muted)' }} title={metricName(key as keyof MetricValues)}>{metricLabel(key as keyof MetricValues)}</span>
                            <span className="font-display font-bold text-[1.15rem] tabular" style={{ color: 'var(--text-primary)' }}>{value}</span>
                        </div>
                    ))}
                </div>
                <p className="text-[0.82rem] mt-2" style={{ color: 'var(--text-muted)' }}>{t('Бардык планды так 100% аткарган адам')} <b>{PLAN_SCORE}</b>  {t('упай алат.')}</p>
            </Step>
            <Step n={5} title={t('Жалпы мүчө упайы')}>
                <Formula>{t('Жалпы упай = Σ бардык көрсөткүчтөрдүн упайы')}</Formula>
            </Step>
            <Step n={6} title={t('Үйлөрдүн рейтинги')}>
                <Formula>{t('Үй рейтинги = Мүчөлөрдүн орточо упайы + Мини-карта')}</Formula>
                <p className="text-[0.82rem] mt-2" style={{ color: 'var(--text-muted)' }}>{t('Үйлөрдө адам саны ар башка, ошондуктан жалпы эмес,')} <b>{t('орточо')}</b>  {t('упай алынат.')}</p>
                <Formula>{t('Мини-карта = Σ (Факт ÷ План, эң көп 100%) × {0}', MINI_CARD_POINTS)}</Formula>
                <p className="text-[0.82rem] mt-2" style={{ color: 'var(--text-muted)' }}>{t('Үй ал аптанын маалыматын киргизе элек болсо, апта ачык турганда «—» көрсөтүлөт жана эсепке кирбейт. Админ аптаны кулпулагандан кийин, киргизбеген үй ал апта үчүн 0 алат.')}</p>
                <p className="text-[0.82rem] mt-2" style={{ color: 'var(--text-muted)' }}>{t('7 иштин ар бири толук аткарылса {0} упай, бардыгы — {1} упай. Ар бир иш 100% менен чектелет: мисалы, СПОРТ планы 1 болсо, 7 жолу кылуу 700% болуп кетпейт.', MINI_CARD_POINTS, MINI_CARD_POINTS * 7)}</p>
            </Step>
            <section className="pt-5" style={{ borderTop: '1px solid var(--border)' }}>
                <div className="eyebrow mb-2" style={{ color: 'var(--gold)' }}>{t('Мисал')}</div>
                <div className="space-y-1.5 pl-3" style={{ borderLeft: '2px solid var(--gold)' }}>
                    <p><b>{t('Капитан:')}</b> {t('{0}: план 20, факт 15 → 75% → 0.75 × {1} =', metricLabel('К-К'), weights['К-К'])} <b>{t('{0} упай', Math.round(0.75 * weights['К-К'] * 100) / 100)}</b></p>
                    <p><b>{t('Мүчө:')}</b> {t('{0}: план 7, факт 7 → 100% → 1.0 × {1} =', metricLabel('К-К'), weights['К-К'])} <b>{t('{0} упай', weights['К-К'])}</b></p>
                    <p><b>{t('Мүчө:')}</b> {t('{0}: план 7, факт 28 → 400% → эсептелгени {1}% → {2} × {3} =', metricLabel('К-К'), Math.round(creditedPercentage(400)), (creditedPercentage(400) / 100).toFixed(2), weights['К-К'])} <b>{t('{0} упай', Math.round(creditedPercentage(400) / 100 * weights['К-К'] * 10) / 10)}</b> {t('(мурда {0} болчу)', 4 * weights['К-К'])}</p>
                </div>
            </section>
        </div>
    </Sheet>
);
