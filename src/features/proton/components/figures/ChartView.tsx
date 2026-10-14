import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { spacing } from "@/theme/tokens";
import { Text } from "@/ui";
import { chartSummary, pointReadout } from "../../figureModel";
import { formatValue, pointLabel, type ProtonChartBlock } from "../../figures";
import { ColumnsChart, type ChartPoint } from "./ColumnsChart";
import { CompositionBar } from "./CompositionBar";
import { LineChart } from "./LineChart";
import { seriesColor } from "./palette";
import { RankBars } from "./RankBars";

type ChartViewProps = {
  chart: ProtonChartBlock;
  /** What the chart is, for a screen reader; the figures follow as its summary. */
  accessibilityLabel: string;
};

/**
 * One chart block, drawn at the room it has. A missing figure is never drawn as 0: a ranked chart leaves it out and
 * says so, a trend with a gap is drawn as columns with the gap shown empty, and a point still in progress is faded.
 */
export function ChartView({ chart, accessibilityLabel }: ChartViewProps) {
  const { colors } = useTheme();
  const [selected, setSelected] = useState<number | null>(null);
  const [first] = chart.series;
  const format = (v: number) => formatValue(first.unit, v, true);
  const summary = chartSummary(chart);

  if (chart.kind === "bar") {
    const items = chart.points.flatMap((p) =>
      p.values[0] == null ? [] : [{ label: p.label, value: p.values[0] }],
    );
    const missing = chart.points.length - items.length;
    return (
      <View style={styles.gap}>
        <RankBars
          items={items}
          format={format}
          accessibilityLabel={accessibilityLabel}
          summary={summary}
        />
        {missing > 0 ? <Note text={`No figure for ${missing} of them.`} /> : null}
      </View>
    );
  }

  if (chart.kind === "composition") {
    return (
      <CompositionBar
        parts={chart.points.map((p) => ({
          label: p.label,
          value: p.values[0] ?? null,
          text: formatValue(first.unit, p.values[0], true),
        }))}
        accessibilityLabel={accessibilityLabel}
        summary={summary}
      />
    );
  }

  const points: ChartPoint[] = chart.points.map((p) => ({
    label: pointLabel(chart.axis, p.label),
    values: chart.series.map((_, s) => p.values[s] ?? null),
    partial: p.partial ?? false,
  }));
  const gaps = points.filter((p) => p.values.some((v) => v == null)).length;
  const inProgress = points.some((p) => p.partial);
  const drawn = {
    points,
    seriesCount: chart.series.length,
    format,
    selected,
    onSelect: setSelected,
    accessibilityLabel,
    summary,
  };

  return (
    <View style={styles.gap}>
      {chart.series.length > 1 ? (
        <View style={styles.legend}>
          {chart.series.map((s, i) => (
            <View key={s.key} style={styles.key}>
              <View style={[styles.swatch, { backgroundColor: seriesColor(colors, i) }]} />
              <Text variant="small">{s.label}</Text>
            </View>
          ))}
        </View>
      ) : null}
      {chart.kind === "line" && gaps === 0 ? <LineChart {...drawn} /> : <ColumnsChart {...drawn} />}
      <Text variant="small" tone="muted">
        {selected != null ? pointReadout(chart, selected) : "Tap a point for its figure."}
      </Text>
      {gaps > 0 ? <Note text={`No figure for ${gaps} of the points.`} /> : null}
      {inProgress ? <Note text="Faded means it isn't over yet: the figure is so far." /> : null}
    </View>
  );
}

function Note({ text }: { text: string }) {
  return (
    <Text variant="small" tone="muted">
      {text}
    </Text>
  );
}

const styles = StyleSheet.create({
  gap: { gap: spacing.m },
  legend: { flexDirection: "row", flexWrap: "wrap", gap: spacing.l },
  key: { flexDirection: "row", alignItems: "center", gap: spacing.s },
  swatch: { width: 10, height: 10, borderRadius: 3 },
});
