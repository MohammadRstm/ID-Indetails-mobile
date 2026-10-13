import { StyleSheet, View } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { radii, spacing } from "@/theme/tokens";
import { Icon, Text } from "@/ui";

type FilledNoteProps = {
  /** What Proton filled in, by name ("project", "start"). */
  fields: string[];
  /** What the person does once they have checked it. */
  then?: "save" | "send";
};

/** What Proton filled in a form or a message: the person checks it and saves or sends it themselves. */
export function FilledNote({ fields, then = "save" }: FilledNoteProps) {
  const { colors } = useTheme();
  if (fields.length === 0) return null;
  const them = fields.length === 1 ? "it" : "them";
  return (
    <View
      accessibilityLiveRegion="polite"
      style={[styles.note, { backgroundColor: colors.accentSoft }]}
    >
      <Icon name="compass" size={16} color={colors.accentInk} />
      <Text variant="small" tone="accent" style={styles.text}>
        {`Filled by Proton: ${fields.join(", ")}. Check ${them}, then ${then}.`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  note: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.s,
    padding: spacing.row,
    borderRadius: radii.r2,
  },
  text: { flex: 1 },
});
