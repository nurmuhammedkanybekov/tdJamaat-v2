import React from 'react';
import { weights } from '../utils/scoring';

interface FormulaDisplayProps {
    showFormula: boolean;
}

const codeStyle: React.CSSProperties = {
    backgroundColor: 'var(--text-primary)',
    color: '#4ade80',
    fontSize: '13px'
};

const section: React.CSSProperties = { paddingTop: '18px', paddingBottom: '18px', borderTop: '1px solid var(--border)' };

export const FormulaDisplay: React.FC<FormulaDisplayProps> = ({ showFormula }) => {
    if (!showFormula) return null;

    return (
        <div className="mb-7">
        <div className="p-6" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '4px' }}>
            <h3 className="font-serif text-lg font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Упай эсептөө формуласы</h3>

            <div style={{ ...section, borderTop: 'none', paddingTop: '14px' }}>
                <p className="font-semibold mb-2 text-sm" style={{ color: 'var(--text-secondary)' }}>1. Ар бир көрсөткүч үчүн ишке ашыруу пайызы</p>
                <code className="block p-3 rounded" style={codeStyle}>
                    Ишке ашыруу % = (Факт / Максат) × 100
                </code>
                <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>Эскертүү: Чектөө жок — максаттан канча гана ашса да эсептелет</p>
            </div>

            <div style={section}>
                <p className="font-semibold mb-2 text-sm" style={{ color: 'var(--text-secondary)' }}>2. Ар бир көрсөткүч үчүн упай</p>
                <code className="block p-3 rounded" style={codeStyle}>
                    Көрсөткүч упайы = (Ишке ашыруу % / 100) × Салмак
                </code>
                <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>Бул жогорку максаты барлар үчүн адилеттүүлүктү камсыз кылат</p>
            </div>

            <div style={section}>
                <p className="font-semibold mb-3 text-sm" style={{ color: 'var(--text-secondary)' }}>3. Салмактар (Weights)</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-2 text-sm">
                    {Object.entries(weights).map(([key, value]) => (
                        <div key={key} className="flex justify-between" style={{ color: 'var(--text-primary)' }}>
                            <span style={{ color: 'var(--text-muted)' }}>{key}</span>
                            <span className="font-semibold font-variant-tabular">{value}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div style={section}>
                <p className="font-semibold mb-2 text-sm" style={{ color: 'var(--text-secondary)' }}>4. Жалпы мүчө упайы</p>
                <code className="block p-3 rounded" style={codeStyle}>
                    Жалпы упай = Σ (Бардык көрсөткүчтөрдүн упайы)
                </code>
            </div>

            <div style={{ ...section, borderLeft: '2px solid var(--gold)', paddingLeft: '16px' }}>
                <p className="font-semibold mb-2 text-sm" style={{ color: 'var(--text-primary)' }}>Маанилүү: Командалардын рейтинги</p>
                <div className="text-sm space-y-2">
                    <p style={{ color: 'var(--text-secondary)' }}>Командалардын ортосундагы рейтинг <strong>орточо упайга</strong> негизделген (жалпы упайга эмес).</p>
                    <p style={{ color: 'var(--text-secondary)' }}>Себеби: Кээ бир командаларда аз адам бар, ошондуктан адилеттүүлүк үчүн орточо упай колдонулат.</p>
                    <code className="block p-2 rounded mt-2" style={codeStyle}>
                        Команда рейтинги = Орточо упай (Жалпы упай / Мүчөлөрдүн саны)
                    </code>
                </div>
            </div>

            <div style={{ ...section, borderLeft: '2px solid var(--accent)', paddingLeft: '16px' }}>
                <p className="font-semibold mb-2 text-sm" style={{ color: 'var(--text-primary)' }}>Мисал</p>
                <div className="text-sm space-y-1" style={{ color: 'var(--text-secondary)' }}>
                    {/* Computed from the live weights above, not hardcoded — so this
                        example can never drift out of sync with the real formula
                        the way the old "× 5.0" version did (К-К's actual weight is
                        45.0, not 5.0). */}
                    <p><strong>Жетекчи:</strong> К-К Максат=20, Факт=15 → 15/20=75% → 0.75 × {weights['К-К']} = <strong>{Math.round(0.75 * weights['К-К'] * 100) / 100} упай</strong></p>
                    <p><strong>Мүчө:</strong> К-К Максат=7, Факт=7 → 7/7=100% → 1.0 × {weights['К-К']} = <strong>{weights['К-К']} упай</strong></p>
                    <p className="mt-2" style={{ color: 'var(--accent)' }}>Экөө тең өз максаттарына жете албады/жетти, бирок упайлар максатка жараша адилеттүү</p>
                </div>
            </div>
        </div>
        </div>
    );
};
