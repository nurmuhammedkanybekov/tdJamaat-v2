// Share images (1080×1350 — the portrait size WhatsApp, Telegram and
// Instagram show uncropped), drawn on a canvas in the browser: no server.
// Three cards share one look — the "Түн" design — in night or day colors:
//   drawWeekCard        the week's house ranking + top three
//   drawPersonWeekCard  one person's week: score, place, all 8 metrics
//   drawSeasonCard      one person's season so far ("Wrapped")
import type { DataFile } from '../types';
import type { Insights, MemberSeries, SeasonSummary } from './insights';
import { METRICS, ROLE_LABEL, movement, weekOf } from './insights';
import type { Award } from './badges';
import { HORN_PATHS } from './ornament';

export type CardTheme = 'dark' | 'light';
export const CARD_W = 1080, CARD_H = 1350;

const PALETTES = {
    dark: { bg: '#0c0c0d', glow: 'rgba(201,169,97,0.07)', gold: '#c9a961', goldDim: '#8c7646', ink: '#ece7db', muted: '#8a857a', line: '#2f2e2b', dots: '#4a4740' },
    light: { bg: '#f4f2ed', glow: 'rgba(154,120,54,0.06)', gold: '#9a7836', goldDim: '#a8925f', ink: '#141413', muted: '#7d786e', line: '#cdc7ba', dots: '#c9c2b3' }
};
type Palette = typeof PALETTES.dark;

const DISPLAY = '"Oranienbaum", Georgia, serif';
const TEXT = '"Spectral", Georgia, serif';
const ROMAN = ['I', 'II', 'III'];
const CORNER = ['M6 54 L6 24 C6 12 14 6 26 6 L54 6', 'M6 30 C6 20 12 16 20 16 C28 16 30 24 25 28 C21 31 16 28 18 24'];
const fmt = (n: number) => (Math.round(n * 10) / 10).toString();

const loadFonts = () => Promise.all([
    document.fonts.load(`400 80px "Oranienbaum"`),
    document.fonts.load(`400 30px "Spectral"`),
    document.fonts.load(`italic 400 30px "Spectral"`)
]).catch(() => undefined);

