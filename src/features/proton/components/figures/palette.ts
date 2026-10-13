import type { Colors } from "@/theme/tokens";

/** The web's colours for the parts of a whole and for a second or third series. */
export const partsPalette = (c: Colors): string[] => [
  c.heat3,
  c.cost,
  c.now,
  c.ok,
  c.warnMark,
  c.heat1,
  c.accent,
  c.done,
];

/** The first series is the chart colour; the others take the palette in turn. */
export const seriesColor = (c: Colors, index: number): string =>
  index === 0 ? c.chart : partsPalette(c)[index % 8];
