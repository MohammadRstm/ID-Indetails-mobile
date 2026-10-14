import { StyleSheet, View } from "react-native";
import { spacing } from "@/theme/tokens";
import { Chip } from "@/ui";

type ProtonToolbarProps = {
  onChats: () => void;
  onMemories: () => void;
};

/** Under the header: the saved chats, and what Proton remembers. */
export function ProtonToolbar({ onChats, onMemories }: ProtonToolbarProps) {
  return (
    <View style={styles.row}>
      <Chip label="Chats" icon="list" onPress={onChats} />
      <Chip label="What I remember" icon="pin" onPress={onMemories} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: spacing.m,
    paddingHorizontal: spacing.l,
    paddingVertical: spacing.s,
  },
});
