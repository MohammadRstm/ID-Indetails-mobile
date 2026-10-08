import { StyleSheet, View } from "react-native";
import { money } from "@/format/money";
import { spacing } from "@/theme/tokens";
import { Card, Text } from "@/ui";
import { Figure, FigureGrid, MarginPill } from "../../billing/components/MoneyBits";
import type { DomainOverview } from "../model";

type DomainCardProps = {
  label: string;
  domain: DomainOverview;
  /** The fuller view of the Company screen: invoicing, collections and counts too. */
  detailed?: boolean;
};

/** One domain's money over the period, as the API works it out. */
export function DomainCard({ label, domain: d, detailed }: DomainCardProps) {
  const unconverted = [...d.unconvertedCosts, ...d.unconvertedInvoices];
  return (
    <Card>
      <View style={styles.head}>
        <Text variant="subheading" style={styles.title}>
          {label}
        </Text>
        {d.margin != null && <MarginPill margin={d.margin} />}
      </View>
      <FigureGrid>
        <Figure label="Revenue" amount={d.revenue} />
        <Figure label="Costs" amount={d.cost} />
        <Figure label="Profit" amount={d.profit} signed />
        <Figure label="Outstanding" amount={d.outstanding} />
        {detailed && <Figure label="Invoiced" amount={d.invoiced} />}
        {detailed && <Figure label="Collected" amount={d.collected} />}
      </FigureGrid>
      {detailed && (
        <Text variant="small" tone="muted">
          {d.activeProjects} active projects · {d.projectsWithActivity} with activity ·{" "}
          {d.clientsServed} of {d.allClients} clients served
          {d.tracksHours ? ` · ${d.loggers} of ${d.people} people logged work` : ""}
        </Text>
      )}
      {unconverted.length > 0 && (
        <Text variant="small" tone="warn">
          Left out for want of an exchange rate:{" "}
          {unconverted.map((u) => money.exact(u.amount, u.currency)).join(", ")}
        </Text>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: "row", alignItems: "center", gap: spacing.m },
  title: { flex: 1 },
});
