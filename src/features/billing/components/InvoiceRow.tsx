import { Pressable, StyleSheet, View } from "react-native";
import type { InvoiceSummary } from "@/api/types";
import { fmtDate } from "@/format/time";
import { useTheme } from "@/theme/ThemeProvider";
import { spacing } from "@/theme/tokens";
import { Money, Text } from "@/ui";
import { INVOICE_STATE, invoiceStateOf } from "../model";
import { InvoiceStatusBadge } from "./MoneyBits";

type InvoiceRowProps = {
  invoice: InvoiceSummary;
  onPress: () => void;
  divider?: boolean;
};

/** An invoice in a list: number, client and project, status, total and what is left to pay. */
export function InvoiceRow({ invoice, onPress, divider }: InvoiceRowProps) {
  const { colors } = useTheme();
  const state = invoiceStateOf(invoice);
  const when = invoice.dueOn
    ? `due ${fmtDate(invoice.dueOn)}`
    : invoice.sendOn
      ? `goes out ${fmtDate(invoice.sendOn)}`
      : `drafted ${fmtDate(invoice.createdAt)}`;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${invoice.number ?? "Draft invoice"}, ${invoice.client.displayName}, ${INVOICE_STATE[state].label}`}
      style={({ pressed }) => [
        styles.row,
        divider && { borderBottomWidth: 1, borderBottomColor: colors.line },
        pressed && { backgroundColor: colors.surface3 },
      ]}
    >
      <View style={styles.main}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {invoice.number ?? "Draft"}
        </Text>
        <Text variant="small" tone="muted" numberOfLines={1}>
          {invoice.client.displayName} · {invoice.project.title}
        </Text>
        <InvoiceStatusBadge status={invoice.status} isOverdue={invoice.isOverdue} />
      </View>
      <View style={styles.amounts}>
        <Money amount={invoice.total} currency={invoice.currency} />
        {invoice.balance != null && state !== "paid" && state !== "void" && state !== "draft" ? (
          <View style={styles.left}>
            <Money amount={invoice.balance} currency={invoice.currency} />
            <Text variant="small" tone={state === "overdue" ? "danger" : "muted"}>
              left
            </Text>
          </View>
        ) : null}
        <Text variant="small" tone="muted">
          {when}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: spacing.m,
    paddingVertical: spacing.row,
    paddingHorizontal: spacing.l,
    minHeight: 64,
  },
  main: { flex: 1, minWidth: 0, gap: spacing.xs },
  amounts: { alignItems: "flex-end", gap: spacing.xxs },
  left: { flexDirection: "row", alignItems: "baseline", gap: spacing.xs },
});
