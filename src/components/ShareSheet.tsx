import React, { useEffect, useRef, useState } from 'react';
import { Download, Loader2, Share2 } from 'lucide-react';
import type { DataFile } from '../types';
import type { Insights } from '../utils/insights';
import { weekOf } from '../utils/insights';
import { Sheet } from './ui';

// Weekly results as an image (1080×1350, the portrait size WhatsApp,
// Telegram and Instagram show uncropped), drawn on a canvas so it needs no
// server: house ranking + the week's top three people, in the site's
// navy/gold with the shyrdak lattice and horn trim.

interface ShareSheetProps {
    data: DataFile;
    weekIndex: number;
    insights: Insights;
    onClose: () => void;
}

const W = 1080, H = 1350;
const NIGHT = '#0c0c0d', GOLD = '#c9a961', GOLD_DIM = '#8c7646', INK = '#ece7db', MUTED = '#8a857a', LINE = '#2f2e2b';
const DISPLAY = '"Oranienbaum", Georgia, serif';
const TEXT = '"Spectral", Georgia, serif';
const ROMAN = ['I', 'II', 'III'];

const fmt = (n: number) => (Math.round(n * 10) / 10).toString();

const fitText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number) => {
    if (ctx.measureText(text).width <= maxWidth) return text;
    let t = text;
    while (t.length > 1 && ctx.measureText(t + '…').width > maxWidth) t = t.slice(0, -1);
    return t + '…';
};

// Letterspaced caps (canvas letterSpacing isn't everywhere yet).
const spaced = (ctx: CanvasRenderingContext2D, text: string, x: number, y: number, spacing: number, align: 'left' | 'center' = 'left') => {
    const chars = [...text];
    const width = chars.reduce((w, c) => w + ctx.measureText(c).width + spacing, -spacing);
    let cx = align === 'center' ? x - width / 2 : x;
    ctx.textAlign = 'left';
    chars.forEach(c => { ctx.fillText(c, cx, y); cx += ctx.measureText(c).width + spacing; });
};

const HORN = [
    'M50 64 C50 42 58 28 71 25 C85 22 92 35 87 45 C82 54 70 53 70 45 C70 39 76 37 79 41',
    'M50 64 C50 42 42 28 29 25 C15 22 8 35 13 45 C18 54 30 53 30 45 C30 39 24 37 21 41',
    'M50 64 L50 80', 'M50 78 L56 86 L50 94 L44 86 Z'
];
const CORNER = ['M6 54 L6 24 C6 12 14 6 26 6 L54 6', 'M6 30 C6 20 12 16 20 16 C28 16 30 24 25 28 C21 31 16 28 18 24'];

const strokePaths = (ctx: CanvasRenderingContext2D, paths: string[], x: number, y: number, scale: number, rot = 0, width = 2) => {
    ctx.save();
    ctx.translate(x, y); ctx.rotate(rot); ctx.scale(scale, scale);
    ctx.lineWidth = width / scale; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    paths.forEach(d => ctx.stroke(new Path2D(d)));
    ctx.restore();
};

