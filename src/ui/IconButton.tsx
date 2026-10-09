import { Pressable, StyleSheet, View } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { radii, spacing } from "@/theme/tokens";
import { Icon, type IconName } from "./Icon";
import { Text } from "./Text";

type IconButtonProps = {
  icon: IconName;
  onPress: () => void;
  /** Read out instead of the icon; required, since the icon has no words. */
  accessibilityLabel: string;
  /** A red count (or a dot when true), like the web's message badge and bell pip. */
  badge?: number | boolean;
  /** Pressed-in look, for a toggle that is on. */
  active?: boolean;
  tone?: "default" | "accent" | "danger";
  disabled?: boolean;
};

/** A 44pt square button with one icon (the web's `.icon-btn`). */
export function IconButton({
  icon,
  onPress,
  accessibilityLabel,
  badge,
  active,
  tone = "default",
  disabled,
}: IconButtonProps) {
  const { colors } = useTheme();
  const ink = { default: colors.ink2, accent: colors.accentInk, danger: colors.now }[tone];
  const count = typeof badge === "number" ? badge : 0;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={count > 0 ? `${accessibilityLabel}, ${count}` : accessibilityLabel}
      accessibilityState={{ disabled: !!disabled, selected: !!active }}
      style={({ pressed }) => [
        styles.button,
        (pressed || active) && { backgroundColor: colors.surface3 },
        disabled && styles.disabled,
      ]}
    >
      <Icon name={icon} size={22} color={active ? colors.ink : ink} />
      {count > 0 && (
        <View style={[styles.count, { backgroundColor: colors.now, borderColor: colors.surface }]}>
          <Text variant="badge" style={[styles.countText, { color: colors.onAccent }]}>
            {count > 99 ? "99+" : count}
          </Text>
        </View>
      )}
      {badge === true && (
        <View style={[styles.pip, { backgroundColor: colors.now, borderColor: colors.surface }]} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: spacing.touch,
    height: spacing.touch,
    borderRadius: radii.r1,
    alignItems: "center",
    justifyContent: "center",
  },
  disabled: { opacity: 0.45 },
  count: {
    position: "absolute",
    top: 3,
    right: 3,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: radii.pill,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  countText: { fontSize: 10, lineHeight: 12, fontWeight: "700" },
  pip: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 10,
    height: 10,
    borderRadius: radii.pill,
    borderWidth: 2,
  },
});
