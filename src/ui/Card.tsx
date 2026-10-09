import type { ReactNode } from "react";
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { radii, spacing } from "@/theme/tokens";

type CardProps = {
  children: ReactNode;
  /** Pads the content like the web's panel body; off for edge-to-edge lists. */
  padded?: boolean;
  /** The 3px accent stripe on the left that marks task cards. */
  accent?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

/** A flat card with a hairline border and no shadow (the web's `.panel`). */
export function Card({
  children,
  padded = true,
  accent,
  onPress,
  accessibilityLabel,
  style,
}: CardProps) {
  const { colors } = useTheme();
  const look = [
    styles.card,
    { backgroundColor: colors.surface, borderColor: colors.line },
    accent && { borderLeftWidth: 3, borderLeftColor: colors.accent },
    padded && styles.padded,
    style,
  ];

  if (!onPress) return <View style={look}>{children}</View>;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [look, pressed && { backgroundColor: colors.surface2 }]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: radii.r2, overflow: "hidden" },
  padded: { padding: spacing.l, gap: spacing.m },
});
