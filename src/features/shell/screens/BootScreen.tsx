import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";

/** What shows while the session is restored and the company settings load. */
export function BootScreen() {
  const { colors } = useTheme();
  return (
    <View style={[styles.fill, { backgroundColor: colors.ground }]} accessibilityLabel="Loading">
      <ActivityIndicator color={colors.accent} />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, alignItems: "center", justifyContent: "center" },
});
