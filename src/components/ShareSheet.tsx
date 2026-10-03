import React, { useEffect, useRef, useState } from 'react';
import { Download, Loader2, Share2 } from 'lucide-react';
import type { DataFile } from '../types';
import type { Insights } from '../utils/insights';
import { ROLE_LABEL, weekOf } from '../utils/insights';
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
const GOLD = '#d9b56f', GOLD_DIM = 'rgba(217,181,111,0.55)', INK = '#f6efe2', MUTED = '#a9b4bb';
const DISPLAY = '"Cormorant Garamond", "PT Serif", Georgia, serif';
const TEXT = '"PT Serif", Georgia, serif';
// Numbers in PT Serif: canvas can't switch Cormorant to lining figures.
const NUM = TEXT;
const TEAM = ['#5b9df0', '#f08a5d', '#3cc596', '#f2b733', '#ee8fb4', '#4fb84f', '#9a8cf0', '#f07070'];

const fmt = (n: number) => (Math.round(n * 10) / 10).toString();

const loadImage = (src: string) => new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
});

const fitText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number) => {
    if (ctx.measureText(text).width <= maxWidth) return text;
    let t = text;
    while (t.length > 1 && ctx.measureText(t + '…').width > maxWidth) t = t.slice(0, -1);
    return t + '…';
};

