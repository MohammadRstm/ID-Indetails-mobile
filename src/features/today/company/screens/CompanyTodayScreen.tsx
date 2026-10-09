import { router, type Href } from "expo-router";
import { toApiError } from "@/api/errors";
import { useInvoiceCount } from "@/features/billing/api";
import { Figure, FigureGrid } from "@/features/billing/components/MoneyBits";
import {
  useCompanyOverview,
  useMoneyAttention,
  useRecentNotifications,
  useUnreadNotificationCount,
} from "@/features/company/api";
import { DomainCard } from "@/features/company/components/DomainCard";
import { CountTile, TileGrid } from "@/features/company/components/MoneyLines";
import { DOMAIN_LABEL } from "@/features/company/model";
import { periodRange } from "@/format/periods";
import { P } from "@/permissions/codes";
import { DOMAINS, type Domain } from "@/permissions/permissions";
import { usePermissions } from "@/permissions/usePermissions";
import { useTheme } from "@/theme/ThemeProvider";
import {
  Card,
  Icon,
  ListRow,
  LoadError,
  Screen,
  ScreenHeader,
  Section,
  Skeleton,
  type IconName,
} from "@/ui";

type Link = { title: string; icon: IconName; path: Href };

/** A super admin's day: the month so far for the company and each domain, and the money that needs chasing. */
export function CompanyTodayScreen() {
  const perms = usePermissions();
  const { colors } = useTheme();
  const canSeeMoney = perms.has(P.FINANCIAL_VIEW);
  const canSeeCompany = canSeeMoney && perms.has(P.COMPANY_VIEW);
  const domains = DOMAINS.filter((d) => perms.canSeeDomain(d));
  const range = periodRange("month");

  const overview = useCompanyOverview({ from: range.from, to: range.to }, canSeeCompany);
  const attention = useMoneyAttention(domains, canSeeMoney);
  const overdue = useInvoiceCount("overdue", canSeeMoney);
  const unread = useUnreadNotificationCount();
  const recent = useRecentNotifications(canSeeMoney);

  const o = overview.data;
  const error = overview.isError ? toApiError(overview.error) : null;
  const failedSends = (recent.data ?? []).filter(
    (n) => n.kind === "invoice_send_failed" && n.readAt == null,
  ).length;
  const visibleDomains = (o?.domains ?? []).filter((d): d is typeof d & { domain: Domain } =>
    perms.canSeeDomain(d.domain),
  );

  const links: Link[] = [];
  if (canSeeCompany) links.push({ title: "Company figures", icon: "chartTile", path: "/company" });
  if (canSeeMoney) links.push({ title: "Invoices", icon: "file", path: "/billing/invoices" });
  if (perms.has(P.PAYMENT_RECORD)) {
    links.push({ title: "Record a payment", icon: "card", path: "/billing/payments/new" });
  }

  return (
    <Screen
      header={<ScreenHeader title="Company" subtitle={range.label} />}
      refreshing={overview.isRefetching || attention.isRefetching}
      onRefresh={() => {
        void overview.refetch();
        void attention.refetch();
        void overdue.refetch();
        void unread.refetch();
        void recent.refetch();
      }}
    >
      <Section title="Needs attention">
        <TileGrid>
          {canSeeMoney && (
            <>
              <CountTile
                label="Money follow-ups"
                icon="alert"
                count={attention.isPending ? null : attention.items.length}
                alarming
                onPress={() => router.push("/company/alerts")}
              />
              <CountTile
                label="Overdue invoices"
                icon="file"
                count={overdue.data ?? null}
                alarming
                onPress={() => router.push("/billing/invoices")}
              />
              <CountTile
                label="Automatic sends that failed"
                icon="send"
                count={recent.data ? failedSends : null}
                alarming
                onPress={() => router.push("/company/alerts")}
              />
            </>
          )}
          <CountTile
            label="Unread alerts"
            icon="bell"
            count={unread.data ?? null}
            onPress={() => router.push("/alerts")}
          />
        </TileGrid>
      </Section>

      {canSeeCompany &&
        (error && !o ? (
          <LoadError
            what="the month's figures"
            message={error.message}
            traceId={error.traceId}
            onRetry={() => void overview.refetch()}
          />
        ) : !o ? (
          <Section>
            <Skeleton height={140} radius={9} />
          </Section>
        ) : (
          <>
            <Section title="The month so far">
              <Card>
                <FigureGrid>
                  <Figure label="Net profit" amount={o.netProfit} signed large />
                  <Figure label="Revenue" amount={o.revenue} />
                  <Figure label="Costs" amount={o.cost} />
                  <Figure label="Outstanding" amount={o.outstanding} />
                </FigureGrid>
              </Card>
            </Section>
            {visibleDomains.map((d) => (
              <Section key={d.domain} title={DOMAIN_LABEL[d.domain]}>
                <DomainCard label={DOMAIN_LABEL[d.domain]} domain={d} />
              </Section>
            ))}
          </>
        ))}

      {links.length > 0 && (
        <Section title="Go to">
          <Card padded={false}>
            {links.map((link, i) => (
              <ListRow
                key={link.title}
                title={link.title}
                leading={<Icon name={link.icon} size={20} color={colors.ink2} />}
                chevron
                divider={i < links.length - 1}
                onPress={() => router.push(link.path)}
              />
            ))}
          </Card>
        </Section>
      )}
    </Screen>
  );
}
