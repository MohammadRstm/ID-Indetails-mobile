import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { spacing } from "@/theme/tokens";
import { Button } from "./Button";
import { Icon } from "./Icon";
import { Text } from "./Text";

type LoadErrorProps = {
  /** The API's safe message, or the app's words for a known code. */
  message: string;
  /** What couldn't be loaded, such as "this project". */
  what?: string;
  /** Shown under "Details", for reporting a problem. */
  traceId?: string | null;
  onRetry?: () => void;
};

/** The whole screen couldn't load: what failed, why, and a way to try again. */
export function LoadError({ message, what, traceId, onRetry }: LoadErrorProps) {
  const { colors } = useTheme();
  const [details, setDetails] = useState(false);

  return (
    <View style={styles.wrap} accessibilityRole="alert">
      <View style={[styles.mark, { backgroundColor: colors.nowSoft }]}>
        <Icon name="alert" size={26} color={colors.now} />
      </View>
      <Text variant="subheading" align="center">
        {what ? `Couldn't load ${what}` : "Something went wrong"}
      </Text>
      <Text variant="small" tone="secondary" align="center" style={styles.message}>
        {message}
      </Text>
      {onRetry && <Button label="Try again" icon="refresh" onPress={onRetry} />}
      {traceId ? (
        <Pressable
          onPress={() => setDetails((open) => !open)}
          accessibilityRole="button"
          hitSlop={12}
        >
          <Text variant="small" tone="muted" align="center">
            {details ? `Trace id: ${traceId}` : "Details"}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", gap: spacing.row + 2, padding: spacing.xxl },
  mark: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  message: { maxWidth: 320 },
});
