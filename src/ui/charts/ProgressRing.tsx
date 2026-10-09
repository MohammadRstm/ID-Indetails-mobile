import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { useTheme } from "@/theme/ThemeProvider";
import type { ColorName } from "@/theme/tokens";

type ProgressRingProps = {
  /** How far round, from 0 to 1 (as given; drawn clamped). */
  value: number;
  size?: number;
  stroke?: number;
  tone?: "accent" | "ok" | "warn" | "now";
  /** In the middle, such as today's hours. */
  children?: ReactNode;
  accessibilityLabel?: string;
};

const TONE: Record<NonNullable<ProgressRingProps["tone"]>, ColorName> = {
  accent: "accent",
  ok: "ok",
  warn: "warnMark",
  now: "now",
};

/** A ring that fills clockwise from the top, such as today's hours against the day's requirement. */
export function ProgressRing({
  value,
  size = 96,
  stroke = 8,
  tone = "accent",
  children,
  accessibilityLabel,
}: ProgressRingProps) {
  const { colors } = useTheme();
  const fill = Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
  const r = (size - stroke) / 2;
  const length = 2 * Math.PI * r;

  return (
    <View
      style={{ width: size, height: size }}
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(fill * 100) }}
    >
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={colors.surface3}
          strokeWidth={stroke}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={colors[TONE[tone]]}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${length} ${length}`}
          strokeDashoffset={length * (1 - fill)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      {children ? <View style={styles.center}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: "center",
    justifyContent: "center",
  },
});