const fit = (ctx: CanvasRenderingContext2D, text: string, max: number) => {
    if (ctx.measureText(text).width <= max) return text;
    let t = text;
    while (t.length > 1 && ctx.measureText(t + '…').width > max) t = t.slice(0, -1);
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

const strokePaths = (ctx: CanvasRenderingContext2D, paths: string[], x: number, y: number, scale: number, rot: number, width: number) => {
    ctx.save();
    ctx.translate(x, y); ctx.rotate(rot); ctx.scale(scale, scale);
    ctx.lineWidth = width / scale; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    paths.forEach(d => ctx.stroke(new Path2D(d)));
    ctx.restore();
};

/** The site mark: ring, ram's horn, crescent (same geometry as <Mark solid>). (cx, cy) center; size = diameter. */
const drawMark = (ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, p: Palette) => {
    const s = size / 120;
    ctx.save();
    ctx.translate(cx - size / 2, cy - size / 2); ctx.scale(s, s);
    ctx.strokeStyle = p.gold; ctx.lineWidth = 3.4;
    ctx.beginPath(); ctx.arc(60, 60, 53, 0, Math.PI * 2); ctx.stroke();
    // crescent: a disc with an offset disc cut away
    const crescent = new Path2D();
    crescent.arc(59, 30, 12.5, 0, Math.PI * 2);
    crescent.moveTo(64.5 + 10.2, 26.5);
    crescent.arc(64.5, 26.5, 10.2, 0, Math.PI * 2, true);
    ctx.fillStyle = p.gold; ctx.fill(crescent, 'evenodd');
    ctx.translate(17, 25); ctx.scale(0.86, 0.86);
    ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    [HORN_PATHS[0], HORN_PATHS[1], 'M50 64 L50 88'].forEach(d => ctx.stroke(new Path2D(d)));
    ctx.restore();
};

const frame = (ctx: CanvasRenderingContext2D, p: Palette) => {
    ctx.fillStyle = p.bg; ctx.fillRect(0, 0, CARD_W, CARD_H);
    const glow = ctx.createRadialGradient(CARD_W / 2, 260, 0, CARD_W / 2, 260, 700);
    glow.addColorStop(0, p.glow); glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow; ctx.fillRect(0, 0, CARD_W, CARD_H);
    ctx.strokeStyle = p.line; ctx.lineWidth = 1.5;
    ctx.strokeRect(54, 54, CARD_W - 108, CARD_H - 108);
    ctx.strokeStyle = p.gold;
    strokePaths(ctx, CORNER, 40, 40, 1.1, 0, 1.6);
    strokePaths(ctx, CORNER, CARD_W - 40, 40, 1.1, Math.PI / 2, 1.6);
    strokePaths(ctx, CORNER, CARD_W - 40, CARD_H - 40, 1.1, Math.PI, 1.6);
    strokePaths(ctx, CORNER, 40, CARD_H - 40, 1.1, -Math.PI / 2, 1.6);
};

const header = (ctx: CanvasRenderingContext2D, p: Palette) => {
    drawMark(ctx, CARD_W / 2 - 92, 120, 58, p);
    ctx.fillStyle = p.gold; ctx.font = `400 38px ${DISPLAY}`; ctx.textAlign = 'left';
    ctx.fillText('tdJamaat', CARD_W / 2 - 52, 133);
    ctx.strokeStyle = p.goldDim; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(250, 196); ctx.lineTo(CARD_W - 250, 196); ctx.stroke();
};

const footer = (ctx: CanvasRenderingContext2D, p: Palette) => {
    ctx.fillStyle = p.muted; ctx.font = `400 18px ${TEXT}`;
    spaced(ctx, (window.location.host || 'tdjamaat.vercel.app').toUpperCase(), CARD_W / 2, CARD_H - 76, 5, 'center');
    ctx.textAlign = 'left';
};

const leaderRow = (ctx: CanvasRenderingContext2D, p: Palette, y: number, left: { num?: string; text: string; gold?: boolean }, right: string, rightGold = false) => {
    ctx.textAlign = 'left';
    let x = 150;
    if (left.num !== undefined) {
        ctx.fillStyle = p.goldDim; ctx.font = `400 18px ${TEXT}`;
        ctx.fillText(left.num, 150, y); x = 196;
    }
    ctx.fillStyle = left.gold ? p.gold : p.ink; ctx.font = `400 32px ${DISPLAY}`;
    const name = fit(ctx, left.text, 470);
    ctx.fillText(name, x, y);
    const nameEnd = x + ctx.measureText(name).width + 16;
    ctx.textAlign = 'right';
    ctx.fillStyle = rightGold ? p.gold : p.ink; ctx.font = `400 33px ${DISPLAY}`;
    ctx.fillText(right, CARD_W - 150, y);
    const valStart = CARD_W - 150 - ctx.measureText(right).width - 16;
    ctx.fillStyle = p.dots;
    for (let dx = nameEnd; dx < valStart; dx += 9) ctx.fillRect(dx, y - 6, 2, 2);
    ctx.textAlign = 'left';
};

const prepare = async (canvas: HTMLCanvasElement, theme: CardTheme) => {
    await loadFonts();
    canvas.width = CARD_W; canvas.height = CARD_H;
    const ctx = canvas.getContext('2d')!;
    const p = PALETTES[theme];
    frame(ctx, p);
    header(ctx, p);
    return { ctx, p };
};

export async function drawWeekCard(canvas: HTMLCanvasElement, theme: CardTheme, data: DataFile, weekIndex: number, insights: Insights) {
    const { ctx, p } = await prepare(canvas, theme);
    const week = data.weeks[weekIndex];
    const houses = [...insights.houses.values()]
        .map(h => ({ h, w: weekOf(h.weeks, weekIndex) }))
        .filter(x => x.w)
        .sort((a, b) => (a.w!.rank ?? 99) - (b.w!.rank ?? 99) || b.w!.avg - a.w!.avg);
    const lead = houses.find(x => x.w!.rank === 1);

    ctx.fillStyle = p.gold; ctx.font = `400 22px ${TEXT}`;
    spaced(ctx, `${week.weekNumber}-АПТА · АПТАНЫН ҮЙҮ`, CARD_W / 2, 280, 6, 'center');
    ctx.textAlign = 'center';
    ctx.fillStyle = p.ink; ctx.font = `400 74px ${DISPLAY}`;
    ctx.fillText(lead ? fit(ctx, lead.h.name, CARD_W - 240) : '—', CARD_W / 2, 370);
    ctx.fillStyle = p.gold; ctx.font = `400 168px ${DISPLAY}`;
    ctx.fillText(lead ? fmt(lead.w!.avg) : '—', CARD_W / 2, 525);
    ctx.fillStyle = p.muted; ctx.font = `italic 400 24px ${TEXT}`;
    ctx.fillText('үй рейтинги', CARD_W / 2, 570);

    let y = 650;
    ctx.fillStyle = p.goldDim; ctx.font = `400 18px ${TEXT}`;
    spaced(ctx, 'ҮЙЛӨР', CARD_W / 2, y, 8, 'center');
    y += 46;
    const rowH = Math.min(42, 260 / Math.max(1, houses.length));
    houses.forEach(({ h, w }) => {
        const leader = w!.rank === 1;
        leaderRow(ctx, p, y, { num: w!.rank ? String(w!.rank).padStart(2, '0') : '—', text: h.name, gold: leader }, w!.submitted ? fmt(w!.avg) : '—', leader);
        y += rowH;
    });

    const top = [...insights.members.values()]
        .map(m => ({ m, w: weekOf(m.weeks, weekIndex) }))
        .filter(x => x.w && x.w.submitted && x.w.rank && x.w.rank <= 3 && x.w.score > 0)
        .sort((a, b) => a.w!.rank! - b.w!.rank!)
        .slice(0, 3);
    if (top.length) {
        y += 26;
        ctx.fillStyle = p.goldDim; ctx.font = `400 18px ${TEXT}`;
        spaced(ctx, 'АПТАНЫН ҮЧ МЫКТЫСЫ', CARD_W / 2, y, 8, 'center');
        const colW = (CARD_W - 240) / 3;
        top.forEach(({ m, w }, i) => {
            const cx = 120 + colW * i + colW / 2, cy = y + 66;
            ctx.strokeStyle = p.gold; ctx.lineWidth = 1.4;
            ctx.beginPath(); ctx.arc(cx, cy, 34, 0, Math.PI * 2); ctx.stroke();
            ctx.textAlign = 'center';
            ctx.fillStyle = p.gold; ctx.font = `400 30px ${DISPLAY}`;
            ctx.fillText(ROMAN[w!.rank! - 1], cx, cy + 10);
            ctx.fillStyle = p.ink; ctx.font = `400 30px ${DISPLAY}`;
            ctx.fillText(fit(ctx, m.name.split(' ')[0], colW - 30), cx, cy + 82);
            ctx.fillStyle = p.muted; ctx.font = `italic 400 19px ${TEXT}`;
            ctx.fillText(fit(ctx, w!.houseName, colW - 30), cx, cy + 110);
            ctx.fillStyle = p.ink; ctx.font = `400 34px ${DISPLAY}`;
            ctx.fillText(fmt(w!.score), cx, cy + 146);
        });
    }
    footer(ctx, p);
}

export async function drawPersonWeekCard(canvas: HTMLCanvasElement, theme: CardTheme, series: MemberSeries, weekIndex: number, awards: Award[], peopleCount: number) {
    const { ctx, p } = await prepare(canvas, theme);
    const w = weekOf(series.weeks, weekIndex) ?? series.weeks[series.weeks.length - 1];

    ctx.fillStyle = p.gold; ctx.font = `400 22px ${TEXT}`;
    spaced(ctx, `${w.weekNumber}-АПТА · ${w.houseName.toUpperCase()}`, CARD_W / 2, 278, 6, 'center');
    ctx.textAlign = 'center';
    ctx.fillStyle = p.ink; ctx.font = `400 76px ${DISPLAY}`;
    ctx.fillText(fit(ctx, series.name, CARD_W - 220), CARD_W / 2, 368);
    ctx.fillStyle = p.muted; ctx.font = `italic 400 24px ${TEXT}`;
    ctx.fillText(ROLE_LABEL[series.role].toLowerCase(), CARD_W / 2, 408);
    ctx.fillStyle = p.gold; ctx.font = `400 150px ${DISPLAY}`;
    ctx.fillText(w.submitted ? fmt(w.score) : '—', CARD_W / 2, 556);
    const mv = movement(series.weeks, w.weekIndex);
    const place = w.rank ? `${w.rank}-орун · ${peopleCount} адамдан` : 'маалымат жок';
    const arrow = mv === null || mv === 0 ? '' : mv > 0 ? `   ▲ ${mv}` : `   ▼ ${-mv}`;
    ctx.fillStyle = p.muted; ctx.font = `400 26px ${TEXT}`;
    ctx.fillText(place + arrow, CARD_W / 2, 602);

    let y = 690;
    ctx.fillStyle = p.goldDim; ctx.font = `400 18px ${TEXT}`;
    spaced(ctx, 'ПЛАНГА КАРАТА', CARD_W / 2, y, 8, 'center');
    y += 48;
    METRICS.forEach(m => {
        const pct = Math.round(w.pct[m]);
        leaderRow(ctx, p, y, { text: m }, `${w.member.actual[m]} / ${w.member.target[m]}   ${pct}%`, pct >= 100);
        y += 44;
    });

    const mine = awards.filter(a => a.weekIndex === w.weekIndex).map(a => a.def.name);
    if (mine.length) {
        y += 18;
        ctx.textAlign = 'center';
        ctx.fillStyle = p.gold; ctx.font = `italic 400 26px ${TEXT}`;
        ctx.fillText(fit(ctx, `Сыйлыктар: ${mine.join(' · ')}`, CARD_W - 240), CARD_W / 2, y);
    }
    footer(ctx, p);
}

export async function drawSeasonCard(canvas: HTMLCanvasElement, theme: CardTheme, series: MemberSeries, summary: SeasonSummary, awards: Award[], seasonName: string, finished: boolean) {
    const { ctx, p } = await prepare(canvas, theme);
    ctx.fillStyle = p.gold; ctx.font = `400 22px ${TEXT}`;
    spaced(ctx, `СЕЗОН ${seasonName} · ${finished ? 'ЖЫЙЫНТЫК' : 'АЗЫРЫНЧА'}`, CARD_W / 2, 278, 6, 'center');
    ctx.textAlign = 'center';
    ctx.fillStyle = p.ink; ctx.font = `400 78px ${DISPLAY}`;
    ctx.fillText(fit(ctx, series.name, CARD_W - 220), CARD_W / 2, 370);
    ctx.fillStyle = p.muted; ctx.font = `italic 400 24px ${TEXT}`;
    ctx.fillText(`${series.houseName} · ${ROLE_LABEL[series.role].toLowerCase()}`, CARD_W / 2, 410);

    // "2-орун" as one unit: big gold numeral, smaller "-орун" beside it.
    const num = summary.rank ? String(summary.rank) : '—';
    ctx.font = `400 160px ${DISPLAY}`;
    const numW = ctx.measureText(num).width;
    ctx.font = `400 64px ${DISPLAY}`;
    const sufW = summary.rank ? ctx.measureText('-орун').width : 0;
    const startX = CARD_W / 2 - (numW + sufW) / 2;
    ctx.textAlign = 'left';
    ctx.fillStyle = p.gold; ctx.font = `400 160px ${DISPLAY}`;
    ctx.fillText(num, startX, 570);
    if (summary.rank) { ctx.fillStyle = p.muted; ctx.font = `400 64px ${DISPLAY}`; ctx.fillText('-орун', startX + numW, 570); }
    ctx.textAlign = 'center';
    ctx.fillStyle = p.muted; ctx.font = `italic 400 25px ${TEXT}`;
    ctx.fillText(summary.rank ? `${summary.of} адамдын ичинен · сезондогу орточо упай боюнча` : 'сезондо маалымат жок', CARD_W / 2, 616);

    // 2 × 3 grid of figures with hairlines
    const cells: Array<[string, string]> = [
        ['Орточо упай', fmt(summary.average)],
        ['Эң мыкты апта', summary.best ? `${fmt(summary.best.score)}` : '—'],
        ['Активдүү апта', `${summary.weeksActive} / ${summary.weeksTotal}`],
        ['Толук план', `${summary.perfectWeeks}`],
        ['Өсүш', summary.growth === null ? '—' : `${summary.growth > 0 ? '+' : ''}${fmt(summary.growth)}`],
        ['Сыйлыктар', `${awards.length}`]
    ];
    const top = 680, cw = (CARD_W - 300) / 2, ch = 128;
    ctx.strokeStyle = p.line; ctx.lineWidth = 1;
    cells.forEach(([label, value], i) => {
        const col = i % 2, row = Math.floor(i / 2);
        const x = 150 + col * cw, y = top + row * ch;
        if (col === 1) { ctx.beginPath(); ctx.moveTo(x, y + 10); ctx.lineTo(x, y + ch - 10); ctx.stroke(); }
        if (row > 0) { ctx.beginPath(); ctx.moveTo(x + 20, y); ctx.lineTo(x + cw - 20, y); ctx.stroke(); }
        ctx.textAlign = 'center';
        ctx.fillStyle = p.goldDim; ctx.font = `400 18px ${TEXT}`;
        spaced(ctx, label.toUpperCase(), x + cw / 2, y + 44, 5, 'center');
        ctx.textAlign = 'center';
        ctx.fillStyle = i === 0 ? p.gold : p.ink; ctx.font = `400 52px ${DISPLAY}`;
        ctx.fillText(value, x + cw / 2, y + 104);
    });

    if (summary.best) {
        ctx.textAlign = 'center';
        ctx.fillStyle = p.muted; ctx.font = `italic 400 23px ${TEXT}`;
        ctx.fillText(`эң мыкты апта — ${summary.best.weekNumber}-апта`, CARD_W / 2, top + 3 * ch + 44);
    }
    const names = [...new Set(awards.map(a => a.def.name))];
    if (names.length) {
        ctx.textAlign = 'center';
        ctx.fillStyle = p.gold; ctx.font = `italic 400 24px ${TEXT}`;
        ctx.fillText(fit(ctx, names.join(' · '), CARD_W - 260), CARD_W / 2, top + 3 * ch + 88);
    }
    footer(ctx, p);
}
