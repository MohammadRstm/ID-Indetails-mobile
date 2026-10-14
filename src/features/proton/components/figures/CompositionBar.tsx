import { StyleSheet, View } from "react-native";
import Svg, { Rect } from "react-native-svg";
import { useTheme } from "@/theme/ThemeProvider";
import { radii, spacing } from "@/theme/tokens";
import { Text } from "@/ui";
import { compositionSpans } from "../../chartGeometry";
import { ChartFrame } from "./ChartFrame";
import { partsPalette } from "./palette";

const BAR_HEIGHT = 14;

export type CompositionPart = {
  label: string;
  /** The figure, for the bar's share; null where there is none. */
  value: number | null;
  /** The figure in words, from the API's value. */
  text: string;
};

type CompositionBarProps = {
  parts: CompositionPart[];
  accessibilityLabel: string;
  summary: string;
};

/** The parts of one whole as a single bar split by size, with each part named under it. */
export function CompositionBar({ parts, accessibilityLabel, summary }: CompositionBarProps) {
  const { colors } = useTheme();
  const palette = partsPalette(colors);
  const colorOf = (i: number) => palette[i % palette.length];
  const values = parts.map((part) => part.value);
  return (
    <ChartFrame accessibilityLabel={accessibilityLabel} summary={summary}>
      {(width) => {
        const spans = compositionSpans(values, width);
        return (
          <View style={styles.wrap}>
            <Svg width={width} height={BAR_HEIGHT}>
              <Rect width={width} height={BAR_HEIGHT} rx={radii.r1} fill={colors.surface3} />
              {spans.map((span, i) =>
                span.width > 0 ? (
                  <Rect
                    key={i}
                    x={span.x}
                    width={Math.max(0, span.width - 1.5)}
                    height={BAR_HEIGHT}
                    fill={colorOf(i)}
                  />
                ) : null,
              )}
            </Svg>
            <View style={styles.legend}>
              {parts.map((part, i) => (
                <View key={i} style={styles.part}>
                  <View style={[styles.swatch, { backgroundColor: colorOf(i) }]} />
                  <Text variant="small" numberOfLines={2} style={styles.label}>
                    {part.label}
                  </Text>
                  <Text variant="mono" style={styles.value}>
                    {part.text}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        );
      }}
    </ChartFrame>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.m },
  legend: { gap: spacing.s },
  part: { flexDirection: "row", alignItems: "center", gap: spacing.m },
  swatch: { width: 10, height: 10, borderRadius: 3 },
  label: { flex: 1 },
  value: { fontSize: 12.5, lineHeight: 17 },
});
