import { ScrollView, StyleSheet } from "react-native";
import { spacing } from "@/theme/tokens";
import { Chip } from "@/ui";

export type ChipOption<T extends string> = { value: T; label: string };

type ChipRowProps<T extends string> = {
  options: ChipOption<T>[];
  value: T;
  onChange: (value: T) => void;
};

/** One choice from a row of filter chips that scrolls sideways (the web's ChipGroup). */
export function ChipRow<T extends string>({ options, value, onChange }: ChipRowProps<T>) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      style={styles.scroll}
    >
      {options.map((option) => (
        <Chip
          key={option.value}
          label={option.label}
          selected={option.value === value}
          onPress={() => onChange(option.value)}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 0, marginBottom: spacing.l },
  row: { gap: spacing.s, paddingVertical: spacing.xs },
});
