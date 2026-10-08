import { StyleSheet, View } from "react-native";
import { fmtDate, relTime } from "@/format/time";
import type { OutboxRecord } from "@/offline/model";
import { attentionText, statusLabel } from "@/offline/model";
import { spacing } from "@/theme/tokens";
import { Badge, Button, Text, type BadgeTone } from "@/ui";

const TONE: Record<OutboxRecord["status"], BadgeTone> = {
  pending: "neutral",
  sending: "accent",
  sent: "ok",
  needs_attention: "now",
};

/** What a record is, in a line: "3 materials: Cement, Sand" or "Labour week of Oct 5". */
export function recordTitle(record: OutboxRecord): string {
  if (record.kind === "labour_week") return `Labour week of ${fmtDate(record.weekStart)}`;
  const names = record.payload.items.map((item) => item.name);
  const count = names.length;
  return `${count} material${count === 1 ? "" : "s"}: ${names.slice(0, 3).join(", ")}${count > 3 ? "…" : ""}`;
}

export type RecordAction = { label: string; onPress: () => void; danger?: boolean };

type PendingRecordRowProps = {
  record: OutboxRecord;
  /** The site's name, when the list holds several sites. */
  showSite?: boolean;
  actions?: RecordAction[];
};

/** A record saved on the phone, with its state and, when it needs attention, why and what can be done. */
export function PendingRecordRow({ record, showSite, actions = [] }: PendingRecordRowProps) {
  return (
    <View style={styles.row}>
      <View style={styles.head}>
        <View style={styles.text}>
          <Text variant="bodyStrong" numberOfLines={2}>
            {recordTitle(record)}
          </Text>
          <Text variant="small" tone="muted">
            {showSite ? `${record.payload.projectTitle} · ` : ""}saved {relTime(record.createdAt)}
          </Text>
        </View>
        <Badge label={statusLabel(record)} tone={TONE[record.status]} />
      </View>
      {record.status === "needs_attention" ? (
        <Text variant="small" tone="danger">
          {attentionText(record)}
        </Text>
      ) : null}
      {actions.length > 0 ? (
        <View style={styles.actions}>
          {actions.map((action) => (
            <Button
              key={action.label}
              label={action.label}
              variant={action.danger ? "danger" : "secondary"}
              onPress={action.onPress}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { gap: spacing.m, padding: spacing.l },
  head: { flexDirection: "row", alignItems: "flex-start", gap: spacing.m },
  text: { flex: 1, gap: spacing.xxs },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.m },
});
