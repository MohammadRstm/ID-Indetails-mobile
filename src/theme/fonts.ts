import { Platform, type TextStyle } from "react-native";

/*
 * The web's faces: Archivo for text (widened for headings) and Martian Mono at 78% width for figures.
 * React Native can't set a variable font's width axis, so Phase 1b bundles static instances and maps each
 * face and weight to its family name here. Until then the system fonts stand in.
 */

export type FontFace = "sans" | "sansWide" | "mono";
export type FontWeight = 400 | 500 | 550 | 600 | 650 | 700;

/** The font files to load at start (`useFonts`), by family name. Empty while the system fonts stand in. */
export const fontAssets: Record<string, number> = {};

const systemMono = Platform.select({ ios: "Menlo", default: "monospace" });

// System fonts have no 550 or 650: they round to the nearest weight they have.
const systemWeight: Record<FontWeight, TextStyle["fontWeight"]> = {
  400: "400",
  500: "500",
  550: "500",
  600: "600",
  650: "600",
  700: "700",
};

/** The family and weight for a face, ready to spread into a text style. */
export function fontStyle(face: FontFace, weight: FontWeight): TextStyle {
  return {
    fontFamily: face === "mono" ? systemMono : undefined,
    fontWeight: systemWeight[weight],
  };
}
