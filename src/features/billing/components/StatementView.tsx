import { StyleSheet, View } from "react-native";
import type { Statement } from "@/api/types";
import { fmtDateY } from "@/format/time";
import { useTheme } from "@/theme/ThemeProvider";
import { spacing } from "@/theme/tokens";
import { Badge, Button, Card, Money, Section, Text } from "@/ui";
import { DeliveryList } from "./DeliveryList";
import { Figure, FigureGrid } from "./MoneyBits";

type StatementViewProps = {
  statement: Statement;
  onEmail?: () => void;
  onShare?: () => void;
  sharing?: boolean;
  onOpenProject?: () => void;
};

/** A client statement as it was made: a snapshot that never changes. Building one stays on the web. */
export function StatementView({
  statement: s,
  onEmail,
  onShare,
  sharing,
  onOpenProject,
}: StatementViewProps) {
  const { colors } = useTheme();
  const currency = s.currency;

  return (
    <>
      <Section>
        <Card>
          <View style={styles.head}>
            <View style={styles.headText}>
              <Text variant="heading">{s.number}</Text>
              <Text variant="small" tone="muted">
                {s.client.displayName} · {s.projectTitle}
              </Text>
            </View>
            <Badge
              label={s.deliveries.length > 0 ? "Sent" : "Not sent"}
              tone={s.deliveries.length > 0 ? "accent" : "neutral"}
            />
          </View>
          <Text variant="small" tone="secondary">
            {fmtDateY(s.date)}
            {s.since ? ` · materials since ${fmtDateY(s.since)}` : ""}
            {` · ${s.count} material${s.count === 1 ? "" : "s"}`}
          </Text>
          <FigureGrid>
            <Figure label="Total" amount={s.total} currency={currency} large />
            {s.includesEarlier && <Figure label="New" amount={s.newTotal} currency={currency} />}
            {s.includesEarlier && (
              <Figure label="Earlier" amount={s.earlierTotal} currency={currency} />
            )}
          </FigureGrid>
          {onOpenProject && (
            <Button
              label="Open the project"
              icon="projects"
              variant="quiet"
              onPress={onOpenProject}
            />
          )}
        </Card>
      </Section>

      {(onEmail || onShare) && (
        <Section>
          {onEmail && <Button label="Send by email" icon="mail" fullWidth onPress={onEmail} />}
          {onShare && (
            <Button
              label="Share the PDF"
              icon="download"
              fullWidth
              onPress={onShare}
              loading={sharing}
            />
          )}
        </Section>
      )}

      {s.mode === "detail" && s.types.length > 0 && (
        <Section title="Materials">
          <Card padded={false}>
            {s.types.map((type, i) => (
              <View
                key={type.key}
                style={[
                  styles.row,
                  (i < s.types.length - 1 || s.hiddenTypes) && {
                    borderBottomWidth: 1,
                    borderBottomColor: colors.line,
                  },
                ]}
              >
                <View style={styles.rowText}>
                  <Text>{type.label}</Text>
                  {type.quantity ? (
                    <Text variant="small" tone="muted">
                      {type.quantity}
                    </Text>
                  ) : null}
                </View>
                <Money amount={type.total} currency={currency} exact />
              </View>
            ))}
            {s.hiddenTypes ? (
              <View style={styles.row}>
                <Text style={styles.rowText} tone="secondary">
                  {s.hiddenTypes.count} more type{s.hiddenTypes.count === 1 ? "" : "s"}, from
                  earlier statements
                </Text>
                <Money amount={s.hiddenTypes.total} currency={currency} exact />
              </View>
            ) : null}
          </Card>
        </Section>
      )}

      <Section title="Payment">
        <Card>
          <FigureGrid>
            <Figure label="Agreed" amount={s.agreed} currency={currency} />
            <Figure label="Received" amount={s.received} currency={currency} />
            {s.paidAhead > 0 ? (
              <Figure label="Paid ahead" amount={s.paidAhead} currency={currency} />
            ) : (
              <Figure label="Remaining" amount={s.remaining} currency={currency} />
            )}
          </FigureGrid>
          <Text variant="small" tone="muted">
            As of the day it was made. A statement is not an invoice.
          </Text>
        </Card>
      </Section>

      <Section title="Sent to the client">
        <DeliveryList
          deliveries={s.deliveries.map((d) => ({ ...d, by: d.sentBy?.name ?? null }))}
        />
      </Section>
    </>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: "row", alignItems: "flex-start", gap: spacing.m },
  headText: { flex: 1, gap: spacing.xxs },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.m,
    paddingVertical: spacing.row,
    paddingHorizontal: spacing.l,
  },
  rowText: { flex: 1, gap: spacing.xxs },
});
