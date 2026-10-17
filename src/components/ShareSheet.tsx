import React, { useEffect, useRef, useState } from 'react';
import { Download, Loader2, Share2 } from 'lucide-react';
import type { DataFile } from '../types';
import type { Insights } from '../utils/insights';
import { seasonSummary, weekOf } from '../utils/insights';
import type { Award } from '../utils/badges';
import type { CardTheme } from '../utils/shareCards';
import { CARD_H, CARD_W, drawJamaatCard, drawPersonWeekCard, drawSeasonCard, drawWeekCard } from '../utils/shareCards';
import { Sheet } from './ui';
import { t } from '../i18n';

export type ShareTarget = { type: 'week'; card?: 'houses' | 'jamaat' | 'jamaat-season'; weekIndex?: number } | { type: 'person'; memberId: string; card?: 'week' | 'season' };

interface ShareSheetProps {
    data: DataFile;
    weekIndex: number;
    insights: Insights;
    awards: Award[];
    target: ShareTarget;
    siteTheme: CardTheme;
    seasonName: string;
    seasonFinished: boolean;
    onClose: () => void;
}

// Ready-made images for WhatsApp / Telegram: the week's results, a
// person's week, or a person's season — in night or day colors.
export const ShareSheet: React.FC<ShareSheetProps> = ({ data, weekIndex: selectedWeek, insights, awards, target, siteTheme, seasonName, seasonFinished, onClose }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [theme, setTheme] = useState<CardTheme>(siteTheme);
    const [card, setCard] = useState<'week' | 'season'>(target.type === 'person' ? target.card ?? 'week' : 'week');
    const [weekCard, setWeekCard] = useState<'houses' | 'jamaat' | 'jamaat-season'>(target.type === 'week' ? target.card ?? 'houses' : 'houses');
    const weekIndex = target.type === 'week' && target.weekIndex !== undefined ? target.weekIndex : selectedWeek;
    const [url, setUrl] = useState<string | null>(null);
    const [blob, setBlob] = useState<Blob | null>(null);
    const [status, setStatus] = useState<string | null>(null);

    const series = target.type === 'person' ? insights.members.get(target.memberId) : undefined;
    const weekNumber = data.weeks[weekIndex]?.weekNumber;
    const personWeek = series ? weekOf(series.weeks, weekIndex) ?? series.weeks[series.weeks.length - 1] : undefined;
    const title = target.type === 'week'
        ? (weekCard === 'jamaat' ? t('{0}-апта: жамаат', weekNumber) : weekCard === 'jamaat-season' ? t('Жамааттын сезону') : t('{0}-аптанын жыйынтыгы', weekNumber))
        : card === 'week' ? t('{0}: {1}-апта', series?.name ?? '', personWeek?.weekNumber) : t('{0}: сезон', series?.name ?? '');
    const fileName = target.type === 'week' ? (weekCard === 'jamaat-season' ? 'tdjamaat-sezon-jamaat.png' : `tdjamaat-${weekNumber}-apta${weekCard === 'jamaat' ? '-jamaat' : ''}.png`) : `tdjamaat-${(series?.name ?? 'adam').split(' ')[0]}-${card === 'week' ? `${personWeek?.weekNumber}-apta` : 'sezon'}.png`;

    useEffect(() => {
        let created: string | null = null;
        let cancelled = false;
        const canvas = canvasRef.current;
        if (!canvas) return;
        setUrl(null);
        const draw = async () => {
            if (target.type === 'week') {
                if (weekCard === 'jamaat') await drawJamaatCard(canvas, theme, data, insights, { kind: 'week', weekIndex });
                else if (weekCard === 'jamaat-season') await drawJamaatCard(canvas, theme, data, insights, { kind: 'season', seasonName });
                else await drawWeekCard(canvas, theme, data, weekIndex, insights);
            }
            else if (series) {
                const mine = awards.filter(a => a.holderId === series.id);
                if (card === 'week') {
                    const people = [...insights.members.values()].filter(m => weekOf(m.weeks, personWeek?.weekIndex ?? weekIndex)?.rank).length;
                    await drawPersonWeekCard(canvas, theme, series, personWeek?.weekIndex ?? weekIndex, mine, people);
                } else {
                    await drawSeasonCard(canvas, theme, series, seasonSummary(series, insights, data.weeks.length), mine, seasonName, seasonFinished);
                }
            }
            canvas.toBlob(b => {
                if (!b || cancelled) return;
                setBlob(b);
                created = URL.createObjectURL(b);
                setUrl(created);
            }, 'image/png');
        };
        draw();
        return () => { cancelled = true; if (created) URL.revokeObjectURL(created); };
    }, [data, weekIndex, insights, awards, target, series, personWeek, theme, card, weekCard, seasonName, seasonFinished]);

    const file = blob ? new File([blob], fileName, { type: 'image/png' }) : null;
    const canShareFile = !!file && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] });
    const share = async () => {
        if (!file) return;
        try {
            await navigator.share({ files: [file], title: `tdJamaat — ${title}` });
        } catch (err) {
            if ((err as Error)?.name !== 'AbortError') setStatus(t('Бөлүшүү мүмкүн болгон жок — сүрөттү жүктөп алып, кол менен жибериңиз.'));
        }
    };
    const download = () => {
        if (!url) return;
        const a = document.createElement('a');
        a.href = url; a.download = fileName;
        document.body.appendChild(a); a.click(); a.remove();
    };

    return (
        <Sheet
            title={title}
            onClose={onClose}
            width="34rem"
            footer={
                <div className="flex gap-2">
                    {canShareFile && <button className="btn btn-primary flex-1" onClick={share} disabled={!file}><Share2 className="w-4 h-4" />  {t('Бөлүшүү')}</button>}
                    <button className={`btn ${canShareFile ? 'btn-ghost' : 'btn-primary'} flex-1`} onClick={download} disabled={!url}><Download className="w-4 h-4" />  {t('Сүрөттү жүктөп алуу')}</button>
                </div>
            }
        >
            <div className="px-5 sm:px-7 py-5">
                <div className="flex flex-wrap items-center justify-between gap-y-2 mb-4">
                    {target.type === 'person' ? (
                        <div className="flex">
                            <button className={`chip ${card === 'week' ? 'is-active' : ''}`} onClick={() => setCard('week')}>{t('Апта')}</button>
                            <button className={`chip ${card === 'season' ? 'is-active' : ''}`} onClick={() => setCard('season')}>{t('Сезон')}</button>
                        </div>
                    ) : (
                        <div className="flex flex-wrap" role="group" aria-label={t('WhatsApp же Telegram үчүн даяр сүрөт')}>
                            <button className={`chip ${weekCard === 'houses' ? 'is-active' : ''}`} onClick={() => setWeekCard('houses')}>{t('Үйлөр')}</button>
                            <button className={`chip ${weekCard === 'jamaat' ? 'is-active' : ''}`} onClick={() => setWeekCard('jamaat')}>{t('Жамаат: апта')}</button>
                            <button className={`chip ${weekCard === 'jamaat-season' ? 'is-active' : ''}`} onClick={() => setWeekCard('jamaat-season')}>{t('Жамаат: сезон')}</button>
                        </div>
                    )}
                    <div className="flex" role="group" aria-label={t('Сүрөттүн түсү')}>
                        <button className={`chip ${theme === 'dark' ? 'is-active' : ''}`} onClick={() => setTheme('dark')}>{t('Түн')}</button>
                        <button className={`chip ${theme === 'light' ? 'is-active' : ''}`} onClick={() => setTheme('light')} style={{ marginRight: 0 }}>{t('Күн')}</button>
                    </div>
                </div>
                <canvas ref={canvasRef} className="hidden" />
                {url ? (
                    <img src={url} alt={title} className="w-full" style={{ boxShadow: 'var(--shadow-lift)', aspectRatio: `${CARD_W} / ${CARD_H}`, border: '1px solid var(--border)' }} />
                ) : (
                    <div className="w-full flex items-center justify-center gap-2" style={{ aspectRatio: `${CARD_W} / ${CARD_H}`, backgroundColor: 'var(--surface-2)', color: 'var(--text-muted)' }}>
                        <Loader2 className="w-5 h-5 animate-spin" />  {t('Даярдалууда…')}
                    </div>
                )}
                {status && <p className="text-[0.82rem] mt-3" style={{ color: 'var(--danger)' }}>{status}</p>}
            </div>
        </Sheet>
    );
};
