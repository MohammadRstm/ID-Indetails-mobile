import { ScrollView, StyleSheet } from "react-native";
import { relDay } from "@/format/time";
import { spacing } from "@/theme/tokens";
import { Chip } from "@/ui";

type DayChipsProps = {
  /** "yyyy-MM-dd", newest first. */
  days: string[];
  value: string;
  onChange: (day: string) => void;
};

/** The days work can be put on, as a row of chips: Today, Yesterday, Monday, … */
export function DayChips({ days, value, onChange }: DayChipsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      accessibilityLabel="Day"
    >
      {days.map((day) => (
        <Chip
          key={day}
          label={relDay(day)}
          selected={day === value}
          onPress={() => onChange(day)}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: spacing.m, paddingVertical: spacing.xxs },
});
