import { useState } from "react";
import { StyleSheet, View, type LayoutChangeEvent } from "react-native";
import Svg, { G, Line, Path } from "react-native-svg";
import { money } from "@/format/money";
import { MONTHS, partsOf } from "@/format/time";
import { useTheme } from "@/theme/ThemeProvider";
import { spacing } from "@/theme/tokens";
import { Text } from "@/ui";
import { barPath, niceMax } from "@/ui/charts/core";

export type MonthBar = {
  /** The month's first day, "yyyy-MM-01". */
  month: string;
  /** Both from the API: money received, and the profit after overhead and admins' salaries. */
  revenue: number;
  netProfit: number;
};

type MonthlyChartProps = {
  months: MonthBar[];
  height?: number;
};

/** Revenue against net profit, month by month: a pair of bars each, losses below the line. */
export function MonthlyChart({ months, height = 150 }: MonthlyChartProps) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const top = Math.max(1, niceMax(Math.max(0, ...months.flatMap((m) => [m.revenue, m.netProfit]))));
  const bottom = Math.min(0, ...months.map((m) => m.netProfit));
  const span = top - bottom || 1;
  const y = (value: number) => ((top - value) / span) * height;
  const zero = y(0);
  const slot = width / Math.max(1, months.length);
  const barW = Math.max(3, Math.min(12, (slot - 6) / 2));
  const latest = months[months.length - 1];

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={
        latest
          ? `Revenue and net profit by month. ${MONTHS[partsOf(latest.month).month]}: revenue ${money.exact(latest.revenue)}, net profit ${money.exact(latest.netProfit)}.`
          : "Revenue and net profit by month"
      }
    >
      <View style={styles.legend}>
        <Swatch color={colors.chart} label="Revenue" />
        <Swatch color={colors.profit} label="Net profit" />
        <Swatch color={colors.loss} label="Loss" />
      </View>
      <View onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}>
        {width > 0 && (
          <Svg width={width} height={height}>
            <Line x1={0} x2={width} y1={zero} y2={zero} stroke={colors.axis} strokeWidth={1} />
            {months.map((m, i) => {
              const x = i * slot + (slot - barW * 2 - 2) / 2;
              const profitTop = m.netProfit >= 0 ? y(m.netProfit) : zero;
              return (
                <G key={m.month}>
                  <Path
                    d={barPath(
                      x,
                      y(Math.max(0, m.revenue)),
                      barW,
                      zero - y(Math.max(0, m.revenue)),
                      3,
                    )}
                    fill={colors.chart}
                  />
                  <Path
                    d={
                      m.netProfit >= 0
                        ? barPath(x + barW + 2, profitTop, barW, zero - profitTop, 3)
                        : `M${x + barW + 2} ${zero}h${barW}v${y(m.netProfit) - zero}h${-barW}z`
                    }
                    fill={m.netProfit >= 0 ? colors.profit : colors.loss}
                  />
                </G>
              );
            })}
          </Svg>
        )}
      </View>
      <View style={styles.labels}>
        {months.map((m) => (
          <Text key={m.month} variant="micro" style={styles.label} numberOfLines={1}>
            {MONTHS[partsOf(m.month).month].slice(0, 1)}
          </Text>
        ))}
      </View>
      <Text variant="small" tone="muted">
        Top of the scale {money.short(top)}
      </Text>
    </View>
  );
}

function Swatch({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.swatch}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text variant="small" tone="secondary">
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  legend: { flexDirection: "row", flexWrap: "wrap", gap: spacing.l, marginBottom: spacing.m },
  swatch: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  dot: { width: 10, height: 10, borderRadius: 5 },
  labels: { flexDirection: "row", marginTop: spacing.xs, marginBottom: spacing.s },
  label: { flex: 1, textAlign: "center" },
});
