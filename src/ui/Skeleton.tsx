import { useEffect, useState } from "react";
import { AccessibilityInfo, Animated, StyleSheet, View, type DimensionValue } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { spacing } from "@/theme/tokens";

type SkeletonProps = {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  /** A few lines of text on their way, the last one shorter. */
  lines?: number;
};

/** A block standing in for content that is loading, shimmering between the web's skeleton colours. */
export function Skeleton({ width = "100%", height = 14, radius = 5, lines }: SkeletonProps) {
  if (lines && lines > 1) {
    return (
      <View style={styles.lines} accessibilityLabel="Loading" accessibilityState={{ busy: true }}>
        {Array.from({ length: lines }, (_, i) => (
          <Block key={i} width={i === lines - 1 ? "60%" : width} height={height} radius={radius} />
        ))}
      </View>
    );
  }
  return <Block width={width} height={height} radius={radius} />;
}

function Block({
  width,
  height,
  radius,
}: {
  width: DimensionValue;
  height: number;
  radius: number;
}) {
  const { colors } = useTheme();
  const [phase] = useState(() => new Animated.Value(0));

  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null;
    let cancelled = false;
    void AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (cancelled || reduced) return;
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(phase, { toValue: 1, duration: 700, useNativeDriver: false }),
          Animated.timing(phase, { toValue: 0, duration: 700, useNativeDriver: false }),
        ]),
      );
      loop.start();
    });
    return () => {
      cancelled = true;
      loop?.stop();
    };
  }, [phase]);

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width,
        height,
        borderRadius: radius,
        backgroundColor: phase.interpolate({
          inputRange: [0, 1],
          outputRange: [colors.surface3, colors.line],
        }),
      }}
    />
  );
}

const styles = StyleSheet.create({
  lines: { gap: spacing.m + 1, paddingVertical: spacing.xs },
});
