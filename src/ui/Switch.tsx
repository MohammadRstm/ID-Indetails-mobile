import { Pressable, StyleSheet, View } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { light, radii, spacing } from "@/theme/tokens";

type SwitchProps = {
  value: boolean;
  onValueChange: (value: boolean) => void;
  accessibilityLabel: string;
  disabled?: boolean;
};

/** The web's on/off switch (`.switch`), drawn larger, inside a 44pt touch target. */
export function Switch({ value, onValueChange, accessibilityLabel, disabled }: SwitchProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={() => onValueChange(!value)}
      disabled={disabled}
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: value, disabled: !!disabled }}
      style={[styles.target, disabled && styles.disabled]}
    >
      <View style={[styles.track, { backgroundColor: value ? colors.accent : colors.line2 }]}>
        <View
          style={[
            styles.thumb,
            { boxShadow: colors.shadow1 },
            value && { transform: [{ translateX: 18 }] },
          ]}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  target: {
    minWidth: spacing.touch,
    minHeight: spacing.touch,
    alignItems: "center",
    justifyContent: "center",
  },
  track: { width: 44, height: 26, borderRadius: radii.pill, padding: 3 },
  // The thumb is white in both themes, as on the web.
  thumb: { width: 20, height: 20, borderRadius: radii.pill, backgroundColor: light.surface },
  disabled: { opacity: 0.45 },
});
