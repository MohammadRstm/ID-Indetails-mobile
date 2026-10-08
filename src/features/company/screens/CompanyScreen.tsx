import { router } from "expo-router";
import { useState } from "react";
import { toApiError } from "@/api/errors";
import { money } from "@/format/money";
import { periodRange } from "@/format/periods";
import { DOMAINS } from "@/permissions/permissions";
import { usePermissions } from "@/permissions/usePermissions";
import {
  Card,
  InlineError,
  LoadError,
  Screen,
  ScreenHeader,
  Section,
  Segmented,
  Skeleton,
  Text,
} from "@/ui";
import { Figure, FigureGrid } from "../../billing/components/MoneyBits";
import { useCompanyMonthly, useCompanyOverview } from "../api";
import { DomainCard } from "../components/DomainCard";
import { MonthlyChart } from "../components/MonthlyChart";
import { DOMAIN_LABEL, PERIOD_OPTIONS, type CompanyPeriod } from "../model";

const CHART_MONTHS = 12;

/** The company's figures for a window up to today, per domain and together, and the last year month by month. */
export function CompanyScreen() {
  const perms = usePermissions();
  const [period, setPeriod] = useState<CompanyPeriod>("month");
  const range = periodRange(period);
  const overview = useCompanyOverview({ from: range.from, to: range.to });
  const monthly = useCompanyMonthly(CHART_MONTHS);
  const o = overview.data;
  const overviewError = overview.isError ? toApiError(overview.error) : null;

  const domains = (o?.domains ?? []).filter(
    (d): d is typeof d & { domain: (typeof DOMAINS)[number] } => perms.canSeeDomain(d.domain),
  );
  const companyUnconverted = o
    ? [...o.unconvertedOverhead, ...o.unconvertedAdminSalaries].map((u) =>
        money.exact(u.total, u.currency),
      )
    : [];

  return (
    <Screen
      header={
        <ScreenHeader
          title="Company"
          subtitle={range.label}
          onBack={router.canGoBack() ? () => router.back() : undefined}
        />
      }
      refreshing={overview.isRefetching || monthly.isRefetching}
      onRefresh={() => {
        void overview.refetch();
        void monthly.refetch();
      }}
    >
      <Section>
        <Segmented
          accessibilityLabel="Period"
          options={PERIOD_OPTIONS}
          value={period}
          onChange={setPeriod}
        />
      </Section>

      {overviewError && !o ? (
        <LoadError
          what="the company's figures"
          message={overviewError.message}
          traceId={overviewError.traceId}
          onRetry={() => void overview.refetch()}
        />
      ) : !o ? (
        <Section>
          <Skeleton height={180} radius={9} />
          <Skeleton height={140} radius={9} />
        </Section>
      ) : (
        <>
          <Section title="The company">
            <Card>
              <FigureGrid>
                <Figure label="Net profit" amount={o.netProfit} signed large />
                <Figure label="Revenue" amount={o.revenue} />
                <Figure label="Costs" amount={o.cost} />
                <Figure label="Gross profit" amount={o.grossProfit} signed />
                <Figure label="Overhead" amount={o.overhead} />
                <Figure label="Admin salaries" amount={o.adminSalaries} />
                <Figure label="Invoiced" amount={o.invoiced} />
                <Figure label="Collected" amount={o.collected} />
                <Figure label="Outstanding" amount={o.outstanding} />
              </FigureGrid>
              <Text variant="small" tone="muted">
                Revenue is money received in the period. Net profit is after company overhead and
                the admins&apos; salaries.
              </Text>
              {companyUnconverted.length > 0 && (
                <Text variant="small" tone="warn">
                  Left out for want of an exchange rate: {companyUnconverted.join(", ")}
                </Text>
              )}
            </Card>
          </Section>

          {domains.map((d) => (
            <Section key={d.domain} title={DOMAIN_LABEL[d.domain]}>
              <DomainCard label={DOMAIN_LABEL[d.domain]} domain={d} detailed />
            </Section>
          ))}
        </>
      )}

      <Section title={`The last ${CHART_MONTHS} months`}>
        <Card>
          {monthly.data ? (
            <MonthlyChart
              months={monthly.data.map((m) => ({
                month: m.month,
                revenue: m.revenue,
                netProfit: m.netProfit,
              }))}
            />
          ) : monthly.isError ? (
            <InlineError
              what="the months"
              message={toApiError(monthly.error).message}
              onRetry={() => void monthly.refetch()}
            />
          ) : (
            <Skeleton height={150} />
          )}
        </Card>
      </Section>
    </Screen>
  );
}