async function drawCard(canvas: HTMLCanvasElement, data: DataFile, weekIndex: number, insights: Insights) {
    await Promise.all([
        document.fonts.load(`700 80px "Cormorant Garamond"`),
        document.fonts.load(`700 30px "PT Serif"`),
        document.fonts.load(`400 30px "PT Serif"`)
    ]).catch(() => undefined);
    const ctx = canvas.getContext('2d')!;
    canvas.width = W; canvas.height = H;
    const week = data.weeks[weekIndex];

    // Ground
    const bg = ctx.createLinearGradient(0, 0, W * 0.4, H);
    bg.addColorStop(0, '#20394c'); bg.addColorStop(1, '#0c1b25');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    const glow = ctx.createRadialGradient(W * 0.85, 0, 0, W * 0.85, 0, W * 0.9);
    glow.addColorStop(0, 'rgba(201,154,82,0.28)'); glow.addColorStop(1, 'rgba(201,154,82,0)');
    ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);

    // Shyrdak lattice (diamonds with paired horn curls), faint, fading down
    ctx.save();
    ctx.globalAlpha = 0.07;
    ctx.strokeStyle = GOLD; ctx.lineWidth = 2;
    const s = 96;
    for (let y = -s / 2; y < H * 0.55; y += s) {
        for (let x = -s / 2; x < W + s; x += s) {
            const cx = x + s / 2, cy = y + s / 2;
            ctx.beginPath();
            ctx.moveTo(cx, cy - s / 2.4); ctx.lineTo(cx + s / 2.4, cy); ctx.lineTo(cx, cy + s / 2.4); ctx.lineTo(cx - s / 2.4, cy); ctx.closePath();
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(cx, cy - 14); ctx.bezierCurveTo(cx - 12, cy - 14, cx - 16, cy - 6, cx - 12, cy - 2);
            ctx.moveTo(cx, cy - 14); ctx.bezierCurveTo(cx + 12, cy - 14, cx + 16, cy - 6, cx + 12, cy - 2);
            ctx.moveTo(cx, cy + 14); ctx.bezierCurveTo(cx - 12, cy + 14, cx - 16, cy + 6, cx - 12, cy + 2);
            ctx.moveTo(cx, cy + 14); ctx.bezierCurveTo(cx + 12, cy + 14, cx + 16, cy + 6, cx + 12, cy + 2);
            ctx.stroke();
        }
    }
    ctx.restore();

    // Frame with diamond corner studs
    ctx.strokeStyle = GOLD_DIM; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(36, 36, W - 72, H - 72, 28); ctx.stroke();
    [[36, 36], [W - 36, 36], [36, H - 36], [W - 36, H - 36]].forEach(([x, y]) => {
        ctx.fillStyle = GOLD;
        ctx.beginPath(); ctx.moveTo(x, y - 10); ctx.lineTo(x + 10, y); ctx.lineTo(x, y + 10); ctx.lineTo(x - 10, y); ctx.closePath(); ctx.fill();
    });

    // Header
    try {
        const logo = await loadImage('/favicon.svg');
        ctx.drawImage(logo, 90, 92, 96, 96);
    } catch { /* logo is optional */ }
    ctx.fillStyle = INK; ctx.font = `700 76px ${DISPLAY}`; ctx.textBaseline = 'alphabetic';
    ctx.fillText('tdJamaat', 210, 160);
    ctx.fillStyle = MUTED; ctx.font = `400 24px ${TEXT}`;
    ctx.fillText(fitText(ctx, 'Жамааттын активдүүлүгүн талдоого багытталган үйлөрдүн рейтинги', W - 300), 212, 196);

    ctx.fillStyle = GOLD; ctx.font = `700 24px ${TEXT}`;
    ctx.fillText('АПТАЛЫК РЕЙТИНГ', 90, 292);
    ctx.fillStyle = INK; ctx.font = `700 120px ${NUM}`;
    const num = String(week.weekNumber);
    ctx.fillText(num, 86, 410);
    const numW = ctx.measureText(num).width;
    ctx.fillStyle = MUTED; ctx.font = `600 64px ${DISPLAY}`;
    ctx.fillText('-апта', 92 + numW, 410);
    if (week.date) { ctx.font = `400 26px ${TEXT}`; ctx.fillText(week.date.replace(' -- ', ' — '), 92, 456); }

    // Houses
    const houses = [...insights.houses.values()]
        .map(h => ({ h, w: weekOf(h.weeks, weekIndex) }))
        .filter(x => x.w)
        .sort((a, b) => (a.w!.rank ?? 99) - (b.w!.rank ?? 99) || b.w!.avg - a.w!.avg);
    const maxAvg = Math.max(1, ...houses.map(x => x.w!.avg));
    let y = 536;
    ctx.fillStyle = GOLD; ctx.font = `700 22px ${TEXT}`;
    ctx.fillText('ҮЙЛӨРДҮН РЕЙТИНГИ · ОРТОЧО УПАЙ', 90, y - 26);
    const rowH = Math.min(62, 372 / Math.max(1, houses.length));
    houses.forEach(({ h, w }, i) => {
        const cy = y + i * rowH;
        ctx.fillStyle = i === 0 ? GOLD : MUTED; ctx.font = `700 32px ${NUM}`;
        ctx.fillText(w!.rank ? String(w!.rank).padStart(2, '0') : '—', 90, cy + 30);
        ctx.fillStyle = INK; ctx.font = `700 32px ${TEXT}`;
        ctx.fillText(fitText(ctx, h.name, 330), 170, cy + 28);
        // bar
        const bx = 520, bw = 360, by = cy + 12;
        ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.beginPath(); ctx.roundRect(bx, by, bw, 14, 7); ctx.fill();
        ctx.fillStyle = TEAM[h.colorIndex % TEAM.length];
        ctx.beginPath(); ctx.roundRect(bx, by, Math.max(14, (w!.avg / maxAvg) * bw), 14, 7); ctx.fill();
        ctx.fillStyle = w!.submitted ? INK : MUTED; ctx.font = `700 34px ${NUM}`; ctx.textAlign = 'right';
        ctx.fillText(w!.submitted ? fmt(w!.avg) : '—', W - 90, cy + 32);
        ctx.textAlign = 'left';
    });
    y += houses.length * rowH + 40;

    // Top three people
    const top = [...insights.members.values()]
        .map(m => ({ m, w: weekOf(m.weeks, weekIndex) }))
        .filter(x => x.w && x.w.submitted && x.w.rank && x.w.rank <= 3 && x.w.score > 0)
        .sort((a, b) => a.w!.rank! - b.w!.rank!)
        .slice(0, 3);
    if (top.length) {
        ctx.fillStyle = GOLD; ctx.font = `700 22px ${TEXT}`;
        ctx.fillText('АПТАНЫН ҮЧ МЫКТЫСЫ', 90, y);
        y += 24;
        const colW = (W - 180 - 40) / 3;
        const medals = [['#f3d48a', '#a8741f'], ['#eef1f3', '#8b97a1'], ['#e0aa7c', '#8f5427']];
        top.forEach(({ m, w }, i) => {
            const x = 90 + i * (colW + 20);
            ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.strokeStyle = 'rgba(217,181,111,0.25)'; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.roundRect(x, y, colW, 190, 20); ctx.fill(); ctx.stroke();
            const g = ctx.createLinearGradient(x + 24, y + 24, x + 84, y + 84);
            g.addColorStop(0, medals[w!.rank! - 1][0]); g.addColorStop(1, medals[w!.rank! - 1][1]);
            ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x + 54, y + 54, 30, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#fff'; ctx.font = `700 30px ${NUM}`; ctx.textAlign = 'center';
            ctx.fillText(String(w!.rank), x + 54, y + 65);
            ctx.textAlign = 'right'; ctx.fillStyle = INK; ctx.font = `700 44px ${NUM}`;
            ctx.fillText(fmt(w!.score), x + colW - 22, y + 72);
            ctx.textAlign = 'left';
            ctx.fillStyle = INK; ctx.font = `700 28px ${TEXT}`;
            ctx.fillText(fitText(ctx, m.name, colW - 44), x + 22, y + 135);
            ctx.fillStyle = MUTED; ctx.font = `400 22px ${TEXT}`;
            ctx.fillText(fitText(ctx, `${w!.houseName} · ${ROLE_LABEL[m.role]}`, colW - 44), x + 22, y + 170);
        });
    }

    // Horn-chain trim + footer
    ctx.save();
    ctx.strokeStyle = GOLD_DIM; ctx.lineWidth = 2; ctx.lineCap = 'round';
    for (let x = 90; x < W - 90; x += 48) {
        const cy = H - 112;
        ctx.beginPath();
        ctx.moveTo(x, cy); ctx.lineTo(x + 9, cy); ctx.bezierCurveTo(x + 9, cy - 9, x + 18, cy - 10, x + 18, cy - 2); ctx.bezierCurveTo(x + 18, cy + 3, x + 12, cy + 3, x + 12, cy - 1);
        ctx.moveTo(x + 48, cy); ctx.lineTo(x + 39, cy); ctx.bezierCurveTo(x + 39, cy - 9, x + 30, cy - 10, x + 30, cy - 2); ctx.bezierCurveTo(x + 30, cy + 3, x + 36, cy + 3, x + 36, cy - 1);
        ctx.moveTo(x + 21, cy); ctx.lineTo(x + 27, cy);
        ctx.stroke();
    }
    ctx.restore();
    ctx.fillStyle = MUTED; ctx.font = `400 26px ${TEXT}`; ctx.textAlign = 'center';
    ctx.fillText(window.location.host || 'tdjamaat.vercel.app', W / 2, H - 66);
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
