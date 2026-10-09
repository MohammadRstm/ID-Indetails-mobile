import { StyleSheet, View } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { BrandMark } from "./BrandMark";

/** What shows instead of the app while it is away from the foreground, and in the app switcher. */
export function PrivacyCover() {
  const { colors } = useTheme();
  return (
    <View
      style={[styles.fill, { backgroundColor: colors.ground }]}
      accessibilityLabel="ID InDetails"
    >
      <BrandMark logoUri={null} size={56} />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, alignItems: "center", justifyContent: "center" },
});
