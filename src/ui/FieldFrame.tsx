import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { radii, spacing } from "@/theme/tokens";
import { Icon } from "./Icon";
import { Text } from "./Text";

/*
 * What every field shares: the label above (the web's `.label`), the box with its focus ring, and a hint or an
 * error below (the web's `.err`). Used by the field components only.
 */

type FieldFrameProps = {
  label?: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  children: ReactNode;
};

export function FieldFrame({ label, hint, error, optional, children }: FieldFrameProps) {
  return (
    <View style={styles.field}>
      {label ? (
        <Text variant="label" tone="secondary">
          {label}
          {optional ? (
            <Text variant="small" tone="muted">
              {" · optional"}
            </Text>
          ) : null}
        </Text>
      ) : null}
      {children}
      {error ? (
        <View style={styles.message} accessibilityRole="alert">
          <ErrorIcon />
          <Text variant="small" tone="danger" style={styles.messageText}>
            {error}
          </Text>
        </View>
      ) : hint ? (
        <Text variant="small" tone="muted">
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

function ErrorIcon() {
  const { colors } = useTheme();
  return <Icon name="alert" size={15} color={colors.now} />;
}

/** The input box's border and focus ring: accent border with a 3pt accent-soft ring, red on error. */
export function useBoxStyle(focused: boolean, error: boolean, disabled?: boolean) {
  const { colors } = useTheme();
  return [
    styles.box,
    { backgroundColor: colors.surface, borderColor: colors.line2 },
    focused && { borderColor: colors.accent, boxShadow: `0 0 0 3px ${colors.accentSoft}` },
    error && { borderColor: colors.now },
    disabled && { opacity: 0.55 },
  ];
}

const styles = StyleSheet.create({
  field: { gap: spacing.s },
  message: { flexDirection: "row", gap: spacing.xs, alignItems: "flex-start" },
  messageText: { flex: 1 },
  box: {
    minHeight: spacing.touch,
    borderWidth: 1,
    borderRadius: radii.input,
    paddingHorizontal: spacing.row + 2,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.m,
  },
});
