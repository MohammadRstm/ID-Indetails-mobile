import { StyleSheet, View } from "react-native";
import type { Invoice } from "@/api/types";
import { fmtDateY } from "@/format/time";
import { useTheme } from "@/theme/ThemeProvider";
import { spacing } from "@/theme/tokens";
import { Button, Card, Money, Section, Text } from "@/ui";
import { DeliveryList } from "./DeliveryList";
import { Figure, FigureGrid, InvoiceStatusBadge } from "./MoneyBits";

type InvoiceViewProps = {
  invoice: Invoice;
  /** Each action is left out when the person may not take it, or the invoice can't take it. */
  onEmail?: () => void;
  onShare?: () => void;
  sharing?: boolean;
  onIssue?: () => void;
  onRecordPayment?: () => void;
  onOpenProject?: () => void;
};

/** One invoice as the phone shows it: status, amounts, dates, lines, deliveries and what can be done next. */
export function InvoiceView({
  invoice,
  onEmail,
  onShare,
  sharing,
  onIssue,
  onRecordPayment,
  onOpenProject,
}: InvoiceViewProps) {
  const { colors } = useTheme();
  const currency = invoice.currency;
  const hasActions = onEmail || onShare || onIssue || onRecordPayment;

  return (
    <>
      <Section>
        <Card>
          <View style={styles.head}>
            <View style={styles.headText}>
              <Text variant="heading">{invoice.number ?? "Draft invoice"}</Text>
              <Text variant="small" tone="muted">
                {invoice.billToName ?? invoice.client.displayName} · {invoice.project.title}
              </Text>
            </View>
            <InvoiceStatusBadge status={invoice.status} isOverdue={invoice.isOverdue} />
          </View>
          <FigureGrid>
            <Figure label="Total" amount={invoice.total} currency={currency} large />
            {invoice.balance != null && (
              <Figure label="Left to pay" amount={invoice.balance} currency={currency} />
            )}
            {invoice.paid != null && (
              <Figure label="Paid" amount={invoice.paid} currency={currency} />
            )}
          </FigureGrid>
          <View style={styles.dates}>
            {invoice.issuedAt ? (
              <Text variant="small" tone="secondary">
                Issued {fmtDateY(invoice.issuedAt)}
                {invoice.dueOn ? ` · due ${fmtDateY(invoice.dueOn)}` : ""}
              </Text>
            ) : (
              <Text variant="small" tone="secondary">
                {invoice.sendOn
                  ? `Scheduled to go out ${fmtDateY(invoice.sendOn)}${invoice.sendTo ? ` to ${invoice.sendTo}` : ""}`
                  : `Not issued yet · terms ${invoice.termsDays} days`}
              </Text>
            )}
            {invoice.voidedAt ? (
              <Text variant="small" tone="danger">
                Voided {fmtDateY(invoice.voidedAt)}
                {invoice.voidReason ? `: ${invoice.voidReason}` : ""}
              </Text>
            ) : null}
          </View>
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

      {hasActions && (
        <Section>
          {onRecordPayment && (
            <Button
              label="Record a payment"
              icon="card"
              variant="primary"
              fullWidth
              onPress={onRecordPayment}
            />
          )}
          {onIssue && <Button label="Issue this draft" icon="check" fullWidth onPress={onIssue} />}
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

      <Section title="Lines">
        <Card padded={false}>
          {invoice.lines.map((line, i) => (
            <View
              key={line.id}
              style={[
                styles.line,
                i < invoice.lines.length - 1 && {
                  borderBottomWidth: 1,
                  borderBottomColor: colors.line,
                },
              ]}
            >
              <Text style={styles.lineText}>{line.description}</Text>
              <Money amount={line.amount} currency={currency} exact cents />
            </View>
          ))}
        </Card>
      </Section>

      <Section title="Sent to the client">
        <DeliveryList deliveries={invoice.deliveries} />
      </Section>

      {invoice.notes ? (
        <Section title="Notes">
          <Text tone="secondary">{invoice.notes}</Text>
        </Section>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: "row", alignItems: "flex-start", gap: spacing.m },
  headText: { flex: 1, gap: spacing.xxs },
  dates: { gap: spacing.xxs },
  line: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.m,
    paddingVertical: spacing.row,
    paddingHorizontal: spacing.l,
  },
  lineText: { flex: 1 },
});
