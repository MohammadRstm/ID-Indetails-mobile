import { StyleSheet, View } from "react-native";
import { spacing } from "@/theme/tokens";
import { Card, Chip, ListRow, Text } from "@/ui";
import { Bubble } from "./Bubble";

/** One thing worth a look, from the briefing: opens its project when there is one. */
export type BriefingRow = {
  key: string;
  name: string;
  fact: string;
  /** How many more facts the item has beyond `fact`. */
  extra: number;
  onPress?: () => void;
};

type ProtonWelcomeProps = {
  greeting: string;
  rows: BriefingRow[];
  /** How many more things there are beyond the rows. */
  more: number;
  starters: string[];
  onStarter: (question: string) => void;
};

/** What an empty chat shows: Proton's hello, the few things most worth a look, and questions to start with. */
export function ProtonWelcome({ greeting, rows, more, starters, onStarter }: ProtonWelcomeProps) {
  const intro =
    rows.length > 0 ? "A few things you may want to look at:" : "What can I help you with?";
  const howMany = more === 1 ? "is 1 more" : `are ${more} more`;
  return (
    <View style={styles.wrap}>
      <Bubble from="proton" text={`${greeting} ${intro}`} />
      {rows.length > 0 ? (
        <Card padded={false}>
          {rows.map((row, i) => (
            <ListRow
              key={row.key}
              title={row.name}
              subtitle={row.extra > 0 ? `${row.fact} (and ${row.extra} more)` : row.fact}
              onPress={row.onPress}
              chevron={!!row.onPress}
              divider={i < rows.length - 1}
            />
          ))}
        </Card>
      ) : null}
      {more > 0 ? (
        <Text variant="small" tone="muted">
          {`There ${howMany}. Ask me what needs your attention.`}
        </Text>
      ) : null}
      {starters.length > 0 ? (
        <View style={styles.starters} accessibilityLabel="Ways to start">
          {starters.map((question) => (
            <Chip key={question} label={question} onPress={() => onStarter(question)} />
          ))}
        </View>
      ) : null}
      <Text variant="small" tone="muted">
        I only use what you are allowed to see.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.m },
  starters: { flexDirection: "row", flexWrap: "wrap", gap: spacing.s },
});
