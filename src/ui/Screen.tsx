import type { ReactNode } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";
import { useTheme } from "@/theme/ThemeProvider";
import { spacing } from "@/theme/tokens";

type ScreenProps = {
  children: ReactNode;
  /** Fixed above the content: usually a ScreenHeader. */
  header?: ReactNode;
  /** Under the header, above the content: an OfflineBanner. */
  banner?: ReactNode;
  /** Scrolls the content (default). Off for screens that bring their own list. */
  scroll?: boolean;
  /** Pull to refresh, for scrolling screens. */
  refreshing?: boolean;
  onRefresh?: () => void;
  /** The content's side and top padding (default on). */
  padded?: boolean;
  /** Which edges keep clear of the notch and home indicator. Tab screens leave the bottom to the tab bar. */
  edges?: Edge[];
};

/** A screen's frame: the ground colour, safe areas, header, and the content (scrolling by default). */
export function Screen({
  children,
  header,
  banner,
  scroll = true,
  refreshing = false,
  onRefresh,
  padded = true,
  edges = ["top", "left", "right"],
}: ScreenProps) {
  const { colors } = useTheme();
  const content = scroll ? (
    <ScrollView
      style={styles.fill}
      contentContainerStyle={[padded && styles.padded, styles.scrollContent]}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.fill, padded && styles.padded]}>{children}</View>
  );

  return (
    <SafeAreaView edges={edges} style={[styles.fill, { backgroundColor: colors.ground }]}>
      {header}
      {banner}
      {content}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  padded: { paddingHorizontal: spacing.l, paddingTop: spacing.l },
  scrollContent: { paddingBottom: spacing.xxxl * 2 },
});
