import React from 'react';
import { weights } from '../utils/scoring';

interface FormulaDisplayProps {
    showFormula: boolean;
}

const codeStyle: React.CSSProperties = {
    backgroundColor: 'var(--text-primary)',
    color: '#4ade80'
};

export const FormulaDisplay: React.FC<FormulaDisplayProps> = ({ showFormula }) => {
    if (!showFormula) return null;

    return (
        <div
            className="rounded-2xl shadow-sm p-6 mb-6 border-2"
            style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--accent)' }}
        >
            <h3 className="text-xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Упай эсептөө формуласы</h3>
            <div className="space-y-4">
                <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--page-plane)' }}>
                    <p className="font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>1. Ар бир көрсөткүч үчүн ишке ашыруу пайызы:</p>
                    <code className="block p-3 rounded" style={codeStyle}>
                        Ишке ашыруу % = (Факт / Максат) × 100
                    </code>
                    <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>Эскертүү: Чектөө жок - максаттан канча гана ашса да эсептелет</p>
                </div>

                <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--page-plane)' }}>
                    <p className="font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>2. Ар бир көрсөткүч үчүн упай:</p>
                    <code className="block p-3 rounded" style={codeStyle}>
                        Көрсөткүч упайы = (Ишке ашыруу % / 100) × Салмак
                    </code>
                    <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>Бул жогорку максаты барлар үчүн адилеттүүлүктү камсыз кылат</p>
                </div>

                <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--page-plane)' }}>
                    <p className="font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>3. Салмактар (Weights):</p>
                    <div className="grid grid-cols-4 gap-2 text-sm">
                        {Object.entries(weights).map(([key, value]) => (
                            <div key={key} className="p-2 rounded border" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
                                <span className="font-semibold">{key}:</span> {value}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--page-plane)' }}>
                    <p className="font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>4. Жалпы мүчө упайы:</p>
                    <code className="block p-3 rounded" style={codeStyle}>
                        Жалпы упай = Σ (Бардык көрсөткүчтөрдүн упайы)
                    </code>
                </div>

                <div
                    className="p-4 rounded-lg border-2"
                    style={{ backgroundColor: 'color-mix(in oklab, #eda100 14%, var(--surface))', borderColor: '#eda100' }}
                >
                    <p className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>⚠️ МААНИЛҮҮ: Командалардын рейтинги</p>
                    <div className="text-sm space-y-2">
                        <p style={{ color: 'var(--text-secondary)' }}>Командалардын ортосундагы рейтинг <strong>ОРТОЧО УПАЙГА</strong> негизделген (жалпы упайга эмес).</p>
                        <p style={{ color: 'var(--text-secondary)' }}>Себеби: Кээ бир командаларда аз адам бар, ошондуктан адилеттүүлүк үчүн орточо упай колдонулат.</p>
                        <code className="block p-2 rounded mt-2" style={codeStyle}>
                            Команда рейтинги = Орточо упай (Жалпы упай / Мүчөлөрдүн саны)
                        </code>
                    </div>
                </div>

                <div
                    className="p-4 rounded-lg border-2"
                    style={{ backgroundColor: 'color-mix(in oklab, var(--accent) 10%, var(--surface))', borderColor: 'var(--accent)' }}
                >
                    <p className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Мисал:</p>
                    <div className="text-sm space-y-1" style={{ color: 'var(--text-secondary)' }}>
                        <p><strong>Жетекчи:</strong> К-К Максат=20, Факт=15 → 15/20=75% → 0.75 × 5.0 = <strong>3.75 упай</strong></p>
                        <p><strong>Мүчө:</strong> К-К Максат=7, Факт=7 → 7/7=100% → 1.0 × 5.0 = <strong>5 упай</strong></p>
                        <p className="mt-2" style={{ color: 'var(--accent)' }}>Экөө тең өз максаттарына жете албады/жетти, бирок упайлар максатка жараша адилеттүү</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
