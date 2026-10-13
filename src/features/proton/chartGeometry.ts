import { clamp, niceMax } from "@/ui/charts/core";

/* Where Proton's charts put their marks. Only drawing: every figure shown comes from the API. */

export type Span = { x: number; width: number };

/**
 * Horizontal bars from a shared zero line: a positive value grows right of it, a negative one left of it. A value
 * that isn't zero is always at least 2 wide, so it can be seen.
 */
export function rankBarSpans(values: number[], width: number): { spans: Span[]; zero: number } {
  const low = Math.min(0, ...values);
  const high = Math.max(0, ...values);
  const range = high - low || 1;
  const zero = ((0 - low) * width) / range;
  const spans = values.map((v) => {
    const w = v === 0 ? 0 : Math.max(2, (Math.abs(v) * width) / range);
    return { x: v < 0 ? zero - w : zero, width: w };
  });
  return { spans, zero };
}

/** The axis a chart's values sit on: zero, and round numbers at or beyond its largest and smallest. */
export function axisRange(values: (number | null)[]): { low: number; high: number } {
  const present = values.filter((v): v is number => v != null);
  const top = Math.max(0, ...present);
  const bottom = Math.min(0, ...present);
  const high = top > 0 ? niceMax(top) : 0;
  const low = bottom < 0 ? -niceMax(-bottom) : 0;
  return high === low ? { low: 0, high: 1 } : { low, high };
}

/** Where a value falls between the top (y = `top`) and bottom (y = `top + plot`) of the plot. */
export function scaleY(
  value: number,
  range: { low: number; high: number },
  top: number,
  plot: number,
): number {
  return top + ((range.high - value) * plot) / (range.high - range.low);
}

const MAX_BAR = 30;

/** Columns grouped by point, one per series, centred in the point's slot. */
export function columnSlots(count: number, seriesCount: number, width: number) {
  const slot = width / Math.max(1, count);
  const bar = clamp((slot * 0.72) / Math.max(1, seriesCount), 1, MAX_BAR);
  const group = bar * seriesCount;
  return {
    slot,
    bar,
    /** Left edge of a point's column for a series. */
    x: (point: number, series: number) => point * slot + (slot - group) / 2 + series * bar,
    /** Middle of a point's slot. */
    center: (point: number) => point * slot + slot / 2,
  };
}

/** Where a line's points sit across the width: evenly, with a margin so the ends aren't clipped. */
export function lineX(count: number, width: number, margin = 8): (point: number) => number {
  return (point) =>
    count <= 1 ? width / 2 : margin + (point * (width - 2 * margin)) / (count - 1);
}

/** The path through y values, one `M`/`L` run at a time; a null leaves a gap. */
export function linePath(xs: number[], ys: (number | null)[]): string {
  let path = "";
  let pen = false;
  ys.forEach((y, i) => {
    if (y == null) {
      pen = false;
      return;
    }
    path += `${pen ? "L" : "M"}${xs[i].toFixed(1)} ${y.toFixed(1)}`;
    pen = true;
  });
  return path;
}

/** Which points to name along an axis: about seven of them, whatever the count. */
export const labelEvery = (count: number) => Math.max(1, Math.ceil(count / 7));

/**
 * The parts of a whole as segments across the width. A part with no figure, or below zero, takes no room: the legend
 * still names it.
 */
export function compositionSpans(values: (number | null)[], width: number): Span[] {
  const sizes = values.map((v) => (v != null && v > 0 ? v : 0));
  const total = sizes.reduce((sum, v) => sum + v, 0);
  let x = 0;
  return sizes.map((size) => {
    const w = total === 0 ? 0 : (size * width) / total;
    const span = { x, width: w };
    x += w;
    return span;
  });
}
