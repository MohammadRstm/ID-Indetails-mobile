import { View } from "react-native";
import Svg, { Circle, G, Line, Path, Text as SvgText } from "react-native-svg";
import { useTheme } from "@/theme/ThemeProvider";
import { typography } from "@/theme/typography";
import { clamp } from "@/ui/charts/core";
import { axisRange, labelEvery, lineX, linePath, scaleY } from "../../chartGeometry";
import { ChartFrame } from "./ChartFrame";
import type { ChartPoint } from "./ColumnsChart";
import { PointTouch } from "./PointTouch";
import { seriesColor } from "./palette";

const TOP = 14;
const BOTTOM = 18;
/** Past this many points the dots would crowd the line, so only the line is drawn. */
const MAX_DOTS = 24;

type LineChartProps = {
  /** Every point has a figure for every series: a line would draw a missing one as 0, so such a chart is columns. */
  points: ChartPoint[];
  seriesCount: number;
  format: (value: number) => string;
  selected: number | null;
  onSelect: (index: number | null) => void;
  accessibilityLabel: string;
  summary: string;
  height?: number;
};

/** A trend over time: a line per series, the first with an area under it when it is alone. */
export function LineChart({
  points,
  seriesCount,
  format,
  selected,
  onSelect,
  accessibilityLabel,
  summary,
  height = 150,
}: LineChartProps) {
  const { colors } = useTheme();
  return (
    <ChartFrame accessibilityLabel={accessibilityLabel} summary={summary}>
      {(width) => {
        const plot = height - TOP - BOTTOM;
        const range = axisRange(points.flatMap((p) => p.values));
        const y = (value: number) => scaleY(value, range, TOP, plot);
        const base = y(0);
        const x = lineX(points.length, width);
        const xs = points.map((_, i) => x(i));
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
              {Array.from({ length: seriesCount }, (_, s) => {
                const ys = points.map((p) => {
                  const value = p.values[s];
                  return value == null ? null : y(value);
                });
                const path = linePath(xs, ys);
                const edge = (px: number) => `${px.toFixed(1)} ${base.toFixed(1)}`;
                const area = `${path}L${edge(xs[xs.length - 1])}L${edge(xs[0])}Z`;
                return (
                  <G key={s}>
                    {seriesCount === 1 ? <Path d={area} fill={colors.chartSoft} /> : null}
                    <Path
                      d={path}
                      fill="none"
                      stroke={seriesColor(colors, s)}
                      strokeWidth={2}
                      strokeLinejoin="round"
                      strokeLinecap="round"
                    />
                    {points.length <= MAX_DOTS
                      ? points.map((p, i) => (
                          <Circle
                            key={i}
                            cx={xs[i]}
                            cy={ys[i] ?? base}
                            r={2.5}
                            fill={p.partial ? colors.surface : seriesColor(colors, s)}
                            stroke={seriesColor(colors, s)}
                            strokeWidth={1.5}
                          />
                        ))
                      : null}
                  </G>
                );
              })}
              {selected != null ? (
                <Line
                  x1={xs[selected]}
                  x2={xs[selected]}
                  y1={TOP}
                  y2={base}
                  stroke={colors.ink3}
                  strokeWidth={1}
                  strokeDasharray="3 3"
                />
              ) : null}
              {points.map((point, i) =>
                i % every === 0 ? (
                  <SvgText
                    key={`label-${i}`}
                    x={clamp(xs[i], 16, width - 16)}
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
