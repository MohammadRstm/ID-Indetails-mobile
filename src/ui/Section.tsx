import type { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { spacing } from "@/theme/tokens";
import { Text } from "./Text";

type SectionProps = {
  /** An uppercase micro label above the content. */
  title?: string;
  /** A small link on the right of the title, such as "See all". */
  action?: { label: string; onPress: () => void };
  children: ReactNode;
};

/** A group of content under a micro label, 14pt from the next group. */
export function Section({ title, action, children }: SectionProps) {
  return (
    <View style={styles.section}>
      {(title || action) && (
        <View style={styles.head}>
          {title ? (
            <Text variant="micro" accessibilityRole="header">
              {title}
            </Text>
          ) : (
            <View />
          )}
          {action && (
            <Pressable
              onPress={action.onPress}
              accessibilityRole="button"
              hitSlop={12}
              style={styles.action}
            >
              <Text variant="label" tone="accent">
                {action.label}
              </Text>
            </Pressable>
          )}
        </View>
      )}
      <View style={styles.body}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.m, marginBottom: spacing.l },
  head: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 24,
    paddingHorizontal: spacing.xxs,
  },
  action: { paddingVertical: spacing.xs },
  body: { gap: spacing.row },
});
