import { Text as NativeText, type TextProps as NativeTextProps } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import type { ColorName } from "@/theme/tokens";
import { typography, type TextVariant } from "@/theme/typography";

export type TextTone =
  "default" | "secondary" | "muted" | "accent" | "danger" | "ok" | "warn" | "onAccent" | "inverse";

const TONES: Record<TextTone, ColorName> = {
  default: "ink",
  secondary: "ink2",
  muted: "ink3",
  accent: "accentInk",
  danger: "now",
  ok: "ok",
  warn: "warn",
  onAccent: "onAccent",
  inverse: "ground",
};

export type TextProps = NativeTextProps & {
  variant?: TextVariant;
  /** Micro labels default to muted, everything else to ink. */
  tone?: TextTone;
  align?: "left" | "center" | "right";
};

/** Text in one of the web's type roles and one of its ink tones. */
export function Text({ variant = "body", tone, align, style, ...rest }: TextProps) {
  const { colors } = useTheme();
  const color = colors[TONES[tone ?? (variant === "micro" ? "muted" : "default")]];
  return (
    <NativeText
      {...rest}
      style={[typography[variant], { color }, align && { textAlign: align }, style]}
    />
  );
}
