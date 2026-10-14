import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { spacing } from "@/theme/tokens";
import { IconButton } from "./IconButton";
import { Text } from "./Text";

type ScreenHeaderProps = {
  title: string;
  subtitle?: string;
  /** Shows a back button; the smart screen decides where back goes. */
  onBack?: () => void;
  /** Something between the back button and the title (Proton's blob). */
  leading?: ReactNode;
  /** Icon buttons on the right. */
  actions?: ReactNode;
};

/** A screen's title bar: back, the page title (the web's `.page-title`), and actions. */
export function ScreenHeader({ title, subtitle, onBack, leading, actions }: ScreenHeaderProps) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.bar,
        { backgroundColor: colors.surface, borderBottomColor: colors.line },
        !onBack && styles.noBack,
      ]}
    >
      {onBack && <IconButton icon="chevronLeft" onPress={onBack} accessibilityLabel="Back" />}
      {leading}
      <View style={styles.titles}>
        <Text variant={onBack ? "heading" : "title"} accessibilityRole="header" numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="small" tone="muted" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {actions ? <View style={styles.actions}>{actions}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    minHeight: 56,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
  },
  noBack: { paddingLeft: spacing.l },
  titles: { flex: 1, minWidth: 0, gap: spacing.xxs },
  actions: { flexDirection: "row", alignItems: "center" },
});
