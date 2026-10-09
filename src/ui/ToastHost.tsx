import { useEffect, useState } from "react";
import { AccessibilityInfo, Animated, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/theme/ThemeProvider";
import { motion, radii, spacing } from "@/theme/tokens";
import { Icon } from "./Icon";
import { Text } from "./Text";
import { dismissToast, useToasts, type Toast } from "./toast";

/** Where toasts appear: the top of the screen, newest first. Rendered once by the app. */
export function ToastHost() {
  const toasts = useToasts();
  const insets = useSafeAreaInsets();
  return (
    <View pointerEvents="box-none" style={[styles.host, { top: insets.top + spacing.m }]}>
      {[...toasts].reverse().map((t) => (
        <ToastView key={t.id} toast={t} />
      ))}
    </View>
  );
}

/** One toast in the web's inverted style: ink background, ground text, an underlined action. */
function ToastView({ toast }: { toast: Toast }) {
  const { colors } = useTheme();
  const [shown] = useState(() => new Animated.Value(0));

  useEffect(() => {
    let cancelled = false;
    void AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (cancelled) return;
      if (reduced) shown.setValue(1);
      else
        Animated.timing(shown, {
          toValue: 1,
          duration: motion.toast,
          useNativeDriver: true,
        }).start();
    });
    AccessibilityInfo.announceForAccessibility(toast.text);
    return () => {
      cancelled = true;
    };
  }, [shown, toast.text]);

  return (
    <Animated.View
      accessibilityLiveRegion="polite"
      style={[
        styles.toast,
        {
          backgroundColor: colors.ink,
          boxShadow: colors.shadow2,
          opacity: shown,
          transform: [
            { translateY: shown.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] }) },
          ],
        },
      ]}
    >
      <Icon name={toast.icon ?? "checkCircle"} size={18} color={colors.ground} />
      <View style={styles.text}>
        <Text variant="small" tone="inverse">
          {toast.text}
        </Text>
        {toast.sub ? (
          <Text variant="small" tone="inverse" style={styles.sub}>
            {toast.sub}
          </Text>
        ) : null}
      </View>
      {toast.actionLabel ? (
        <Pressable
          onPress={() => {
            toast.action?.();
            dismissToast(toast.id);
          }}
          accessibilityRole="button"
          hitSlop={8}
          style={styles.action}
        >
          <Text variant="label" tone="inverse" style={styles.actionLabel}>
            {toast.actionLabel}
          </Text>
        </Pressable>
      ) : null}
      <Pressable
        onPress={() => dismissToast(toast.id)}
        accessibilityRole="button"
        accessibilityLabel="Dismiss"
        hitSlop={8}
        style={styles.action}
      >
        <Icon name="x" size={16} color={colors.ground} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: "absolute",
    left: spacing.l,
    right: spacing.l,
    gap: spacing.m,
    alignItems: "center",
  },
  toast: {
    width: "100%",
    maxWidth: 480,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.row,
    minHeight: spacing.touch + 4,
    paddingVertical: spacing.row,
    paddingLeft: spacing.l,
    paddingRight: spacing.s,
    borderRadius: radii.r2,
  },
  text: { flex: 1, gap: spacing.xxs },
  sub: { opacity: 0.72 },
  action: {
    minHeight: 36,
    minWidth: 36,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xs,
  },
  actionLabel: { textDecorationLine: "underline", fontWeight: "700" },
});
