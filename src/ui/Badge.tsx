import { StyleSheet, View } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import type { ColorName } from "@/theme/tokens";
import { radii, spacing } from "@/theme/tokens";
import { Icon, type IconName } from "./Icon";
import { Text } from "./Text";

export type BadgeTone = "neutral" | "accent" | "ok" | "warn" | "done" | "arch" | "now" | "live";

// A soft fill with a strong text colour, as on the web's `.badge-*`.
const TONES: Record<BadgeTone, { fill: ColorName; ink: ColorName }> = {
  neutral: { fill: "surface3", ink: "ink2" },
  accent: { fill: "accentSoft", ink: "accentInk" },
  ok: { fill: "okSoft", ink: "ok" },
  warn: { fill: "warnSoft", ink: "warn" },
  done: { fill: "doneSoft", ink: "done" },
  arch: { fill: "archSoft", ink: "arch" },
  now: { fill: "nowSoft", ink: "now" },
  live: { fill: "accent", ink: "onAccent" },
};

type BadgeProps = {
  label: string;
  tone?: BadgeTone;
  icon?: IconName;
};

/** A small rounded pill. */
export function Badge({ label, tone = "neutral", icon }: BadgeProps) {
  const { colors } = useTheme();
  const { fill, ink } = TONES[tone];
  return (
    <View style={[styles.badge, { backgroundColor: colors[fill] }]}>
      {icon && <Icon name={icon} size={13} color={colors[ink]} />}
      <Text variant="badge" style={{ color: colors[ink] }} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: spacing.xs,
    minHeight: 24,
    paddingHorizontal: spacing.m,
    borderRadius: radii.pill,
  },
});
