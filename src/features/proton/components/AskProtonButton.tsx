import { Pressable, StyleSheet } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { radii, spacing } from "@/theme/tokens";
import { Text } from "@/ui";
import { ProtonBlob } from "../blob/ProtonBlob";

type AskProtonButtonProps = {
  onPress: () => void;
  /** Just the blob, for a header with other buttons in it. */
  compact?: boolean;
  /** Read out instead of "Ask Proton", when the button asks about something particular. */
  accessibilityLabel?: string;
};

/** A small blob with "Ask Proton" (or the blob alone): the way into Proton from a page. */
export function AskProtonButton({
  onPress,
  compact = false,
  accessibilityLabel = "Ask Proton",
}: AskProtonButtonProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        styles.button,
        compact ? styles.compact : [styles.labelled, { backgroundColor: colors.accentSoft }],
        pressed && { backgroundColor: colors.surface3 },
      ]}
    >
      <ProtonBlob mood="idle" size={compact ? 30 : 26} decorative />
      {compact ? null : (
        <Text variant="bodyStrong" style={{ color: colors.accentInk }}>
          Ask Proton
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: spacing.touch,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.s,
  },
  compact: { width: spacing.touch, borderRadius: radii.r1 },
  labelled: {
    paddingLeft: spacing.s,
    paddingRight: spacing.l,
    minHeight: spacing.touch - 8,
    borderRadius: radii.pill,
  },
});
