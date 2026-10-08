import { StyleSheet, View } from "react-native";
import { spacing } from "@/theme/tokens";
import { Badge, Button, Card, Text } from "@/ui";
import type { ProtonPendingAction } from "../api";
import type { ActionState } from "../chat";

type ActionCardProps = {
  action: ProtonPendingAction;
  state: ActionState;
  /** A newer proposal replaced this one: the API would refuse it, so the card says so instead. */
  replaced: boolean;
  /** The proposal ran out of time. */
  expired: boolean;
  /** Confirm or cancel is on its way. */
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/** A change Proton proposed, exactly as the API stored it. Nothing happens until the person presses Confirm. */
export function ActionCard({
  action,
  state,
  replaced,
  expired,
  busy,
  onConfirm,
  onCancel,
}: ActionCardProps) {
  const open = state.kind === "open" && !replaced && !expired;
  const outcome =
    state.kind === "done" || state.kind === "failed"
      ? state.message
      : state.kind === "cancelled"
        ? "Cancelled. Nothing was changed."
        : replaced
          ? "Replaced by a newer proposal."
          : "This proposal expired. Ask again if you still want it.";

  return (
    <Card accessibilityLabel={action.preview.title}>
      <View style={styles.body}>
        <View style={styles.head}>
          <Text variant="micro">Change for you to confirm</Text>
          <Badge
            label={action.risk === "low" ? "Low risk" : "Medium risk"}
            tone={action.risk === "low" ? "ok" : "warn"}
          />
        </View>
        <Text variant="bodyStrong">{action.preview.title}</Text>
        {action.preview.changes.map((change) => (
          <Text key={change.label} variant="small">
            <Text variant="small" tone="muted">
              {change.label}:{" "}
            </Text>
            {change.before != null ? `${change.before} → ` : ""}
            {change.after}
          </Text>
        ))}
        {action.preview.note ? (
          <Text variant="small" tone="muted">
            {action.preview.note}
          </Text>
        ) : null}
        {action.preview.opensAfter && open ? (
          <Text variant="small" tone="muted">
            After you confirm, I&apos;ll open {action.preview.opensAfter}.
          </Text>
        ) : null}
        {open ? (
          <View style={styles.foot}>
            <Button label="Cancel" onPress={onCancel} disabled={busy} />
            <Button label="Confirm" variant="primary" onPress={onConfirm} loading={busy} />
          </View>
        ) : (
          <Text tone={state.kind === "failed" ? "danger" : "secondary"} accessibilityRole="alert">
            {outcome}
          </Text>
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  body: { gap: spacing.s },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  foot: { flexDirection: "row", justifyContent: "flex-end", gap: spacing.s },
});
