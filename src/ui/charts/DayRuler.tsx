// Ported from the web client: src/shared/components/Charts/DayRuler.tsx (see docs/ported-from-web.md), without the
// hover tooltip.
import { StyleSheet, View } from "react-native";
import { formatSettings, partsOf, type DateValue } from "@/format/time";
import { useTheme } from "@/theme/ThemeProvider";
import { radii } from "@/theme/tokens";
import { Text } from "../Text";
import { clamp } from "./core";

export type RulerBlock = { start: DateValue; end: DateValue; color?: string };

type DayRulerProps = {
  /** The blocks being shown (this entry). */
  blocks?: RulerBlock[];
  /** Other entries the same day, greyed. */
  others?: RulerBlock[];
  /** A red line at this moment. */
  now?: DateValue;
  /** The hours the ruler spans, 6 AM to 10 PM by default. */
  from?: number;
  to?: number;
  large?: boolean;
  scale?: boolean;
};

/** Where blocks of work sat in the company's day. */
export function DayRuler({
  blocks = [],
  others = [],
  now,
  from = 6,
  to = 22,
  large,
  scale = true,
}: DayRulerProps) {
  const { colors } = useTheme();
  const span = (to - from) * 60;
  const pos = (value: DateValue) => {
    const p = partsOf(value);
    return clamp(((p.hour * 60 + p.minute - from * 60) / span) * 100, 0, 100);
  };
  const h24 = formatSettings().use24HourTime;
  const inset = large ? 3 : 0;

  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View
        style={[
          styles.ruler,
          large
            ? [styles.large, { backgroundColor: colors.surface2, borderColor: colors.line }]
            : { backgroundColor: colors.surface3 },
        ]}
      >
        {others.map((e, i) => {
          const a = pos(e.start);
          const b = pos(e.end);
          return (
            <View
              key={`o${i}`}
              style={[
                styles.block,
                { top: inset, bottom: inset, left: `${a}%`, width: `${Math.max(0.8, b - a)}%` },
                { backgroundColor: colors.line2, borderRadius: large ? 4 : 2 },
              ]}
            />
          );
        })}
        {blocks.map((block, i) => {
          const a = pos(block.start);
          const c = pos(block.end);
          return (
            <View
              key={i}
              style={[
                styles.block,
                { top: inset, bottom: inset, left: `${a}%`, width: `${Math.max(0.8, c - a)}%` },
                { backgroundColor: block.color ?? colors.accent, borderRadius: large ? 4 : 2 },
              ]}
            />
          );
        })}
        {now != null && (
          <View
            style={[
              styles.block,
              styles.now,
              { left: `${pos(now)}%`, backgroundColor: colors.now },
            ]}
          />
        )}
      </View>
      {scale && (
        <View style={styles.scale}>
          {(h24 ? ["06:00", "12:00", "18:00", "22:00"] : ["6 AM", "12 PM", "6 PM", "10 PM"]).map(
            (label) => (
              <Text key={label} variant="mono" tone="muted" style={styles.scaleText}>
                {label}
              </Text>
            ),
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  ruler: { position: "relative", height: 8, borderRadius: 3, overflow: "hidden" },
  large: { height: 30, borderRadius: radii.r1, borderWidth: 1 },
  block: { position: "absolute", top: 0, bottom: 0 },
  now: { width: 1.5 },
  scale: { flexDirection: "row", justifyContent: "space-between", marginTop: 3 },
  scaleText: { fontSize: 10.5, lineHeight: 14 },
});
