import { Pressable, StyleSheet, View } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { radii, spacing } from "@/theme/tokens";
import { Text } from "./Text";

export type SegmentOption<T extends string> = { value: T; label: string };

type SegmentedProps<T extends string> = {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel?: string;
};

/** A few mutually exclusive choices side by side (the web's `.seg`). */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
}: SegmentedProps<T>) {
  const { colors } = useTheme();
  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
      style={[styles.track, { backgroundColor: colors.surface3 }]}
    >
      {options.map((option) => {
        const on = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            style={[
              styles.segment,
              on && { backgroundColor: colors.surface, boxShadow: colors.shadow1 },
            ]}
          >
            <Text
              variant="button"
              style={{ color: on ? colors.ink : colors.ink2 }}
              numberOfLines={1}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: "row", padding: 3, gap: 3, borderRadius: radii.r1 + 2 },
  segment: {
    flex: 1,
    minHeight: 38,
    paddingHorizontal: spacing.row,
    borderRadius: radii.r1,
    alignItems: "center",
    justifyContent: "center",
  },
});
