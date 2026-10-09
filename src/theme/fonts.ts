import type { TextStyle } from "react-native";

/*
 * The web's faces: Archivo for text (widened for titles) and Martian Mono at 78% width for figures.
 * React Native can't set a variable font's width axis, so each width and weight is a static font file made from
 * the web's variable fonts by scripts/fonts.py, loaded at start under its own family name.
 */

export type FontFace = "sans" | "sansWide" | "mono";
export type FontWeight = 400 | 500 | 550 | 600 | 650 | 700;

/** The font files to load at start (`useFonts`), by family name. */
export const fontAssets = {
  "Archivo-400": require("../../assets/fonts/Archivo-400.ttf"),
  "Archivo-500": require("../../assets/fonts/Archivo-500.ttf"),
  "Archivo-600": require("../../assets/fonts/Archivo-600.ttf"),
  "Archivo-650": require("../../assets/fonts/Archivo-650.ttf"),
  "ArchivoWide-650": require("../../assets/fonts/ArchivoWide-650.ttf"),
  "MartianMono-400": require("../../assets/fonts/MartianMono-400.ttf"),
  "MartianMono-600": require("../../assets/fonts/MartianMono-600.ttf"),
} satisfies Record<string, number>;

type Family = keyof typeof fontAssets;

// Each face has only the weights the app draws; a weight in between uses the nearest file.
const FAMILIES: Record<FontFace, Record<FontWeight, Family>> = {
  sans: {
    400: "Archivo-400",
    500: "Archivo-500",
    550: "Archivo-500",
    600: "Archivo-600",
    650: "Archivo-650",
    700: "Archivo-650",
  },
  sansWide: {
    400: "ArchivoWide-650",
    500: "ArchivoWide-650",
    550: "ArchivoWide-650",
    600: "ArchivoWide-650",
    650: "ArchivoWide-650",
    700: "ArchivoWide-650",
  },
  mono: {
    400: "MartianMono-400",
    500: "MartianMono-400",
    550: "MartianMono-600",
    600: "MartianMono-600",
    650: "MartianMono-600",
    700: "MartianMono-600",
  },
};

/**
 * The family for a face and weight, ready to spread into a text style. The weight is in the file, so no
 * fontWeight is set: Android would otherwise draw a synthetic bold over it.
 */
export function fontStyle(face: FontFace, weight: FontWeight): TextStyle {
  return { fontFamily: FAMILIES[face][weight] };
}
