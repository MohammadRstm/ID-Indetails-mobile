import { StyleSheet, View } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { radii, spacing } from "@/theme/tokens";
import { Button, Sheet, Text, TextField } from "@/ui";

type PhraseSheetProps = {
  visible: boolean;
  /** The card's title, so the person sees what they are confirming. */
  title: string;
  /** What the card asks to be typed. */
  phrase: string;
  value: string;
  onChangeText: (text: string) => void;
  /** Why the API refused the phrase, if it did. */
  error?: string;
  /** The typed words match the phrase and Confirm isn't already on its way. */
  canConfirm: boolean;
  busy: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

/** Where a strong card's phrase is typed: shown in full above the keyboard, Confirm waiting until it matches. */
export function PhraseSheet({
  visible,
  title,
  phrase,
  value,
  onChangeText,
  error,
  canConfirm,
  busy,
  onConfirm,
  onClose,
}: PhraseSheetProps) {
  const { colors } = useTheme();
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Type to confirm"
      subtitle={title}
      footer={
        <>
          <Button label="Not now" onPress={onClose} disabled={busy} />
          <Button
            label="Confirm"
            variant="primary"
            onPress={onConfirm}
            disabled={!canConfirm}
            loading={busy}
          />
        </>
      }
    >
      <View style={styles.body}>
        <Text tone="secondary">Type this exactly to confirm the change:</Text>
        <View
          style={[styles.phrase, { backgroundColor: colors.surface2, borderColor: colors.line }]}
        >
          <Text variant="bodyStrong" selectable>
            {phrase}
          </Text>
        </View>
        <TextField
          value={value}
          onChangeText={onChangeText}
          error={error}
          accessibilityLabel="Type the phrase"
          autoFocus
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="off"
          returnKeyType="done"
          onSubmitEditing={() => {
            if (canConfirm) onConfirm();
          }}
        />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: spacing.m },
  phrase: {
    padding: spacing.row,
    borderWidth: 1,
    borderRadius: radii.r2,
  },
});
