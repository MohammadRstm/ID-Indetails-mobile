import { StyleSheet, View } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import type { ColorName } from "@/theme/tokens";
import { radii } from "@/theme/tokens";

type BarProps = {
  /** How full, from 0 to 1 (as given; values outside are clamped for drawing). */
  value: number;
  tone?: "accent" | "ok" | "warn" | "now";
  thin?: boolean;
  accessibilityLabel?: string;
};

const FILL: Record<NonNullable<BarProps["tone"]>, ColorName> = {
  accent: "accent",
  ok: "ok",
  warn: "warnMark",
  now: "now",
};

/** A thin progress bar (the web's `.bar`). */
export function Bar({ value, tone = "accent", thin, accessibilityLabel }: BarProps) {
  const { colors } = useTheme();
  const fill = Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(fill * 100) }}
      style={[styles.track, thin && styles.thin, { backgroundColor: colors.surface3 }]}
    >
      <View
        style={[styles.fill, { width: `${fill * 100}%`, backgroundColor: colors[FILL[tone]] }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { height: 6, borderRadius: radii.pill, overflow: "hidden" },
  thin: { height: 4 },
  fill: { height: "100%", borderRadius: radii.pill },
});
