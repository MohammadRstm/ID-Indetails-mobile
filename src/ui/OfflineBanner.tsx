import { StyleSheet, View } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { spacing } from "@/theme/tokens";
import { Icon } from "./Icon";
import { Text } from "./Text";

type OfflineBannerProps = {
  /** When the data on screen was loaded, already formatted (fmtTime), such as "10:42 AM". */
  loadedAt?: string;
};

/** The thin bar shown while the phone is offline and the screen shows what it loaded earlier. */
export function OfflineBanner({ loadedAt }: OfflineBannerProps) {
  const { colors } = useTheme();
  return (
    <View
      accessibilityRole="alert"
      style={[styles.banner, { backgroundColor: colors.warnSoft, borderBottomColor: colors.line }]}
    >
      <Icon name="info" size={16} color={colors.warn} />
      <Text variant="small" tone="warn" style={styles.text}>
        {loadedAt ? `You're offline. Showing what was loaded at ${loadedAt}.` : "You're offline."}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.s,
    paddingHorizontal: spacing.l,
    paddingVertical: spacing.s,
    borderBottomWidth: 1,
  },
  text: { flex: 1 },
});
