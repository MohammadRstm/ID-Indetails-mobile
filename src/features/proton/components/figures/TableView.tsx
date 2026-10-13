import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { spacing } from "@/theme/tokens";
import { Text } from "@/ui";
import type { ProtonRef } from "../../api";
import type { TableShape } from "../../figureModel";

const FIRST_WIDTH = 150;
const OTHER_WIDTH = 96;

type TableViewProps = {
  table: TableShape;
  /** What opening a row's record does, or null when this person can't open it here. */
  openRef: (ref: ProtonRef) => (() => void) | null;
};

/**
 * A table, scrolling sideways when its columns don't fit. The first cell of a row about a record opens that record.
 * A missing value is a dash.
 */
export function TableView({ table, openRef }: TableViewProps) {
  const { colors } = useTheme();
  const widthOf = (i: number) => (i === 0 ? FIRST_WIDTH : OTHER_WIDTH);
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} nestedScrollEnabled>
      <View>
        <View style={[styles.row, { borderBottomColor: colors.line2 }]}>
          {table.columns.map((column, i) => (
            <View key={column.key} style={[styles.cell, { width: widthOf(i) }]}>
              <Text variant="micro" align={column.right ? "right" : "left"} numberOfLines={2}>
                {column.label}
              </Text>
            </View>
          ))}
        </View>
        {table.rows.map((row, r) => {
          const open = row.ref ? openRef(row.ref) : null;
          return (
            <View key={r} style={[styles.row, { borderBottomColor: colors.line }]}>
              {row.cells.map((text, i) => {
                const align = table.columns[i].right ? "right" : "left";
                return (
                  <View key={table.columns[i].key} style={[styles.cell, { width: widthOf(i) }]}>
                    {i === 0 && open ? (
                      <Pressable
                        onPress={open}
                        accessibilityRole="link"
                        accessibilityLabel={text}
                        style={styles.link}
                      >
                        <Text variant="small" tone="accent" numberOfLines={2}>
                          {text}
                        </Text>
                      </Pressable>
                    ) : (
                      <Text variant="small" align={align} numberOfLines={2}>
                        {text}
                      </Text>
                    )}
                  </View>
                );
              })}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", borderBottomWidth: 1 },
  cell: { minHeight: 44, justifyContent: "center", paddingHorizontal: spacing.s },
  link: { minHeight: 44, justifyContent: "center" },
});
