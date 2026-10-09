import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { money } from "@/format/money";
import { spacing } from "@/theme/tokens";
import { Badge, Money, Text, type BadgeTone } from "@/ui";
import { INVOICE_STATE, invoiceStateOf, type InvoiceStatus } from "../model";

type FigureProps = {
  label: string;
  /** From the API; formatted only. */
  amount: number;
  currency?: string;
  /** Profit and the like: green when up, red when down. */
  signed?: boolean;
  large?: boolean;
  sub?: string;
};

/** One labelled money figure (the web's KPI): a micro label over the amount. */
export function Figure({ label, amount, currency, signed, large, sub }: FigureProps) {
  return (
    <View
      style={styles.figure}
      accessible
      accessibilityLabel={`${label}: ${money.exact(amount, currency)}`}
    >
      <Text variant="micro">{label}</Text>
      <Money
        amount={amount}
        currency={currency}
        signed={signed}
        size={large ? "large" : "regular"}
      />
      {sub ? (
        <Text variant="small" tone="muted" numberOfLines={1}>
          {sub}
        </Text>
      ) : null}
    </View>
  );
}

/** Figures side by side, wrapping two to a row on a narrow phone. */
export function FigureGrid({ children }: { children: ReactNode }) {
  return <View style={styles.grid}>{children}</View>;
}

type MarginPillProps = {
  /** Profit ÷ revenue from the API; null while it is too early to tell. */
  margin: number | null;
  internal?: boolean;
};

/** A project's margin, coloured by band as on the web (UI.MarginPill). */
export function MarginPill({ margin, internal }: MarginPillProps) {
  if (internal) return <Badge label="Internal" />;
  if (margin == null) return <Badge label="Too early" />;
  const tone: BadgeTone =
    margin < 0 ? "now" : margin < 0.15 ? "warn" : margin < 0.4 ? "accent" : "ok";
  return <Badge label={`${money.pct(margin)} margin`} tone={tone} />;
}

export function InvoiceStatusBadge({
  status,
  isOverdue,
}: {
  status: InvoiceStatus;
  isOverdue: boolean | null;
}) {
  const state = INVOICE_STATE[invoiceStateOf({ status, isOverdue })];
  return <Badge label={state.label} tone={state.tone} icon={state.icon} />;
}

const styles = StyleSheet.create({
  figure: { gap: spacing.xxs, minWidth: "45%", flexGrow: 1, flexBasis: "45%" },
  grid: { flexDirection: "row", flexWrap: "wrap", rowGap: spacing.l, columnGap: spacing.l },
});
