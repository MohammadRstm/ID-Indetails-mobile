import { StyleSheet, View } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { spacing } from "@/theme/tokens";
import { Button, Text } from "@/ui";

export type MemoryRow = { id: number; text: string };

type MemoryListProps = {
  memories: MemoryRow[];
  /** The memory being forgotten now. */
  forgettingId: number | null;
  onForget: (id: number) => void;
};

/** What Proton remembers, in the person's own words, each with Forget. */
export function MemoryList({ memories, forgettingId, onForget }: MemoryListProps) {
  const { colors } = useTheme();
  if (memories.length === 0) {
    return (
      <Text tone="muted">
        Nothing yet. Press and hold a message you sent me, then choose &quot;Remember this&quot;.
      </Text>
    );
  }
  return (
    <View>
      {memories.map((memory) => (
        <View key={memory.id} style={[styles.row, { borderBottomColor: colors.line }]}>
          <Text style={styles.text}>{memory.text}</Text>
          <Button
            label="Forget"
            variant="danger"
            onPress={() => onForget(memory.id)}
            loading={forgettingId === memory.id}
            disabled={forgettingId != null}
            accessibilityLabel={`Forget ${memory.text}`}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.m,
    paddingVertical: spacing.m,
    borderBottomWidth: 1,
  },
  text: { flex: 1 },
});
