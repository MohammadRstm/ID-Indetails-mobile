import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { spacing } from "@/theme/tokens";
import { Button, Card, Text } from "@/ui";

type BlockCardProps = {
  title: string;
  period: string | null;
  /** What the data left out or counted differently, said under the figures. */
  notes: string[];
  /** When the figures were read. */
  source: string;
  /** More of the block than the chat shows: all the rows of a table, a chart's figures as a table. */
  action?: { label: string; onPress: () => void };
  children: ReactNode;
};

/** One chart, table or set of headline figures under Proton's answer, with its title, notes and source. */
export function BlockCard({ title, period, notes, source, action, children }: BlockCardProps) {
  return (
    <Card>
      <View style={styles.body}>
        <View>
          <Text variant="subheading" accessibilityRole="header">
            {title}
          </Text>
          {period ? (
            <Text variant="small" tone="muted">
              {period}
            </Text>
          ) : null}
        </View>
        {children}
        <View>
          {notes.map((note) => (
            <Text key={note} variant="small" tone="muted">
              {note}
            </Text>
          ))}
          <Text variant="small" tone="muted">
            {source}
          </Text>
        </View>
        {action ? <Button label={action.label} variant="quiet" onPress={action.onPress} /> : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  body: { gap: spacing.row },
});
