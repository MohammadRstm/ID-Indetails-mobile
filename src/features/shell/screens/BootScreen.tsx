import { ActivityIndicator, StyleSheet, View } from "react-native";
import { BrandMark } from "@/auth/components/BrandMark";
import { useTheme } from "@/theme/ThemeProvider";
import { spacing } from "@/theme/tokens";

/** What shows while the session is restored and the company settings load: the mark, as on the splash. */
export function BootScreen() {
  const { colors } = useTheme();
  return (
    <View style={[styles.fill, { backgroundColor: colors.ground }]} accessibilityLabel="Loading">
      <BrandMark logoUri={null} size={56} />
      <ActivityIndicator color={colors.accent} />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.xxl },
});
