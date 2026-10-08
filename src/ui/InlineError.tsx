import { Pressable, StyleSheet, View } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { spacing } from "@/theme/tokens";
import { Icon } from "./Icon";
import { Text } from "./Text";

type InlineErrorProps = {
  /** The API's safe message (ApiError.message), or the app's words for a known code. */
  message: string;
  /** What couldn't be loaded, such as "the materials": "Couldn't load the materials." */
  what?: string;
  onRetry?: () => void;
};

/** A small note next to what failed, with "Try again" (the web's `.err` load error). */
export function InlineError({ message, what, onRetry }: InlineErrorProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.row} accessibilityRole="alert">
      <Icon name="alert" size={16} color={colors.now} />
      <Text variant="small" tone="danger" style={styles.text}>
        {what ? `Couldn't load ${what}. ` : ""}
        {message}
      </Text>
      {onRetry && (
        <Pressable onPress={onRetry} accessibilityRole="button" hitSlop={12} style={styles.retry}>
          <Text variant="label" tone="accent">
            Try again
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.s,
    paddingVertical: spacing.m,
  },
  text: { flex: 1 },
  retry: { paddingHorizontal: spacing.xs },
});
