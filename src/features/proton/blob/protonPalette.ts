import { protonDark, protonLight, protonMoodColors, type ProtonColors } from "@/theme/tokens";
import type { ProtonMood } from "./protonMood";

/** The blob's colours in a theme, with what the mood changes (asleep, error and happy look different). */
export function protonPalette(scheme: "light" | "dark", mood: ProtonMood): ProtonColors {
  const base = scheme === "dark" ? protonDark : protonLight;
  if (mood === "asleep" || mood === "error" || mood === "happy") {
    return { ...base, ...protonMoodColors[mood] };
  }
  return base;
}

const RGBA = /^rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)$/;

/**
 * A colour as a solid colour plus its opacity. A gradient stop takes its opacity from `stopOpacity` and ignores
 * the alpha inside the colour, so a translucent token such as the glow has to be split.
 */
export function solidAndOpacity(color: string): { solid: string; opacity: number } {
  const match = RGBA.exec(color);
  if (!match) return { solid: color, opacity: 1 };
  return { solid: `rgb(${match[1]},${match[2]},${match[3]})`, opacity: Number(match[4]) };
}
