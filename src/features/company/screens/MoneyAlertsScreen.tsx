import { router } from "expo-router";
import { toApiError } from "@/api/errors";
import { routeForTarget } from "@/navigation/targets";
import { DOMAINS } from "@/permissions/permissions";
import { usePermissions } from "@/permissions/usePermissions";
import { EmptyState, LoadError, Screen, ScreenHeader, Section, Skeleton } from "@/ui";
import { useMoneyAttention, useRecentNotifications } from "../api";
import { MoneyLineList } from "../components/MoneyLines";
import { attentionLine, isMoneyNotification, notificationLine, type MoneyLine } from "../model";

/** What needs chasing about money: each domain's follow-ups, then the latest money notifications. */
export function MoneyAlertsScreen() {
  const perms = usePermissions();
  const domains = DOMAINS.filter((d) => perms.canSeeDomain(d));
  const attention = useMoneyAttention(domains);
  const recent = useRecentNotifications();

  const withOpens = (line: MoneyLine) => ({
    ...line,
    opens: line.target != null && routeForTarget(line.target, perms) != null,
  });
  const followUps = attention.items.map(({ domain, item }) =>
    withOpens(attentionLine(item, domain)),
  );
  const notes = (recent.data ?? [])
    .filter(isMoneyNotification)
    .map((n) => withOpens(notificationLine(n)));

  const open = (line: MoneyLine) => {
    const href = line.target ? routeForTarget(line.target, perms) : null;
    if (href) router.push(href);
  };

  const error = attention.error ? toApiError(attention.error) : null;
  const loading = attention.isPending || recent.isPending;

  return (
    <Screen
      header={
        <ScreenHeader
          title="Money follow-ups"
          onBack={router.canGoBack() ? () => router.back() : undefined}
        />
      }
      refreshing={attention.isRefetching || recent.isRefetching}
      onRefresh={() => {
        void attention.refetch();
        void recent.refetch();
      }}
    >
      {error && followUps.length === 0 ? (
        <LoadError
          what="the follow-ups"
          message={error.message}
          traceId={error.traceId}
          onRetry={() => void attention.refetch()}
        />
      ) : loading ? (
        <Section>
          <Skeleton height={64} />
          <Skeleton height={64} />
        </Section>
      ) : (
        <>
          {followUps.length === 0 && notes.length === 0 && (
            <EmptyState art="search" title="Nothing needs chasing." />
          )}
          {followUps.length > 0 && (
            <Section title="To follow up">
              <MoneyLineList lines={followUps} onOpen={open} />
            </Section>
          )}
          {notes.length > 0 && (
            <Section title="Recent">
              <MoneyLineList lines={notes} onOpen={open} />
            </Section>
          )}
        </>
      )}
    </Screen>
  );
}
