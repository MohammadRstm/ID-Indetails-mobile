import { StyleSheet, View } from "react-native";
import { spacing } from "@/theme/tokens";
import { Card, Text } from "@/ui";
import { FeedRow, type FeedRowItem } from "./FeedRow";

export type FeedDay = {
  key: string;
  /** "Today · Oct 8, 2026". */
  label: string;
  rows: { row: FeedRowItem; onPress?: () => void }[];
};

/** The feed, a card per day under the day's name (the web's feed-day groups). */
export function FeedDays({ days }: { days: FeedDay[] }) {
  return (
    <View style={styles.days}>
      {days.map((day) => (
        <View key={day.key} style={styles.day}>
          <Text variant="micro" accessibilityRole="header" style={styles.label}>
            {day.label}
          </Text>
          <Card padded={false}>
            {day.rows.map(({ row, onPress }, i) => (
              <FeedRow
                key={row.key}
                item={row}
                onPress={onPress}
                divider={i < day.rows.length - 1}
              />
            ))}
          </Card>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  days: { gap: spacing.l },
  day: { gap: spacing.m },
  label: { paddingHorizontal: spacing.xxs },
});
