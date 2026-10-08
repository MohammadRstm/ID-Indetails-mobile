import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { radii, spacing } from "@/theme/tokens";
import { Icon, type IconName } from "./Icon";
import { Text } from "./Text";

export type ButtonVariant = "primary" | "secondary" | "quiet" | "danger";

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  /** "large" for the one main action of a screen or sheet. */
  size?: "regular" | "large";
  icon?: IconName;
  disabled?: boolean;
  /** Shows a spinner and ignores presses while the action runs. */
  loading?: boolean;
  fullWidth?: boolean;
  accessibilityLabel?: string;
};

/** The web's buttons (`.btn`, `.btn-primary`, `.btn-quiet`, `.btn-danger`), at least 44pt tall. */
export function Button({
  label,
  onPress,
  variant = "secondary",
  size = "regular",
  icon,
  disabled,
  loading,
  fullWidth,
  accessibilityLabel,
}: ButtonProps) {
  const { colors } = useTheme();
  const look = {
    primary: {
      bg: colors.accent,
      pressed: colors.accent2,
      border: colors.accent,
      ink: colors.onAccent,
    },
    secondary: {
      bg: colors.surface,
      pressed: colors.surface3,
      border: colors.line2,
      ink: colors.ink,
    },
    quiet: { bg: "transparent", pressed: colors.surface3, border: "transparent", ink: colors.ink2 },
    danger: { bg: colors.surface, pressed: colors.nowSoft, border: colors.line2, ink: colors.now },
  }[variant];
  const inactive = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!disabled, busy: !!loading }}
      style={({ pressed }) => [
        styles.base,
        size === "large" && styles.large,
        fullWidth && styles.fullWidth,
        {
          backgroundColor: pressed ? look.pressed : look.bg,
          borderColor: variant === "danger" && pressed ? colors.now : look.border,
        },
        disabled && styles.disabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={look.ink} />
      ) : (
        <View style={styles.content}>
          {icon && <Icon name={icon} size={18} color={look.ink} />}
          <Text variant="button" style={{ color: look.ink }} numberOfLines={1}>
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: spacing.touch,
    paddingHorizontal: spacing.l,
    borderRadius: radii.r1,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
  },
  large: { minHeight: 50, paddingHorizontal: spacing.xl },
  fullWidth: { alignSelf: "stretch" },
  content: { flexDirection: "row", alignItems: "center", gap: spacing.s },
  disabled: { opacity: 0.45 },
});
