import { StyleSheet, View } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { radii, spacing } from "@/theme/tokens";
import { Text } from "@/ui";
import type { KpiTile } from "../../figureModel";

/** Headline figures side by side, wrapping on a narrow phone. A missing figure is a dash. */
export function KpiRow({ tiles }: { tiles: KpiTile[] }) {
  const { colors } = useTheme();
  return (
    <View style={styles.row}>
      {tiles.map((tile) => (
        <View
          key={tile.key}
          accessible
          accessibilityLabel={`${tile.label}: ${tile.value}${tile.sub ? `, ${tile.sub}` : ""}`}
          style={[styles.tile, { backgroundColor: colors.surface2, borderColor: colors.line }]}
        >
          <Text variant="micro" numberOfLines={2}>
            {tile.label}
          </Text>
          <Text variant="figure" numberOfLines={1} adjustsFontSizeToFit>
            {tile.value}
          </Text>
          {tile.sub ? (
            <Text variant="small" tone="muted" numberOfLines={1}>
              {tile.sub}
            </Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", gap: spacing.m },
  tile: {
    flexGrow: 1,
    flexBasis: "30%",
    minWidth: 96,
    gap: spacing.xxs,
    padding: spacing.row,
    borderWidth: 1,
    borderRadius: radii.r2,
  },
});
