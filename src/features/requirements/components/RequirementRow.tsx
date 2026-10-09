import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type LayoutChangeEvent,
} from "react-native";
import type { Requirement } from "@/api/types";
import { fmtDate } from "@/format/time";
import { useTheme } from "@/theme/ThemeProvider";
import { radii, spacing } from "@/theme/tokens";
import { Badge, Icon, Text } from "@/ui";

type RequirementRowProps = {
  requirement: Requirement;
  /** The person may tick it done or open again. */
  canTick: boolean;
  ticking: boolean;
  onToggle: () => void;
  /** Opened from a push or a link about this one. */
  highlighted?: boolean;
  /** The admin's menu (Phase 3) and "Add to calendar" (Phase 5). */
  actions?: ReactNode;
  divider?: boolean;
  onLayout?: (event: LayoutChangeEvent) => void;
};

/** One requirement: its tick box, text, who it is assigned to, its deadline and who completed it. */
export function RequirementRow({
  requirement: r,
  canTick,
  ticking,
  onToggle,
  highlighted,
  actions,
  divider,
  onLayout,
}: RequirementRowProps) {
  const { colors } = useTheme();
  const box = (
    <View
      style={[
        styles.box,
        { borderColor: r.isDone ? colors.accent : colors.line2 },
        r.isDone && { backgroundColor: colors.accent },
      ]}
    >
      {ticking ? (
        <ActivityIndicator size="small" color={r.isDone ? colors.onAccent : colors.accent} />
      ) : r.isDone ? (
        <Icon name="check" size={16} color={colors.onAccent} />
      ) : null}
    </View>
  );
  return (
    <View
      onLayout={onLayout}
      style={[
        styles.row,
        highlighted && { backgroundColor: colors.accentSoft },
        divider && { borderBottomWidth: 1, borderBottomColor: colors.line },
      ]}
    >
      {canTick ? (
        <Pressable
          onPress={onToggle}
          disabled={ticking}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: r.isDone, busy: ticking }}
          accessibilityLabel={r.text}
          hitSlop={8}
          style={styles.tick}
        >
          {box}
        </Pressable>
      ) : (
        <View style={styles.tick} accessibilityLabel={r.isDone ? "Done" : "Open"}>
          {box}
        </View>
      )}
      <View style={styles.text}>
        <Text tone={r.isDone ? "muted" : "default"} style={r.isDone && styles.done}>
          {r.text}
        </Text>
        {r.assignees.length > 0 ? (
          <Text variant="small" tone="muted" numberOfLines={1}>
            {r.assignees.map((a) => a.name).join(", ")}
          </Text>
        ) : null}
        <View style={styles.meta}>
          {r.isDone ? (
            <Text variant="small" tone="muted">
              Done{r.doneBy ? ` by ${r.doneBy.name}` : ""}
              {r.doneAt ? ` · ${fmtDate(r.doneAt)}` : ""}
            </Text>
          ) : r.deadline ? (
            <Badge
              label={`${r.isOverdue ? "Overdue · " : "Due "}${fmtDate(r.deadline)}`}
              tone={r.isOverdue ? "now" : "neutral"}
            />
          ) : null}
          {actions}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: spacing.row,
    paddingVertical: spacing.m + 2,
    paddingHorizontal: spacing.l,
  },
  tick: { width: 44, height: 44, alignItems: "center", justifyContent: "center", marginLeft: -10 },
  box: {
    width: 24,
    height: 24,
    borderRadius: radii.r1,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  text: { flex: 1, gap: spacing.xs, paddingTop: spacing.s },
  done: { textDecorationLine: "line-through" },
  meta: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: spacing.m },
});
