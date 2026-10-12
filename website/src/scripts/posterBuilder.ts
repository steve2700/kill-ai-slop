/*
  Say-less poster builder.

  A deliberate answer to "AI put too much information on a poster": it only
  accepts one headline, one supporting line and one contact, in one typeface
  and one accent, set off-centre with a large empty area. The limits are the
  feature. Draws to a canvas; no DOM beyond the canvas it is given.
*/

export interface PosterOpts {
  headline: string;
  line: string;
  contact: string;
  accent: string; // one colour
  ground: "paper" | "ink";
  photo?: HTMLImageElement | null;
}

export const W = 1200;
export const H = 1700;
const M = 96;
/** Lighten a #rrggbb colour toward white so a dark accent stays readable on ink. */
function lift(hex: string, t: number): string {
  const n = parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(v + (255 - v) * t));
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}

const FONT = '"Inter", "Segoe UI", system-ui, -apple-system, Roboto, Arial, sans-serif';

type Ctx = CanvasRenderingContext2D & { letterSpacing?: string };

function wrap(ctx: Ctx, text: string, maxW: number): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? cur + " " + w : w;
    if (ctx.measureText(next).width <= maxW || !cur) cur = next;
    else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

function fitOne(ctx: Ctx, text: string, weight: number, start: number, min: number, maxW: number): number {
  let size = start;
  for (; size > min; size -= 4) {
    ctx.font = `${weight} ${size}px ${FONT}`;
    if (ctx.measureText(text).width <= maxW) break;
  }
  return size;
}

export function drawPoster(canvas: HTMLCanvasElement, o: PosterOpts): void {
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")! as Ctx;
  const paper = o.ground === "paper";
  const bg = paper ? "#efe9dc" : "#17171b";
  const ink = paper ? "#1a1a1f" : "#f2ece0";
  const accent = paper ? o.accent : lift(o.accent, 0.5);
  const mute = paper ? "rgba(26,26,31,0.68)" : "rgba(242,236,224,0.7)";

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  const tight = (em: number) => {
    if ("letterSpacing" in ctx) ctx.letterSpacing = `${em}em`;
  };

  const hasPhoto = !!o.photo && o.photo.naturalWidth > 0;
  const pw = 440, ph = 580;
  const px = W - M - pw, py = H - M - ph;

  // One short accent rule, the only decoration.
  ctx.fillStyle = accent;
  ctx.fillRect(M, M, 96, 10);

  // Headline: heavy, left-aligned, as large as fits in three lines.
  const text = (o.headline || "").trim() || "Your headline";
  let size = 176, lines: string[] = [];
  for (; size >= 72; size -= 4) {
    ctx.font = `700 ${size}px ${FONT}`;
    tight(-0.03);
    lines = wrap(ctx, text, W - 2 * M);
    if (lines.length <= 3 && lines.every((l) => ctx.measureText(l).width <= W - 2 * M)) break;
  }
  ctx.fillStyle = ink;
  let y = M + 40 + size;
  for (const l of lines) {
    ctx.fillText(l, M, y);
    y += size * 1.02;
  }

  // Supporting line: one, quiet.
  const sub = (o.line || "").trim();
  if (sub) {
    ctx.font = `400 46px ${FONT}`;
    tight(0);
    ctx.fillStyle = mute;
    y += 24;
    for (const l of wrap(ctx, sub, 760).slice(0, 2)) {
      ctx.fillText(l, M, y + 46);
      y += 62;
    }
  }

  // Optional single photo, off-centre, flat, with one contact shadow.
  if (hasPhoto) {
    const im = o.photo!;
    const k = Math.max(pw / im.naturalWidth, ph / im.naturalHeight);
    const sw = pw / k, sh = ph / k;
    const sx = (im.naturalWidth - sw) / 2, sy = (im.naturalHeight - sh) / 2;
    ctx.save();
    ctx.translate(px + pw / 2, py + ph + 18);
    ctx.scale(1, 0.1);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, pw * 0.55);
    g.addColorStop(0, paper ? "rgba(20,20,25,0.28)" : "rgba(0,0,0,0.5)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, pw * 0.55, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.drawImage(im, sx, sy, sw, sh, px, py, pw, ph);
  }

  // Contact: the second-largest thing on the sheet, bottom-left.
  const contact = (o.contact || "").trim();
  if (contact) {
    const maxW = hasPhoto ? px - M - 48 : W - 2 * M;
    const cs = fitOne(ctx, contact, 700, 104, 44, maxW);
    ctx.font = `700 ${cs}px ${FONT}`;
    tight(-0.02);
    ctx.fillStyle = accent;
    ctx.fillText(contact, M, H - M);
  }
}
