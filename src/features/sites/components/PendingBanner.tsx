import { Pressable, StyleSheet } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { radii, spacing } from "@/theme/tokens";
import { Icon, Text } from "@/ui";

type PendingBannerProps = {
  waiting: number;
  needsAttention: number;
  onPress: () => void;
};

/** "2 records waiting to send · 1 needs attention", shown while anything recorded offline isn't on the server. */
export function PendingBanner({ waiting, needsAttention, onPress }: PendingBannerProps) {
  const { colors } = useTheme();
  const urgent = needsAttention > 0;
  const parts = [
    waiting ? `${waiting} record${waiting === 1 ? "" : "s"} waiting to send` : null,
    needsAttention ? `${needsAttention} need${needsAttention === 1 ? "s" : ""} attention` : null,
  ].filter(Boolean);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={[
        styles.banner,
        { backgroundColor: urgent ? colors.nowSoft : colors.warnSoft, borderColor: colors.line },
      ]}
    >
      <Icon
        name={urgent ? "alert" : "refresh"}
        size={18}
        color={urgent ? colors.now : colors.warn}
      />
      <Text variant="small" tone={urgent ? "danger" : "warn"} style={styles.text}>
        {parts.join(" · ")}
      </Text>
      <Icon name="chevronRight" size={16} color={colors.ink3} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.m,
    minHeight: 44,
    paddingHorizontal: spacing.l,
    paddingVertical: spacing.m,
    borderRadius: radii.r2,
    borderWidth: 1,
  },
  text: { flex: 1 },
});
