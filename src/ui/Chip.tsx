import { Pressable, StyleSheet } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { radii, spacing } from "@/theme/tokens";
import { Icon, type IconName } from "./Icon";
import { Text } from "./Text";

type ChipProps = {
  label: string;
  onPress: () => void;
  selected?: boolean;
  /** A count after the label, such as how many items the filter shows. */
  count?: number;
  icon?: IconName;
};

/** A filter chip (the web's `.chip`); selected is accent tint behind accent text. */
export function Chip({ label, onPress, selected, count, icon }: ChipProps) {
  const { colors } = useTheme();
  const ink = selected ? colors.accentInk : colors.ink2;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      accessibilityLabel={count == null ? label : `${label}, ${count}`}
      hitSlop={{ top: 6, bottom: 6 }}
      style={({ pressed }) => [
        styles.chip,
        selected
          ? { backgroundColor: colors.accentSoft, borderColor: "transparent" }
          : { backgroundColor: colors.surface, borderColor: pressed ? colors.line2 : colors.line },
      ]}
    >
      {icon && <Icon name={icon} size={15} color={ink} />}
      <Text variant={selected ? "badge" : "small"} style={{ color: ink }} numberOfLines={1}>
        {label}
      </Text>
      {count != null && (
        <Text
          variant="small"
          style={[styles.count, { color: selected ? colors.accentInk : colors.ink3 }]}
        >
          {count}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.s,
    minHeight: 34,
    paddingHorizontal: spacing.row + 2,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  count: { fontVariant: ["tabular-nums"] },
});
