import { useState } from "react";
import { Pressable, StyleSheet, View, type LayoutChangeEvent } from "react-native";
import Svg, { G, Line, Path } from "react-native-svg";
import { fmtDurShort } from "@/format/time";
import { useTheme } from "@/theme/ThemeProvider";
import { spacing } from "@/theme/tokens";
import { Text } from "../Text";
import { barPath, chartDescription } from "./core";

export type WeekDay = {
  /** "yyyy-MM-dd", reported back when the day is pressed. */
  key: string;
  /** Under the column, such as "Mon". */
  label: string;
  /** Logged minutes, from the API. */
  minutes: number;
  /** The day's required minutes, drawn as a dashed line; none on days off. */
  targetMinutes?: number | null;
  today?: boolean;
};

type WeekBarsProps = {
  days: WeekDay[];
  /** What the chart shows, for screen readers: "Hours this week". */
  accessibilityLabel: string;
  /** A short sentence about its data, for screen readers, worded by the caller who holds the data. */
  summary: string;
  /** The day shown as selected. */
  selectedKey?: string;
  onSelectDay?: (key: string) => void;
  height?: number;
};

/** A week of logged hours: a rounded column per day, the day's requirement as a dashed line. */
export function WeekBars({
  days,
  accessibilityLabel,
  summary,
  selectedKey,
  onSelectDay,
  height = 132,
}: WeekBarsProps) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const top = 18;
  const plot = height - top;
  const max = Math.max(60, ...days.map((d) => Math.max(d.minutes, d.targetMinutes ?? 0)));
  const slot = width / Math.max(1, days.length);
  const barW = Math.min(26, Math.max(6, slot - 14));
  const y = (minutes: number) => top + plot - (minutes / max) * plot;

  return (
    <View onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}>
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={chartDescription(accessibilityLabel, summary)}
        style={{ height }}
      >
        {width > 0 && (
          <Svg width={width} height={height}>
            <Line
              x1={0}
              x2={width}
              y1={height - 0.5}
              y2={height - 0.5}
              stroke={colors.axis}
              strokeWidth={1}
            />
            {days.map((d, i) => {
              const x = i * slot + (slot - barW) / 2;
              const selected = d.key === selectedKey || (!selectedKey && d.today);
              return (
                <G key={d.key}>
                  <Path
                    d={barPath(x, y(d.minutes), barW, plot + top - y(d.minutes), 4)}
                    fill={selected ? colors.accent : colors.chart}
                    opacity={selected ? 1 : 0.55}
                  />
                  {d.targetMinutes ? (
                    <Line
                      x1={x - 4}
                      x2={x + barW + 4}
                      y1={y(d.targetMinutes)}
                      y2={y(d.targetMinutes)}
                      stroke={colors.ink3}
                      strokeWidth={1}
                      strokeDasharray="3 3"
                    />
                  ) : null}
                </G>
              );
            })}
          </Svg>
        )}
      </View>
      <View style={styles.labels}>
        {days.map((d) => {
          const selected = d.key === selectedKey || (!selectedKey && d.today);
          return (
            <Pressable
              key={d.key}
              disabled={!onSelectDay}
              onPress={() => onSelectDay?.(d.key)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`${d.label}, ${fmtDurShort(d.minutes)}`}
              style={styles.day}
            >
              <Text variant="micro" tone={selected ? "accent" : "muted"}>
                {d.label}
              </Text>
              <Text variant="mono" style={styles.value} tone={selected ? "default" : "secondary"}>
                {d.minutes ? fmtDurShort(d.minutes) : "–"}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  labels: { flexDirection: "row" },
  day: { flex: 1, alignItems: "center", gap: spacing.xxs, minHeight: 44, paddingTop: spacing.s },
  value: { fontSize: 11.5, lineHeight: 15 },
});
