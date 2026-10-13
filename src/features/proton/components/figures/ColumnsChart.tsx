import { View } from "react-native";
import Svg, { Line, Path, Rect, Text as SvgText } from "react-native-svg";
import { useTheme } from "@/theme/ThemeProvider";
import { typography } from "@/theme/typography";
import { barPath, clamp } from "@/ui/charts/core";
import { axisRange, columnSlots, labelEvery, scaleY } from "../../chartGeometry";
import { ChartFrame } from "./ChartFrame";
import { PointTouch } from "./PointTouch";
import { seriesColor } from "./palette";

const TOP = 14;
const BOTTOM = 18;
const FADED = 0.4;

export type ChartPoint = {
  /** Under the column, short. */
  label: string;
  /** One figure per series; null where there is none. */
  values: (number | null)[];
  /** The period isn't over: drawn faded. */
  partial: boolean;
};

type ColumnsChartProps = {
  points: ChartPoint[];
  seriesCount: number;
  format: (value: number) => string;
  selected: number | null;
  onSelect: (index: number | null) => void;
  accessibilityLabel: string;
  summary: string;
  height?: number;
};

/**
 * One column per point (side by side when there are several series). A missing figure is a short muted dash on the
 * baseline, never a column of 0, and a point still in progress is faded.
 */
export function ColumnsChart({
  points,
  seriesCount,
  format,
  selected,
  onSelect,
  accessibilityLabel,
  summary,
  height = 150,
}: ColumnsChartProps) {
  const { colors } = useTheme();
  return (
    <ChartFrame accessibilityLabel={accessibilityLabel} summary={summary}>
      {(width) => {
        const plot = height - TOP - BOTTOM;
        const range = axisRange(points.flatMap((p) => p.values));
        const y = (value: number) => scaleY(value, range, TOP, plot);
        const base = y(0);
        const slots = columnSlots(points.length, seriesCount, width);
        const every = labelEvery(points.length);
        return (
          <View>
            <Svg width={width} height={height}>
              <Line
                x1={0}
                x2={width}
                y1={y(range.high)}
                y2={y(range.high)}
                stroke={colors.grid}
                strokeWidth={1}
              />
              <SvgText
                x={0}
                y={TOP - 4}
                fontSize={10}
                fontFamily={typography.mono.fontFamily}
                fill={colors.ink3}
              >
                {format(range.high)}
              </SvgText>
              <Line x1={0} x2={width} y1={base} y2={base} stroke={colors.axis} strokeWidth={1} />
              {points.map((point, i) =>
                point.values.map((value, s) => {
                  const x = slots.x(i, s);
                  if (value == null) {
                    return (
                      <Line
                        key={`${i}-${s}`}
                        x1={x}
                        x2={x + slots.bar}
                        y1={base}
                        y2={base}
                        stroke={colors.ink3}
                        strokeWidth={2}
                        opacity={FADED}
                      />
                    );
                  }
                  const dimmed = selected != null && selected !== i;
                  const opacity = point.partial ? FADED : dimmed ? 0.55 : 1;
                  const fill = seriesColor(colors, s);
                  return value >= 0 ? (
                    <Path
                      key={`${i}-${s}`}
                      d={barPath(x, y(value), slots.bar, base - y(value), 3)}
                      fill={fill}
                      opacity={opacity}
                    />
                  ) : (
                    <Rect
                      key={`${i}-${s}`}
                      x={x}
                      y={base}
                      width={slots.bar}
                      height={y(value) - base}
                      fill={fill}
                      opacity={opacity}
                    />
                  );
                }),
              )}
              {points.map((point, i) =>
                i % every === 0 ? (
                  <SvgText
                    key={`label-${i}`}
                    x={clamp(slots.center(i), 16, width - 16)}
                    y={height - 4}
                    fontSize={10}
                    textAnchor="middle"
                    fontFamily={typography.mono.fontFamily}
                    fill={selected === i ? colors.ink : colors.ink3}
                  >
                    {point.label}
                  </SvgText>
                ) : null,
              )}
            </Svg>
            <PointTouch
              count={points.length}
              selected={selected}
              onSelect={onSelect}
              height={height}
            />
          </View>
        );
      }}
    </ChartFrame>
  );
}
