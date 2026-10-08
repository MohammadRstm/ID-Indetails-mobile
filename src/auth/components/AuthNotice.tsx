import { StyleSheet, View } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { radii, spacing } from "@/theme/tokens";
import { Icon, Text, type IconName } from "@/ui";

type AuthNoticeProps = {
  text: string;
  /** "hold" for something to know (the web's `.banner.hold`), "ok" for a request that went through. */
  tone: "hold" | "ok";
  icon?: IconName;
};

/** A tinted note above or instead of a form (the web's `.banner`). */
export function AuthNotice({ text, tone, icon = "info" }: AuthNoticeProps) {
  const { colors } = useTheme();
  const look =
    tone === "ok"
      ? { background: colors.okSoft, ink: colors.ok }
      : { background: colors.warnSoft, ink: colors.warn };
  return (
    <View
      style={[styles.banner, { backgroundColor: look.background }]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <Icon name={icon} size={18} color={look.ink} />
      <Text variant="small" style={[styles.text, { color: look.ink }]}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    gap: spacing.row,
    alignItems: "flex-start",
    paddingVertical: spacing.row + 1,
    paddingHorizontal: spacing.l,
    borderRadius: radii.r2,
  },
  text: { flex: 1 },
});
