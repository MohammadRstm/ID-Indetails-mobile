import { StyleSheet, View } from "react-native";
import Svg, { Line, Rect } from "react-native-svg";
import { useTheme } from "@/theme/ThemeProvider";
import { spacing } from "@/theme/tokens";
import { Text } from "@/ui";
import { rankBarSpans } from "../../chartGeometry";
import { ChartFrame } from "./ChartFrame";

const BAR_HEIGHT = 8;

type RankBarsProps = {
  items: { label: string; value: number }[];
  format: (value: number) => string;
  accessibilityLabel: string;
  summary: string;
};

/** Ranked categories as horizontal bars, each under its name and figure. A negative value reaches left of zero. */
export function RankBars({ items, format, accessibilityLabel, summary }: RankBarsProps) {
  const { colors } = useTheme();
  const values = items.map((item) => item.value);
  const signed = values.some((value) => value < 0);
  return (
    <ChartFrame accessibilityLabel={accessibilityLabel} summary={summary}>
      {(width) => {
        const { spans, zero } = rankBarSpans(values, width);
        return (
          <View style={styles.list}>
            {items.map((item, i) => (
              <View key={i} style={styles.item}>
                <View style={styles.head}>
                  <Text variant="small" numberOfLines={2} style={styles.label}>
                    {item.label}
                  </Text>
                  <Text variant="mono" style={styles.value}>
                    {format(item.value)}
                  </Text>
                </View>
                <Svg width={width} height={BAR_HEIGHT}>
                  <Rect
                    width={width}
                    height={BAR_HEIGHT}
                    rx={BAR_HEIGHT / 2}
                    fill={colors.surface3}
                  />
                  <Rect
                    x={spans[i].x}
                    width={spans[i].width}
                    height={BAR_HEIGHT}
                    rx={BAR_HEIGHT / 2}
                    fill={item.value < 0 ? colors.loss : colors.chart}
                  />
                  {signed ? (
                    <Line
                      x1={zero}
                      x2={zero}
                      y1={0}
                      y2={BAR_HEIGHT}
                      stroke={colors.ink3}
                      strokeWidth={1}
                    />
                  ) : null}
                </Svg>
              </View>
            ))}
          </View>
        );
      }}
    </ChartFrame>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.row },
  item: { gap: spacing.xs },
  head: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: spacing.m,
  },
  label: { flex: 1 },
  value: { fontSize: 12.5, lineHeight: 17 },
});
