import { Pressable, StyleSheet, View } from "react-native";
import type { Conversation } from "@/api/types";
import { fmtTime, relDay, dayKey, companyToday } from "@/format/time";
import { useTheme } from "@/theme/ThemeProvider";
import { radii, spacing } from "@/theme/tokens";
import { Avatar, Icon, Text, type AvatarPhoto } from "@/ui";
import { snippet } from "../model";

type ConversationRowProps = {
  conversation: Conversation;
  photo: AvatarPhoto | null;
  online?: boolean;
  onPress: () => void;
  divider?: boolean;
};

const when = (at: string) => (dayKey(at) === companyToday() ? fmtTime(at) : relDay(at));

/** One chat in the list: who or which team, the last message, when, and how many are unread. */
export function ConversationRow({
  conversation: c,
  photo,
  online,
  onPress,
  divider,
}: ConversationRowProps) {
  const { colors } = useTheme();
  const title = c.team?.name ?? c.person?.name ?? "Chat";
  const unread = c.unread > 0;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}${unread ? `, ${c.unread} unread` : ""}`}
      style={({ pressed }) => [
        styles.row,
        divider && { borderBottomWidth: 1, borderBottomColor: colors.line },
        pressed && { backgroundColor: colors.surface3 },
      ]}
    >
      {c.team ? (
        <View style={[styles.team, { backgroundColor: colors.accentSoft }]}>
          <Icon name="people" size={20} color={colors.accentInk} />
        </View>
      ) : (
        <Avatar name={title} photo={photo} size={40} presence={online ? "online" : undefined} />
      )}
      <View style={styles.text}>
        <View style={styles.line}>
          <Text variant={unread ? "bodyStrong" : "body"} numberOfLines={1} style={styles.title}>
            {title}
          </Text>
          {c.lastMessage ? (
            <Text variant="small" tone={unread ? "accent" : "muted"}>
              {when(c.lastMessage.createdAt)}
            </Text>
          ) : null}
        </View>
        <View style={styles.line}>
          <Text
            variant="small"
            tone={unread ? "secondary" : "muted"}
            numberOfLines={1}
            style={styles.title}
          >
            {c.lastMessage
              ? `${c.team ? `${c.lastMessage.sender.name.split(" ")[0]}: ` : ""}${snippet(c.lastMessage)}`
              : "No messages yet"}
          </Text>
          {c.unreadMention ? (
            <Text variant="badge" tone="danger">
              @
            </Text>
          ) : null}
          {unread ? (
            <View style={[styles.count, { backgroundColor: colors.now }]}>
              <Text variant="badge" tone="onAccent">
                {c.unread > 99 ? "99+" : c.unread}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.row,
    paddingVertical: spacing.m + 2,
    paddingHorizontal: spacing.l,
    minHeight: 64,
  },
  team: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  text: { flex: 1, minWidth: 0, gap: spacing.xxs },
  line: { flexDirection: "row", alignItems: "center", gap: spacing.s },
  title: { flex: 1 },
  count: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
  },
});
