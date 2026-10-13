import type { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { radii, spacing } from "@/theme/tokens";
import { Text } from "@/ui";

type BubbleProps = {
  from: "you" | "proton" | "error";
  text: string;
  children?: ReactNode;
  /** Pressing and holding the message; the screen readers get the same through a custom action. */
  onLongPress?: () => void;
  /** What holding does, read out as the custom action's name. */
  longPressLabel?: string;
};

const HOLD_ACTION = "hold";

/** One message of the chat: the person's on the right, Proton's on the left. */
export function Bubble({ from, text, children, onLongPress, longPressLabel }: BubbleProps) {
  const { colors } = useTheme();
  const mine = from === "you";
  const look = [
    styles.bubble,
    { backgroundColor: mine ? colors.accentSoft : colors.surface2, borderColor: colors.line },
  ];
  const body = (
    <>
      <Text tone={from === "error" ? "danger" : "default"}>{text}</Text>
      {children}
    </>
  );

  return (
    <View style={[styles.wrap, mine ? styles.right : styles.left]}>
      {onLongPress ? (
        <Pressable
          onLongPress={onLongPress}
          accessibilityActions={[{ name: HOLD_ACTION, label: longPressLabel }]}
          onAccessibilityAction={(e) => {
            if (e.nativeEvent.actionName === HOLD_ACTION) onLongPress();
          }}
          accessibilityHint={longPressLabel ? `Press and hold to ${longPressLabel}` : undefined}
          style={look}
        >
          {body}
        </Pressable>
      ) : (
        <View style={look}>{body}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: "row" },
  right: { justifyContent: "flex-end" },
  left: { justifyContent: "flex-start" },
  bubble: {
    maxWidth: "88%",
    gap: spacing.s,
    padding: spacing.row,
    borderWidth: 1,
    borderRadius: radii.r3,
  },
});
