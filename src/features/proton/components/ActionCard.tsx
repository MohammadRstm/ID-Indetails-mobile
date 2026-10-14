import { StyleSheet, View } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { spacing } from "@/theme/tokens";
import { Badge, Button, Card, Text } from "@/ui";
import type { ProtonPendingAction } from "../api";
import { areaLabel, isStrong, pillOf, type CardOutcome } from "../cards";

type ActionCardProps = {
  action: ProtonPendingAction;
  /** Null while the card can still be confirmed; otherwise what became of it. */
  outcome: CardOutcome | null;
  /** A two-step card: Review was pressed, so Confirm shows (and waits a moment before it can be pressed). */
  reviewing: boolean;
  canConfirm: boolean;
  /** Confirm or cancel is on its way. */
  busy: boolean;
  onReview: () => void;
  /** A standard or two-step card's Confirm. */
  onConfirm: () => void;
  /** A typed card's Confirm: opens where the phrase is typed. */
  onOpenPhrase: () => void;
  onCancel: () => void;
};

/**
 * A change Proton proposed, exactly as the API stored it. Nothing happens until the person presses Confirm. A
 * strong card (two steps, or a typed phrase) says so: "Check carefully", a red stripe, where it reaches, and
 * whether it can be undone.
 */
export function ActionCard({
  action,
  outcome,
  reviewing,
  canConfirm,
  busy,
  onReview,
  onConfirm,
  onOpenPhrase,
  onCancel,
}: ActionCardProps) {
  const { colors } = useTheme();
  const { preview } = action;
  const strong = isStrong(preview);
  const pill = pillOf(action);
  const area = areaLabel(preview.area);

  return (
    <Card
      accessibilityLabel={preview.title}
      style={strong ? { borderLeftWidth: 3, borderLeftColor: colors.now } : undefined}
    >
      <View style={styles.body}>
        <View style={styles.head}>
          <Text variant="micro" style={styles.kicker}>
            Change for you to confirm{area ? ` · ${area}` : ""}
          </Text>
          <Badge label={pill.label} tone={pill.tone} />
        </View>
        <Text variant="bodyStrong">{preview.title}</Text>
        {preview.changes.map((change) => (
          <Text key={change.label} variant="small">
            <Text variant="small" tone="muted">
              {change.label}:{" "}
            </Text>
            {change.before != null ? (
              <Text variant="small" tone="muted" style={styles.before}>
                {change.before}
              </Text>
            ) : null}
            {change.before != null ? " → " : ""}
            {change.after}
          </Text>
        ))}
        {preview.reach ? <Text variant="small">{preview.reach}</Text> : null}
        {preview.irreversible ? (
          <Text variant="small" tone="danger">
            This can&apos;t be undone.
          </Text>
        ) : null}
        {preview.note ? (
          <Text variant="small" tone="muted">
            {preview.note}
          </Text>
        ) : null}
        {preview.opensAfter && !outcome ? (
          <Text variant="small" tone="muted">
            After you confirm, I&apos;ll open {preview.opensAfter}.
          </Text>
        ) : null}
        {outcome ? (
          <Text tone={outcome.failed ? "danger" : "secondary"} accessibilityRole="alert">
            {outcome.text}
          </Text>
        ) : (
          <View style={styles.foot}>
            <Button label="Cancel" onPress={onCancel} disabled={busy} />
            {preview.confirm === "typed" ? (
              <Button
                label="Type to confirm"
                variant="primary"
                onPress={onOpenPhrase}
                disabled={busy || !preview.phrase}
              />
            ) : preview.confirm === "two_step" && !reviewing ? (
              <Button label="Review" onPress={onReview} disabled={busy} />
            ) : (
              <Button
                label="Confirm"
                variant="primary"
                onPress={onConfirm}
                disabled={!canConfirm}
                loading={busy}
              />
            )}
          </View>
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  body: { gap: spacing.s },
  head: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.s,
  },
  kicker: { flex: 1 },
  before: { textDecorationLine: "line-through" },
  foot: { flexDirection: "row", justifyContent: "flex-end", gap: spacing.s },
});
