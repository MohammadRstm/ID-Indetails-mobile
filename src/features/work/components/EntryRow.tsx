import { Pressable, StyleSheet, View } from "react-native";
import type { WorkEntry } from "@/api/types";
import { fmtDur, fmtRange } from "@/format/time";
import { useTheme } from "@/theme/ThemeProvider";
import { spacing } from "@/theme/tokens";
import { Badge, Icon, Text } from "@/ui";

type EntryRowProps = {
  entry: WorkEntry;
  onPress?: () => void;
  divider?: boolean;
};

/** One work entry in a list: project, what was done, when, how long, and its overtime. */
export function EntryRow({ entry, onPress, divider }: EntryRowProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="button"
      accessibilityLabel={`${entry.project.title}, ${fmtDur(entry.minutes)}, ${fmtRange(entry.startedAt, entry.endedAt)}`}
      style={({ pressed }) => [
        styles.row,
        divider && { borderBottomWidth: 1, borderBottomColor: colors.line },
        pressed && { backgroundColor: colors.surface3 },
      ]}
    >
      <View style={styles.text}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {entry.project.title}
        </Text>
        {entry.description ? (
          <Text variant="small" tone="secondary" numberOfLines={2}>
            {entry.description}
          </Text>
        ) : null}
        <View style={styles.meta}>
          <Text variant="mono" tone="muted" style={styles.small}>
            {fmtRange(entry.startedAt, entry.endedAt)}
          </Text>
          {entry.commentCount > 0 ? (
            <View style={styles.inline}>
              <Icon name="chat" size={14} color={colors.ink3} />
              <Text variant="small" tone="muted">
                {entry.commentCount}
              </Text>
            </View>
          ) : null}
          {entry.attachment ? <Icon name="attach" size={14} color={colors.ink3} /> : null}
        </View>
      </View>
      <View style={styles.figures}>
        <Text variant="mono">{fmtDur(entry.minutes)}</Text>
        {entry.overtimeMinutes > 0 ? (
          <Badge label={`${fmtDur(entry.overtimeMinutes)} OT`} tone="warn" />
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: spacing.row,
    paddingVertical: spacing.m + 2,
    paddingHorizontal: spacing.l,
    minHeight: 56,
  },
  text: { flex: 1, minWidth: 0, gap: spacing.xxs },
  meta: { flexDirection: "row", alignItems: "center", gap: spacing.m, marginTop: spacing.xxs },
  inline: { flexDirection: "row", alignItems: "center", gap: spacing.xxs },
  small: { fontSize: 12, lineHeight: 16 },
  figures: { alignItems: "flex-end", gap: spacing.xs },
});