async function drawCard(canvas: HTMLCanvasElement, data: DataFile, weekIndex: number, insights: Insights) {
    await Promise.all([
        document.fonts.load(`400 80px "Oranienbaum"`),
        document.fonts.load(`400 30px "Spectral"`),
        document.fonts.load(`italic 400 30px "Spectral"`)
    ]).catch(() => undefined);
    const ctx = canvas.getContext('2d')!;
    canvas.width = W; canvas.height = H;
    const week = data.weeks[weekIndex];

    ctx.fillStyle = NIGHT; ctx.fillRect(0, 0, W, H);
    const glow = ctx.createRadialGradient(W / 2, 260, 0, W / 2, 260, 700);
    glow.addColorStop(0, 'rgba(201,169,97,0.07)'); glow.addColorStop(1, 'rgba(201,169,97,0)');
    ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);

    // Frame: hairline + сынган мүйүз corners
    ctx.strokeStyle = LINE; ctx.lineWidth = 1.5;
    ctx.strokeRect(54, 54, W - 108, H - 108);
    ctx.strokeStyle = GOLD;
    strokePaths(ctx, CORNER, 40, 40, 1.1, 0, 1.6);
    strokePaths(ctx, CORNER, W - 40, 40, 1.1, Math.PI / 2, 1.6);
    strokePaths(ctx, CORNER, W - 40, H - 40, 1.1, Math.PI, 1.6);
    strokePaths(ctx, CORNER, 40, H - 40, 1.1, -Math.PI / 2, 1.6);

    // Wordmark + crown
    ctx.fillStyle = GOLD; ctx.font = `400 34px ${DISPLAY}`; ctx.textAlign = 'center';
    ctx.fillText('tdJamaat', W / 2, 128);
    ctx.strokeStyle = GOLD;
    strokePaths(ctx, HORN, W / 2 - 42, 156, 0.84, 0, 2.2);
    ctx.lineWidth = 1.2; ctx.strokeStyle = GOLD_DIM;
    ctx.beginPath(); ctx.moveTo(250, 214); ctx.lineTo(W / 2 - 60, 214); ctx.moveTo(W / 2 + 60, 214); ctx.lineTo(W - 250, 214); ctx.stroke();

    // Monument
    const houses = [...insights.houses.values()]
        .map(h => ({ h, w: weekOf(h.weeks, weekIndex) }))
        .filter(x => x.w)
        .sort((a, b) => (a.w!.rank ?? 99) - (b.w!.rank ?? 99) || b.w!.avg - a.w!.avg);
    const lead = houses.find(x => x.w!.rank === 1);
    ctx.fillStyle = GOLD; ctx.font = `400 22px ${TEXT}`;
    spaced(ctx, `${week.weekNumber}-АПТА · АПТАНЫН ҮЙҮ`, W / 2, 290, 6, 'center');
    ctx.textAlign = 'center';
    ctx.fillStyle = INK; ctx.font = `400 74px ${DISPLAY}`;
    ctx.fillText(lead ? fitText(ctx, lead.h.name, W - 240) : '—', W / 2, 380);
    ctx.fillStyle = GOLD; ctx.font = `400 168px ${DISPLAY}`;
    ctx.fillText(lead ? fmt(lead.w!.avg) : '—', W / 2, 535);
    ctx.fillStyle = MUTED; ctx.font = `italic 400 24px ${TEXT}`;
    ctx.fillText('орточо упай', W / 2, 580);

    // Houses with dotted leaders
    let y = 660;
    ctx.fillStyle = GOLD_DIM; ctx.font = `400 18px ${TEXT}`;
    spaced(ctx, 'ҮЙЛӨР', W / 2, y, 8, 'center');
    y += 46;
    const rowH = Math.min(42, 260 / Math.max(1, houses.length));
    houses.forEach(({ h, w }) => {
        const leader = w!.rank === 1;
        ctx.textAlign = 'left';
        ctx.fillStyle = GOLD_DIM; ctx.font = `400 18px ${TEXT}`;
        ctx.fillText(w!.rank ? String(w!.rank).padStart(2, '0') : '—', 150, y);
        ctx.fillStyle = leader ? GOLD : INK; ctx.font = `400 32px ${DISPLAY}`;
        const name = fitText(ctx, h.name, 420);
        ctx.fillText(name, 196, y);
        const nameEnd = 196 + ctx.measureText(name).width + 16;
        ctx.textAlign = 'right';
        ctx.fillStyle = w!.submitted ? (leader ? GOLD : INK) : MUTED; ctx.font = `400 34px ${DISPLAY}`;
        const val = w!.submitted ? fmt(w!.avg) : '—';
        ctx.fillText(val, W - 150, y);
        const valStart = W - 150 - ctx.measureText(val).width - 16;
        ctx.fillStyle = '#4a4740';
        for (let x = nameEnd; x < valStart; x += 9) ctx.fillRect(x, y - 6, 2, 2);
        y += rowH;
    });

    // Top three in hairline rings
    const top = [...insights.members.values()]
        .map(m => ({ m, w: weekOf(m.weeks, weekIndex) }))
        .filter(x => x.w && x.w.submitted && x.w.rank && x.w.rank <= 3 && x.w.score > 0)
        .sort((a, b) => a.w!.rank! - b.w!.rank!)
        .slice(0, 3);
    if (top.length) {
        y += 26;
        ctx.fillStyle = GOLD_DIM; ctx.font = `400 18px ${TEXT}`;
        spaced(ctx, 'АПТАНЫН ҮЧ МЫКТЫСЫ', W / 2, y, 8, 'center');
        const colW = (W - 240) / 3;
        top.forEach(({ m, w }, i) => {
            const cx = 120 + colW * i + colW / 2, cy = y + 66;
            ctx.strokeStyle = GOLD; ctx.lineWidth = 1.4;
            ctx.beginPath(); ctx.arc(cx, cy, 34, 0, Math.PI * 2); ctx.stroke();
            ctx.fillStyle = GOLD; ctx.font = `400 30px ${DISPLAY}`; ctx.textAlign = 'center';
            ctx.fillText(ROMAN[w!.rank! - 1], cx, cy + 10);
            ctx.fillStyle = INK; ctx.font = `400 30px ${DISPLAY}`;
            ctx.fillText(fitText(ctx, m.name.split(' ')[0], colW - 30), cx, cy + 82);
            ctx.fillStyle = MUTED; ctx.font = `italic 400 19px ${TEXT}`;
            ctx.fillText(fitText(ctx, w!.houseName, colW - 30), cx, cy + 110);
            ctx.fillStyle = INK; ctx.font = `400 34px ${DISPLAY}`;
            ctx.fillText(fmt(w!.score), cx, cy + 146);
        });
    }

    ctx.fillStyle = MUTED; ctx.font = `400 18px ${TEXT}`;
    spaced(ctx, (window.location.host || 'tdjamaat.vercel.app').toUpperCase(), W / 2, H - 76, 5, 'center');
    ctx.textAlign = 'left';
}

