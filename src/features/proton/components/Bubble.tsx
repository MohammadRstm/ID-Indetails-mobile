import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { radii, spacing } from "@/theme/tokens";
import { Text } from "@/ui";

type BubbleProps = { from: "you" | "proton" | "error"; text: string; children?: ReactNode };

/** One message of the chat: the person's on the right, Proton's on the left. */
export function Bubble({ from, text, children }: BubbleProps) {
  const { colors } = useTheme();
  const mine = from === "you";
  return (
    <View style={[styles.wrap, mine ? styles.right : styles.left]}>
      <View
        style={[
          styles.bubble,
          { backgroundColor: mine ? colors.accentSoft : colors.surface2, borderColor: colors.line },
        ]}
      >
        <Text tone={from === "error" ? "danger" : "default"}>{text}</Text>
        {children}
      </View>
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
