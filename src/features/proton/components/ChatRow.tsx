import { Pressable, StyleSheet, View } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { spacing } from "@/theme/tokens";
import { IconButton, Text } from "@/ui";

type ChatRowProps = {
  title: string;
  subtitle: string;
  /** The chat that is open now. */
  current: boolean;
  onPress: () => void;
  onRename: () => void;
  onDelete: () => void;
};

const RENAME_ACTION = "rename";

/** One saved chat in the list: press to open it, hold (or the pencil) to rename it, the bin deletes it. */
export function ChatRow({ title, subtitle, current, onPress, onRename, onDelete }: ChatRowProps) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.row,
        { borderBottomColor: colors.line },
        current && { backgroundColor: colors.accentSoft },
      ]}
    >
      <Pressable
        onPress={onPress}
        onLongPress={onRename}
        accessibilityRole="button"
        accessibilityLabel={`${title}, ${subtitle}`}
        accessibilityHint="Opens this chat. Press and hold to rename it."
        accessibilityState={{ selected: current }}
        accessibilityActions={[{ name: RENAME_ACTION, label: "Rename" }]}
        onAccessibilityAction={(e) => {
          if (e.nativeEvent.actionName === RENAME_ACTION) onRename();
        }}
        style={styles.main}
      >
        <Text variant={current ? "bodyStrong" : "body"} numberOfLines={1}>
          {title}
        </Text>
        <Text variant="small" tone="muted" numberOfLines={1}>
          {subtitle}
        </Text>
      </Pressable>
      <IconButton icon="edit" onPress={onRename} accessibilityLabel={`Rename ${title}`} />
      <IconButton
        icon="trash"
        tone="danger"
        onPress={onDelete}
        accessibilityLabel={`Delete ${title}`}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", borderBottomWidth: 1 },
  main: { flex: 1, minWidth: 0, minHeight: 52, justifyContent: "center", gap: spacing.xxs },
});
