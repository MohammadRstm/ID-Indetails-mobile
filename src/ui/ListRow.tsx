import type { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { spacing } from "@/theme/tokens";
import { Icon } from "./Icon";
import { Text } from "./Text";

type ListRowProps = {
  title: string;
  subtitle?: string;
  /** An avatar, icon or tile on the left. */
  leading?: ReactNode;
  /** A badge, figure or switch on the right. */
  trailing?: ReactNode;
  onPress?: () => void;
  /** A chevron on the right, for rows that open another screen. */
  chevron?: boolean;
  /** The web's selected look: accent tint behind accent text. */
  selected?: boolean;
  /** A hairline under the row, for rows inside a card. */
  divider?: boolean;
  accessibilityLabel?: string;
};

/** One row of a list: at least 52pt tall, the whole row pressable. */
export function ListRow({
  title,
  subtitle,
  leading,
  trailing,
  onPress,
  chevron,
  selected,
  divider,
  accessibilityLabel,
}: ListRowProps) {
  const { colors } = useTheme();
  const content = (
    <>
      {leading}
      <View style={styles.text}>
        <Text
          variant={selected ? "bodyStrong" : "body"}
          tone={selected ? "accent" : "default"}
          numberOfLines={1}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text variant="small" tone="muted" numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing}
      {chevron && <Icon name="chevronRight" size={18} color={colors.ink3} />}
    </>
  );
  const look = [
    styles.row,
    selected && { backgroundColor: colors.accentSoft },
    divider && { borderBottomWidth: 1, borderBottomColor: colors.line },
  ];

  if (!onPress) return <View style={look}>{content}</View>;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? (subtitle ? `${title}, ${subtitle}` : title)}
      accessibilityState={{ selected: !!selected }}
      style={({ pressed }) => [look, pressed && !selected && { backgroundColor: colors.surface3 }]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.row,
    minHeight: 52,
    paddingVertical: spacing.m,
    paddingHorizontal: spacing.l,
  },
  text: { flex: 1, minWidth: 0, gap: spacing.xxs },
});
