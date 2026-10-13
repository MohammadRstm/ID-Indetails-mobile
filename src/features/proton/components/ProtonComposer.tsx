import { ScrollView, StyleSheet, TextInput, View } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { radii, spacing } from "@/theme/tokens";
import { typography } from "@/theme/typography";
import { Chip, IconButton, Text } from "@/ui";

/** One button of the newest reply: a quick reply or a suggestion. */
export type ReplyChip = { key: string; label: string; onPress: () => void };

type ProtonComposerProps = {
  text: string;
  onTextChange: (text: string) => void;
  maxLength: number;
  /** The allowance is used up, so nothing more can be asked. */
  blocked: boolean;
  /** An answer is being written: Stop takes the place of Send. */
  answering: boolean;
  onSend: () => void;
  onStop: () => void;
  /** The newest reply's quick replies and suggestions, above the keyboard. */
  chips: ReplyChip[];
  usageLine: string;
};

/** Where a question is typed: Send, or Stop while Proton answers, with the reply buttons above it. */
export function ProtonComposer({
  text,
  onTextChange,
  maxLength,
  blocked,
  answering,
  onSend,
  onStop,
  chips,
  usageLine,
}: ProtonComposerProps) {
  const { colors } = useTheme();
  return (
    <View
      style={[styles.composer, { borderTopColor: colors.line, backgroundColor: colors.surface }]}
    >
      {chips.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.chips}
          accessibilityLabel="Replies"
        >
          {chips.map((chip) => (
            <Chip key={chip.key} label={chip.label} onPress={chip.onPress} />
          ))}
        </ScrollView>
      ) : null}
      <View style={styles.row}>
        <TextInput
          value={text}
          onChangeText={onTextChange}
          placeholder="Ask me anything about the company"
          placeholderTextColor={colors.ink3}
          accessibilityLabel="Ask Proton"
          multiline
          maxLength={maxLength}
          editable={!blocked}
          style={[
            typography.body,
            styles.input,
            { color: colors.ink, backgroundColor: colors.surface2, borderColor: colors.line },
          ]}
        />
        {answering ? (
          <IconButton icon="stop" tone="danger" onPress={onStop} accessibilityLabel="Stop" />
        ) : (
          <IconButton
            icon="send"
            onPress={onSend}
            disabled={!text.trim() || blocked}
            accessibilityLabel="Send"
          />
        )}
      </View>
      <Text variant="small" tone="muted">
        {usageLine}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  composer: { gap: spacing.xs, padding: spacing.m, borderTopWidth: 1 },
  chips: { gap: spacing.s },
  row: { flexDirection: "row", alignItems: "flex-end", gap: spacing.s },
  input: {
    flex: 1,
    maxHeight: 120,
    minHeight: spacing.touch,
    paddingHorizontal: spacing.row,
    paddingVertical: spacing.s,
    borderWidth: 1,
    borderRadius: radii.input,
  },
});
