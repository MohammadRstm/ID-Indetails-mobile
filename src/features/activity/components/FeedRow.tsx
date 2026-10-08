import { Pressable, StyleSheet, View } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { radii, spacing } from "@/theme/tokens";
import { Icon, Text, type IconName } from "@/ui";

export type FeedRowItem = {
  key: string;
  icon: IconName;
  /** Who did it, in bold before the sentence; null for system events. */
  actor: string | null;
  text: string;
  /** Logged work's description. */
  quote?: string | null;
  /** When, and anything else, already formatted. */
  meta: string;
};

type FeedRowProps = {
  item: FeedRowItem;
  /** Opens what it is about (a project or a client); missing when there's nothing to open. */
  onPress?: () => void;
  divider?: boolean;
};

/** One line of the activity feed (the web's FeedItem): an icon, who did what, and when. */
export function FeedRow({ item, onPress, divider }: FeedRowProps) {
  const { colors } = useTheme();
  const sentence = item.actor ? `${item.actor} ${item.text}` : item.text;
  const content = (
    <>
      <View style={[styles.icon, { backgroundColor: colors.surface3 }]}>
        <Icon name={item.icon} size={16} color={colors.ink2} />
      </View>
      <View style={styles.text}>
        <Text>
          {item.actor ? <Text variant="bodyStrong">{item.actor} </Text> : null}
          {item.text}
        </Text>
        {item.quote ? (
          <Text variant="small" tone="secondary" numberOfLines={2}>
            {item.quote}
          </Text>
        ) : null}
        <Text variant="small" tone="muted">
          {item.meta}
        </Text>
      </View>
      {onPress ? <Icon name="chevronRight" size={16} color={colors.ink3} /> : null}
    </>
  );
  const look = [styles.row, divider && { borderBottomWidth: 1, borderBottomColor: colors.line }];

  if (!onPress) {
    return (
      <View style={look} accessible accessibilityLabel={`${sentence}, ${item.meta}`}>
        {content}
      </View>
    );
  }
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${sentence}, ${item.meta}`}
      style={({ pressed }) => [look, pressed && { backgroundColor: colors.surface3 }]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.row,
    minHeight: 52,
    paddingVertical: spacing.m,
    paddingHorizontal: spacing.l,
  },
  icon: {
    width: 30,
    height: 30,
    borderRadius: radii.r1,
    alignItems: "center",
    justifyContent: "center",
  },
  text: { flex: 1, minWidth: 0, gap: spacing.xxs },
});
