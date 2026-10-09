import { Pressable, StyleSheet, View } from "react-native";
import { fmtTime } from "@/format/time";
import { useTheme } from "@/theme/ThemeProvider";
import { radii, spacing } from "@/theme/tokens";
import { Icon, Text } from "@/ui";
import type { NotificationView } from "../words";

type NotificationItemProps = {
  view: NotificationView;
  createdAt: string;
  unread: boolean;
  onPress: () => void;
  divider?: boolean;
};

/** One notification: its icon, words and time; unread ones in the accent tint with a red dot. */
export function NotificationItem({
  view,
  createdAt,
  unread,
  onPress,
  divider,
}: NotificationItemProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${unread ? "Unread. " : ""}${view.text}${view.sub ? `. ${view.sub}` : ""}`}
      style={({ pressed }) => [
        styles.row,
        unread && { backgroundColor: colors.accentSoft },
        divider && { borderBottomWidth: 1, borderBottomColor: colors.line },
        pressed && { backgroundColor: colors.surface3 },
      ]}
    >
      <View style={[styles.icon, { backgroundColor: unread ? colors.surface : colors.surface3 }]}>
        <Icon name={view.icon} size={18} color={unread ? colors.accentInk : colors.ink2} />
      </View>
      <View style={styles.text}>
        <Text variant={unread ? "bodyStrong" : "body"}>{view.text}</Text>
        {view.sub ? (
          <Text variant="small" tone="muted" numberOfLines={2}>
            {view.sub}
          </Text>
        ) : null}
        <Text variant="small" tone="muted">
          {fmtTime(createdAt)}
        </Text>
      </View>
      {unread ? <View style={[styles.dot, { backgroundColor: colors.now }]} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: spacing.row,
    paddingVertical: spacing.m + 2,
    paddingHorizontal: spacing.l,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: radii.r2,
    alignItems: "center",
    justifyContent: "center",
  },
  text: { flex: 1, gap: spacing.xxs },
  dot: { width: 9, height: 9, borderRadius: radii.pill, marginTop: spacing.s },
});
