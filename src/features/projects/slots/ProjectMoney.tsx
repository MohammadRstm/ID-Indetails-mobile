import { StyleSheet, View } from "react-native";
import type { Project } from "@/api/types";
import { Figure, FigureGrid, MarginPill } from "@/features/billing/components/MoneyBits";
import { P } from "@/permissions/codes";
import { usePermissions } from "@/permissions/usePermissions";
import { spacing } from "@/theme/tokens";
import { Card, Section, Text } from "@/ui";

export type ProjectMoneyProps = { project: Project };

/** Slot: the project's money, below its summary. Only for people who may see financials; every figure is the API's. */
export function ProjectMoney({ project }: ProjectMoneyProps) {
  const perms = usePermissions();
  const m = project.money;
  if (!perms.has(P.FINANCIAL_VIEW) || !m) return null;

  return (
    <Section title="Money">
      <Card>
        <View style={styles.head}>
          <Text variant="small" tone="muted" style={styles.grow}>
            In {m.currency}
          </Text>
          <MarginPill margin={m.margin} />
        </View>
        <FigureGrid>
          <Figure label="Revenue" amount={m.revenue} currency={m.currency} />
          <Figure label="Cost" amount={m.cost.total} currency={m.currency} />
          <Figure label="Profit" amount={m.profit} currency={m.currency} signed />
          <Figure label="Received" amount={m.billing.received} currency={m.currency} />
          <Figure label="Outstanding" amount={m.billing.outstanding} currency={m.currency} />
          {m.billing.overdueCount > 0 && (
            <Figure
              label="Overdue"
              amount={m.billing.overdue}
              currency={m.currency}
              sub={`${m.billing.overdueCount} invoice${m.billing.overdueCount === 1 ? "" : "s"}`}
            />
          )}
        </FigureGrid>
      </Card>
    </Section>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: "row", alignItems: "center", gap: spacing.m },
  grow: { flex: 1 },
});
