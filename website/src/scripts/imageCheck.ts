/*
  Image check: does a picture read as machine-polished?

  Runs entirely in the browser on pixel data; nothing is uploaded. It does not
  detect AI. It measures six properties that generated posters and renders tend
  to share (no grain, no quiet space, glow, mirror symmetry, smooth ramps,
  oversaturation) and reports which of them the image shows. A human-made piece
  can trip any of these on purpose; the report is a prompt to look, not a
  verdict. Pure functions, no DOM, so it is easy to test.
*/

export interface Px {
  data: Uint8ClampedArray; // RGBA
  width: number;
  height: number;
}

export type SignalId = "grain" | "quiet" | "glow" | "symmetry" | "ramps" | "saturation";

export interface Signal {
  id: SignalId;
  value: number | null; // null = nothing to measure
  flagged: boolean;
}

export interface Report {
  signals: Signal[];
  flagged: number;
  verdict: "machine" | "mixed" | "hand";
}

// Thresholds. Tuned by hand on glossy generated posters versus printed,
// textured, hand-set pieces. Adjust here, in one place.
export const LIMITS = {
  grainBelow: 0.0025, // mean flat-area residual (0..1 luminance)
  quietBelow: 0.22, // share of tiles that are calm
  glowAbove: 0.015, // share of soft, saturated, mid-bright pixels on a dark ground
  symmetryAbove: 0.55, // mirror correlation of the edge map
  rampsAbove: 0.15, // share of pixels on perfectly smooth ramps
  saturationAbove: 0.1, // share of fully saturated, bright pixels
};

export function analyze(px: Px): Report {
  const { data, width: w, height: h } = px;
  const n = w * h;
  const L = new Float32Array(n);
  const S = new Float32Array(n);
  const V = new Float32Array(n);
  for (let i = 0, j = 0; i < n; i++, j += 4) {
    const r = data[j] / 255, g = data[j + 1] / 255, b = data[j + 2] / 255;
    L[i] = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    V[i] = mx;
    S[i] = mx === 0 ? 0 : (mx - mn) / mx;
  }

  // Gradient magnitude (central differences) and second difference.
  const G = new Float32Array(n);
  const D2 = new Float32Array(n);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const gx = L[i + 1] - L[i - 1];
      const gy = L[i + w] - L[i - w];
      G[i] = Math.hypot(gx, gy);
      D2[i] = Math.max(
        Math.abs(L[i + 1] - 2 * L[i] + L[i - 1]),
        Math.abs(L[i + w] - 2 * L[i] + L[i - w]),
      );
    }
  }

  // 1. Grain: noise left in flat areas. Cameras, paper and print leave some;
  //    generated renders are usually clean to the last pixel.
  let flatN = 0, flatSum = 0;
  let glowN = 0, darkN = 0, rampN = 0, satN = 0, inner = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      inner++;
      if (G[i] < 0.03) {
        const avg = (L[i - 1] + L[i + 1] + L[i - w] + L[i + w]) / 4;
        flatSum += Math.abs(L[i] - avg);
        flatN++;
      }
      if (L[i] < 0.2) darkN++;
      if (S[i] > 0.6 && V[i] > 0.3 && V[i] < 0.85 && G[i] < 0.025) glowN++;
      if (G[i] > 0.002 && G[i] < 0.02 && D2[i] < 0.004) rampN++;
      if (S[i] > 0.85 && V[i] > 0.45) satN++;
    }
  }
  const grain = flatN / inner > 0.02 ? flatSum / flatN : null;

  // 2. Quiet space: tiles with nothing going on. Designers leave rest areas.
  //    Judged on 4x4 sub-block means so paper grain or JPEG noise on an empty
  //    area does not make it look busy.
  const t = Math.max(8, Math.round(Math.min(w, h) / 20));
  const sb = Math.max(2, Math.floor(t / 4));
  let tiles = 0, quiet = 0;
  for (let ty = 0; ty + t <= h; ty += t) {
    for (let tx = 0; tx + t <= w; tx += t) {
      const means: number[] = [];
      for (let by2 = 0; by2 + sb <= t; by2 += sb) {
        for (let bx2 = 0; bx2 + sb <= t; bx2 += sb) {
          let sum = 0;
          for (let y = ty + by2; y < ty + by2 + sb; y++)
            for (let x = tx + bx2; x < tx + bx2 + sb; x++) sum += L[y * w + x];
          means.push(sum / (sb * sb));
        }
      }
      const m = means.reduce((a, b) => a + b, 0) / means.length;
      const sd = Math.sqrt(means.reduce((a, b) => a + (b - m) * (b - m), 0) / means.length);
      tiles++;
      if (sd < 0.02) quiet++;
    }
  }
  const quietShare = tiles ? quiet / tiles : 0;

  // 3. Glow: soft, saturated, mid-bright haze, counted on dark grounds.
  const darkShare = darkN / inner;
  const glow = darkShare > 0.2 ? glowN / inner : 0;

  // 4. Symmetry: correlate the edge map with its mirror image.
  const bx = 64, by = Math.max(8, Math.round((64 * h) / w));
  const map = new Float32Array(bx * by);
  const cnt = new Float32Array(bx * by);
  for (let y = 0; y < h; y++) {
    const my = Math.min(by - 1, Math.floor((y * by) / h));
    for (let x = 0; x < w; x++) {
      const mx = Math.min(bx - 1, Math.floor((x * bx) / w));
      map[my * bx + mx] += G[y * w + x];
      cnt[my * bx + mx]++;
    }
  }
  let mean = 0;
  for (let i = 0; i < map.length; i++) { map[i] /= cnt[i] || 1; mean += map[i]; }
  mean /= map.length;
  let ab = 0, aa = 0, bb = 0;
  for (let y = 0; y < by; y++) {
    for (let x = 0; x < bx; x++) {
      const a = map[y * bx + x] - mean;
      const b = map[y * bx + (bx - 1 - x)] - mean;
      ab += a * b; aa += a * a; bb += b * b;
    }
  }
  const symmetry = aa > 0 && bb > 0 ? ab / Math.sqrt(aa * bb) : 0;

  const ramps = rampN / inner;
  const saturation = satN / inner;

  const signals: Signal[] = [
    { id: "grain", value: grain, flagged: grain !== null && grain < LIMITS.grainBelow },
    { id: "quiet", value: quietShare, flagged: quietShare < LIMITS.quietBelow },
    { id: "glow", value: glow, flagged: glow > LIMITS.glowAbove },
    { id: "symmetry", value: symmetry, flagged: symmetry > LIMITS.symmetryAbove },
    { id: "ramps", value: ramps, flagged: ramps > LIMITS.rampsAbove },
    { id: "saturation", value: saturation, flagged: saturation > LIMITS.saturationAbove },
  ];
  const flagged = signals.filter((s) => s.flagged).length;
  const verdict = flagged >= 5 ? "machine" : flagged >= 3 ? "mixed" : "hand";
  return { signals, flagged, verdict };
}