export const ShareSheet: React.FC<ShareSheetProps> = ({ data, weekIndex, insights, onClose }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [url, setUrl] = useState<string | null>(null);
    const [blob, setBlob] = useState<Blob | null>(null);
    const [status, setStatus] = useState<string | null>(null);
    const weekNumber = data.weeks[weekIndex].weekNumber;
    const fileName = `tdjamaat-${weekNumber}-apta.png`;

    useEffect(() => {
        let revoked: string | null = null;
        const canvas = canvasRef.current;
        if (!canvas) return;
        drawCard(canvas, data, weekIndex, insights).then(() => {
            canvas.toBlob(b => {
                if (!b) return;
                setBlob(b);
                revoked = URL.createObjectURL(b);
                setUrl(revoked);
            }, 'image/png');
        });
        return () => { if (revoked) URL.revokeObjectURL(revoked); };
    }, [data, weekIndex, insights]);

    const file = blob ? new File([blob], fileName, { type: 'image/png' }) : null;
    const canShareFile = !!file && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] });

    const share = async () => {
        if (!file) return;
        try {
            await navigator.share({ files: [file], title: `tdJamaat — ${weekNumber}-апта`, text: `tdJamaat — ${weekNumber}-аптанын рейтинги` });
        } catch (err) {
            if ((err as Error)?.name !== 'AbortError') setStatus('Бөлүшүү мүмкүн болгон жок — сүрөттү жүктөп алып, кол менен жибериңиз.');
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
            title={`${weekNumber}-аптанын жыйынтыгы`}
            onClose={onClose}
            width="34rem"
            footer={
                <div className="flex gap-2">
                    {canShareFile && <button className="btn btn-primary flex-1" onClick={share} disabled={!file}><Share2 className="w-4 h-4" /> Бөлүшүү</button>}
                    <button className={`btn ${canShareFile ? 'btn-ghost' : 'btn-primary'} flex-1`} onClick={download} disabled={!url}><Download className="w-4 h-4" /> Сүрөттү жүктөө</button>
                </div>
            }
        >
            <div className="px-4 sm:px-6 py-5">
                <p className="text-[0.84rem] mb-4" style={{ color: 'var(--text-muted)' }}>WhatsApp же Telegram тобуна жөнөтүү үчүн даяр сүрөт.</p>
                <canvas ref={canvasRef} className="hidden" />
                {url ? (
                    <img src={url} alt={`${weekNumber}-аптанын жыйынтыгы`} className="w-full rounded-[12px]" style={{ boxShadow: 'var(--shadow-lift)', aspectRatio: `${W} / ${H}` }} />
                ) : (
                    <div className="w-full rounded-[12px] flex items-center justify-center gap-2" style={{ aspectRatio: `${W} / ${H}`, backgroundColor: 'var(--surface-2)', color: 'var(--text-muted)' }}>
                        <Loader2 className="w-5 h-5 animate-spin" /> Даярдалууда…
                    </div>
                )}
                {status && <p className="text-[0.82rem] mt-3" style={{ color: 'var(--danger)' }}>{status}</p>}
            </div>
        </Sheet>
    );
};
