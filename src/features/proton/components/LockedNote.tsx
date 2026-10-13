import { StyleSheet, View } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { spacing } from "@/theme/tokens";
import { Button, Text } from "@/ui";

type LockedNoteProps = {
  /** Why the chat can only be read. */
  reason: string;
  onNewChat: () => void;
};

/** Where the composer would be, for a chat that can be read but not carried on. */
export function LockedNote({ reason, onNewChat }: LockedNoteProps) {
  const { colors } = useTheme();
  return (
    <View style={[styles.note, { borderTopColor: colors.line, backgroundColor: colors.surface }]}>
      <Text tone="secondary" accessibilityRole="alert">
        {reason}
      </Text>
      <Button label="New chat" variant="primary" icon="plus" onPress={onNewChat} />
    </View>
  );
}

const styles = StyleSheet.create({
  note: { gap: spacing.m, padding: spacing.l, borderTopWidth: 1 },
});
