import type { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { radii, spacing } from "@/theme/tokens";
import { Card, Icon, Text, type IconName } from "@/ui";
import type { MoneyLine } from "../model";

type MoneyLineListProps = {
  lines: (MoneyLine & { opens: boolean })[];
  /** Opens the line's invoice, statement or project; lines that open nothing for this person aren't pressable. */
  onOpen: (line: MoneyLine) => void;
};

/** Money follow-ups and money notifications, one row each, the urgent ones marked. */
export function MoneyLineList({ lines, onOpen }: MoneyLineListProps) {
  const { colors } = useTheme();
  return (
    <Card padded={false}>
      {lines.map((line, i) => {
        const opens = line.opens;
        return (
          <Pressable
            key={line.key}
            disabled={!opens}
            onPress={() => onOpen(line)}
            accessibilityRole={opens ? "button" : undefined}
            accessibilityLabel={line.sub ? `${line.title}, ${line.sub}` : line.title}
            style={({ pressed }) => [
              styles.row,
              i < lines.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.line },
              pressed && { backgroundColor: colors.surface3 },
            ]}
          >
            <View
              style={[
                styles.mark,
                { backgroundColor: line.urgent ? colors.nowSoft : colors.surface3 },
              ]}
            >
              <Icon name={line.icon} size={17} color={line.urgent ? colors.now : colors.ink2} />
            </View>
            <View style={styles.text}>
              <Text variant={line.urgent ? "bodyStrong" : "body"}>{line.title}</Text>
              {line.sub ? (
                <Text variant="small" tone="muted">
                  {line.sub}
                </Text>
              ) : null}
            </View>
            {opens && <Icon name="chevronRight" size={18} color={colors.ink3} />}
          </Pressable>
        );
      })}
    </Card>
  );
}

type CountTileProps = {
  label: string;
  count: number | null;
  icon: IconName;
  /** Red when there is something to deal with. */
  alarming?: boolean;
  onPress?: () => void;
};

/** A count to act on, such as overdue invoices; a dash while it loads or can't be read. */
export function CountTile({ label, count, icon, alarming, onPress }: CountTileProps) {
  const { colors } = useTheme();
  const hot = alarming && (count ?? 0) > 0;
  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={`${label}: ${count ?? "not known"}`}
      style={({ pressed }) => [
        styles.tile,
        {
          backgroundColor: pressed ? colors.surface3 : colors.surface,
          borderColor: hot ? colors.now : colors.line,
        },
      ]}
    >
      <Icon name={icon} size={18} color={hot ? colors.now : colors.ink3} />
      <Text variant="figure" style={{ color: hot ? colors.now : colors.ink }}>
        {count ?? "–"}
      </Text>
      <Text variant="small" tone="secondary" numberOfLines={2}>
        {label}
      </Text>
    </Pressable>
  );
}

export function TileGrid({ children }: { children: ReactNode }) {
  return <View style={styles.tiles}>{children}</View>;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.row,
    paddingVertical: spacing.row,
    paddingHorizontal: spacing.l,
    minHeight: 56,
  },
  mark: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  text: { flex: 1, gap: spacing.xxs },
  tiles: { flexDirection: "row", flexWrap: "wrap", gap: spacing.m },
  tile: {
    flexGrow: 1,
    flexBasis: "45%",
    minHeight: 96,
    padding: spacing.l,
    gap: spacing.xs,
    borderWidth: 1,
    borderRadius: radii.r2,
  },
});
