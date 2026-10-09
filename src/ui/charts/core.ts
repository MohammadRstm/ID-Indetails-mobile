// Ported from the web client: src/shared/components/Charts/core.ts (see docs/ported-from-web.md): the drawing
// helpers only; the web's resize hook and tooltips have no phone counterpart.

/** A bar with rounded top corners, as an SVG path. */
export function barPath(x: number, y: number, w: number, h: number, r: number): string {
  r = Math.min(r, w / 2, h);
  if (h <= 0.6) return `M${x} ${y + h}h${w}v-0.6h${-w}z`;
  return `M${x} ${y + h}V${y + r}a${r} ${r} 0 0 1 ${r} ${-r}h${w - 2 * r}a${r} ${r} 0 0 1 ${r} ${r}V${y + h}z`;
}

/** A round axis maximum at or above v: 1, 2, 2.5, 5 or 10 times a power of ten. */
export function niceMax(v: number): number {
  if (v <= 0) return 1;
  const mag = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / mag;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return step * mag;
}

export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
