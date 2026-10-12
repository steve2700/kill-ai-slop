/*
  Human touch: put back the marks a generated image wipes out.

  Works on pixels only, in the browser. It adds film and paper grain, a little
  print misregistration, a paper tone with lifted blacks, and pulls back the
  most saturated colour and the soft glow. It does not change the layout, so it
  cannot add quiet space or move a centred composition off its axis; those need
  a redesign. Deterministic: the same image and strength give the same result.
*/

export interface Px {
  data: Uint8ClampedArray; // RGBA
  width: number;
  height: number;
}

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp = (v: number, lo = 0, hi = 1) => (v < lo ? lo : v > hi ? hi : v);

/** strength 0..1. Returns new RGBA data of the same size. */
export function humanize(src: Px, strength = 0.6): Uint8ClampedArray {
  const { data, width: w, height: h } = src;
  const s = clamp(strength);
  const out = new Uint8ClampedArray(data.length);
  const rand = rng(1337);
  const tri = () => rand() + rand() - 1; // triangular noise, -1..1

  // Luminance of the original, for the glow and midtone weights.
  const L = new Float32Array(w * h);
  for (let i = 0, j = 0; i < L.length; i++, j += 4)
    L[i] = (0.2126 * data[j] + 0.7152 * data[j + 1] + 0.0722 * data[j + 2]) / 255;

  // Coarse blotch noise (paper unevenness) on a 3px grid.
  const cell = 3;
  const gw = Math.ceil(w / cell), gh = Math.ceil(h / cell);
  const blotch = new Float32Array(gw * gh);
  for (let i = 0; i < blotch.length; i++) blotch[i] = tri();

  const shift = Math.max(1, Math.round((Math.max(w, h) / 900) * s));
  const fine = 9 * s; // grain strength on a 0..255 scale
  const coarse = 3.5 * s;
  const lift = 0.06 * s; // lift pure black to deep ink
  const tone = [1, 1 - 0.012 * s, 1 - 0.045 * s]; // warm paper tint

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const j = i * 4;
      // Misregistration: red plate one way, blue plate the other.
      const xr = Math.max(0, x - shift), xb = Math.min(w - 1, x + shift);
      // Blend the shifted plates in at 60% so the slip reads as print, not glitch.
      let r = data[j] * 0.4 + data[(y * w + xr) * 4] * 0.6;
      let g = data[j + 1];
      let b = data[j + 2] * 0.4 + data[(y * w + xb) * 4 + 2] * 0.6;

      const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
      const sat = mx === 0 ? 0 : (mx - mn) / mx;
      const v = mx / 255;

      // Soft-glow weight: saturated, mid-bright, locally smooth.
      let gl = 0;
      if (x > 0 && y > 0 && x < w - 1 && y < h - 1) {
        const grad = Math.hypot(L[i + 1] - L[i - 1], L[i + w] - L[i - w]);
        gl = clamp((sat - 0.5) / 0.3) * clamp(1 - grad / 0.04) * (v > 0.3 && v < 0.9 ? 1 : 0);
      }

      // Mute the most saturated colour, and knock back glow.
      const mute = 0.55 * s * clamp((sat - 0.5) / 0.4) + 0.25 * s * gl;
      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      r += (lum - r) * mute;
      g += (lum - g) * mute;
      b += (lum - b) * mute;
      const dim = 1 - 0.18 * s * gl;
      r *= dim; g *= dim; b *= dim;

      // Paper tone and lifted blacks.
      r = (r * (1 - lift) + 22 * lift) * tone[0];
      g = (g * (1 - lift) + 20 * lift) * tone[1];
      b = (b * (1 - lift) + 20 * lift) * tone[2];

      // Grain, strongest in the midtones, plus paper blotch.
      const l = clamp((0.2126 * r + 0.7152 * g + 0.0722 * b) / 255);
      const mid = Math.max(0.45, 1 - Math.abs(l - 0.5) * 1.1);
      const n = tri() * fine * mid + blotch[Math.floor(y / cell) * gw + Math.floor(x / cell)] * coarse;
      out[j] = r + n + tri() * fine * 0.12;
      out[j + 1] = g + n;
      out[j + 2] = b + n + tri() * fine * 0.12;
      out[j + 3] = 255;
    }
  }
  return out;
}
