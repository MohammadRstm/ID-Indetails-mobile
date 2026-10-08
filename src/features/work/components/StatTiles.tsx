import { StyleSheet, View } from "react-native";
import { spacing } from "@/theme/tokens";
import { Card, Text } from "@/ui";

export type Stat = { label: string; value: string; sub?: string };

/** A row of small figures (the web's KPI strip), each in its own card. */
export function StatTiles({ stats }: { stats: Stat[] }) {
  return (
    <View style={styles.row}>
      {stats.map((stat) => (
        <Card key={stat.label} style={styles.tile}>
          <Text variant="micro">{stat.label}</Text>
          <Text variant="figure">{stat.value}</Text>
          {stat.sub ? (
            <Text variant="small" tone="muted" numberOfLines={1}>
              {stat.sub}
            </Text>
          ) : null}
        </Card>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: spacing.m },
  tile: { flex: 1, gap: spacing.xs },
});
