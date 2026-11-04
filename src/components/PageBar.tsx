// The top of every tab except Week: the tab's name, and the controls that
// change what it shows (the week, or the season). Short, so the content
// starts on the first screen.
import React from 'react';
import { ChevronLeft, ChevronRight, Lock } from 'lucide-react';
import { t } from '../i18n';

export interface WeekControl { number: number; locked: boolean; canPrev: boolean; canNext: boolean; onPrev: () => void; onNext: () => void }
export interface SeasonControl { options: Array<{ id: number; name: string }>; selectedId: number; onChange: (id: number) => void }

export const WeekSwitch: React.FC<{ week: WeekControl }> = ({ week }) => (
    <div className="inline-flex items-center rounded-full p-1" style={{ border: '1px solid var(--border-strong)', backgroundColor: 'var(--surface)' }}>
        <button onClick={week.onPrev} disabled={!week.canPrev} aria-label={t('Мурунку апта')} className="w-8 h-8 inline-flex items-center justify-center rounded-full transition-colors disabled:opacity-25 hover:bg-[var(--surface-2)]" style={{ color: 'var(--text-secondary)' }}>
            <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="px-3 min-w-[6.5rem] text-center text-[0.92rem] font-medium tabular inline-flex items-center justify-center gap-1.5" style={{ color: 'var(--text-primary)' }} aria-live="polite">
            {t('{0}-апта', week.number)}
            {week.locked && <Lock className="w-3 h-3" style={{ color: 'var(--text-muted)' }} aria-label={t('кулпуланган')} />}
        </span>
        <button onClick={week.onNext} disabled={!week.canNext} aria-label={t('Кийинки апта')} className="w-8 h-8 inline-flex items-center justify-center rounded-full transition-colors disabled:opacity-25 hover:bg-[var(--surface-2)]" style={{ color: 'var(--text-secondary)' }}>
            <ChevronRight className="w-4 h-4" />
        </button>
    </div>
);

export const SeasonSwitch: React.FC<{ season: SeasonControl }> = ({ season }) => (
    <select
        value={season.selectedId}
        onChange={e => season.onChange(Number(e.target.value))}
        aria-label={t('Сезонду тандоо')}
        className="h-10 px-4 rounded-full text-[0.92rem]"
        style={{ border: '1px solid var(--border-strong)', backgroundColor: 'var(--surface)', color: 'var(--text-primary)' }}
    >
        {season.options.map(o => <option key={o.id} value={o.id}>{t('Сезон {0}', o.name)}</option>)}
    </select>
);

export const PageBar: React.FC<{ title: string; sub?: string; week?: WeekControl; season?: SeasonControl }> = ({ title, sub, week, season }) => (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 mb-8 sm:mb-10">
        <div className="min-w-0">
            <h1 className="font-display text-[2.2rem] sm:text-[2.8rem] leading-none" style={{ color: 'var(--text-primary)' }}>{title}</h1>
            {sub && <p className="text-[0.9rem] mt-2" style={{ color: 'var(--text-muted)' }}>{sub}</p>}
        </div>
        {(week || season) && (
            <div className="flex items-center gap-2">
                {season && <SeasonSwitch season={season} />}
                {week && <WeekSwitch week={week} />}
            </div>
        )}
    </div>
);
