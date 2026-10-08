import type { TextStyle } from "react-native";
import { fontStyle } from "./fonts";

/*
 * The web's type roles (investigation.md section 2, "Type"), scaled about 1.15× for reading on a phone while
 * keeping their proportions. Letter spacing is the web's em value times the size.
 */

const em = (size: number, value: number) => Math.round(size * value * 100) / 100;

export const typography = {
  /** Hero figure: 42 / 650, Archivo widened. */
  hero: {
    ...fontStyle("sansWide", 650),
    fontSize: 42,
    lineHeight: 48,
    letterSpacing: em(42, -0.03),
  },
  /** Page title: 21 / 650 on the web. */
  title: {
    ...fontStyle("sansWide", 650),
    fontSize: 24,
    lineHeight: 29,
    letterSpacing: em(24, -0.02),
  },
  /** Card and modal titles: 14–15 / 650. */
  heading: {
    ...fontStyle("sans", 650),
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: em(17, -0.015),
  },
  /** Panel title: 13.5 / 650. */
  subheading: {
    ...fontStyle("sans", 650),
    fontSize: 15.5,
    lineHeight: 21,
    letterSpacing: em(15.5, -0.01),
  },
  /** Body and inputs: 13, line height 1.45. */
  body: { ...fontStyle("sans", 400), fontSize: 15, lineHeight: 22 },
  bodyStrong: { ...fontStyle("sans", 600), fontSize: 15, lineHeight: 22 },
  /** Secondary lines, table cells: 12.5. */
  small: { ...fontStyle("sans", 400), fontSize: 13.5, lineHeight: 19 },
  /** Field label: 11.5 / 600. */
  label: { ...fontStyle("sans", 600), fontSize: 13, lineHeight: 17 },
  /** Buttons and tabs: 12.5 / 550. */
  button: { ...fontStyle("sans", 550), fontSize: 15, lineHeight: 20 },
  /** Badge: 11 / 600. */
  badge: { ...fontStyle("sans", 600), fontSize: 12.5, lineHeight: 16 },
  /** Micro label: 10 / 600, uppercase, tracked .1em. */
  micro: {
    ...fontStyle("sans", 600),
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: em(11, 0.1),
    textTransform: "uppercase",
  },
  /** Numbers in text: Martian Mono, tabular, tracked -.015em. */
  mono: {
    ...fontStyle("mono", 400),
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: em(14, -0.015),
    fontVariant: ["tabular-nums"],
  },
  /** KPI value: 19 / 650. */
  figure: {
    ...fontStyle("mono", 650),
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: em(22, -0.02),
    fontVariant: ["tabular-nums"],
  },
  /** Large money: 30 / 650. */
  figureLarge: {
    ...fontStyle("mono", 650),
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: em(32, -0.025),
    fontVariant: ["tabular-nums"],
  },
} satisfies Record<string, TextStyle>;

export type TextVariant = keyof typeof typography;
