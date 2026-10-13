import { useState, type ReactNode } from "react";
import { View, type LayoutChangeEvent } from "react-native";

type ChartFrameProps = {
  /** What the chart is, read out in place of the drawing. */
  accessibilityLabel: string;
  /** The chart's figures in words, read out after the label. */
  summary: string;
  /** Draws the chart at the width it was given. */
  children: (width: number) => ReactNode;
};

/** Measures the room a chart has, and reads it out as one picture with its figures in words. */
export function ChartFrame({ accessibilityLabel, summary, children }: ChartFrameProps) {
  const [width, setWidth] = useState(0);
  return (
    <View
      onLayout={(e: LayoutChangeEvent) => setWidth(Math.floor(e.nativeEvent.layout.width))}
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ text: summary }}
    >
      {width > 0 ? children(width) : null}
    </View>
  );
}
