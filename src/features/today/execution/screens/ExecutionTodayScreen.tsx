import { router } from "expo-router";
import { toApiError } from "@/api/errors";
import { useCurrentUser } from "@/auth/session";
import { useLabourWeeksOf } from "@/features/labour/api";
import { useProjects, useSiteSummaries } from "@/features/projects/api";
import { ProtonEntry } from "@/features/proton/slots/ProtonEntry";
import { MyRequirementRow } from "@/features/requirements/components/MyRequirementRow";
import { useMyRequirements } from "@/features/requirements/api";
import { PendingBanner } from "@/features/sites/components/PendingBanner";
import { orderSites, siteWeekStart } from "@/features/sites/model";
import { usePendingCounts } from "@/features/sites/usePendingCounts";
import { companyToday, fmtDate, fmtDayDateY, relTime } from "@/format/time";
import { useOfflineBanner } from "@/offline/useOnline";
import { P } from "@/permissions/codes";
import { usePermissions } from "@/permissions/usePermissions";
import {
  Badge,
  Button,
  Card,
  InlineError,
  ListRow,
  Screen,
  ScreenHeader,
  Section,
  Skeleton,
  Text,
} from "@/ui";

const SITES_SHOWN = 4;

const openSite = (id: number) =>
  router.push({ pathname: "/projects/[id]", params: { id: String(id) } });

/** Site staff's day: their sites, open requirements, adding materials, this week's labour and pending records. */
export function ExecutionTodayScreen() {
  const me = useCurrentUser();
  const perms = usePermissions();
  const today = companyToday();
  const weekStart = siteWeekStart(today);
  const records = perms.hasAny(P.MATERIAL_CREATE, P.MATERIAL_MANAGE);
  const reports = perms.hasAny(P.LABOUR_REPORT_CREATE, P.LABOUR_REPORT_MANAGE);
  const projects = useProjects({ domain: "execution" }, perms.has(P.PROJECT_VIEW));
  const summaries = useSiteSummaries((projects.data?.items ?? []).map((p) => p.id));
  const requirements = useMyRequirements(perms.has(P.REQUIREMENT_VIEW));
  const pending = usePendingCounts();
  const banner = useOfflineBanner(projects.dataUpdatedAt);

  const sites = orderSites(projects.data?.items ?? [], summaries.data ?? []);
  const mySites = sites.filter((s) => s.lastRecordedAt).slice(0, SITES_SHOWN);
  const shownSites = (mySites.length ? mySites : sites).slice(0, SITES_SHOWN);
  const labour = useLabourWeeksOf(reports ? mySites.map((s) => s.project.id) : []);
  const openRequirements = (requirements.data?.items ?? []).slice(0, 5);

  return (
    <Screen
      header={
        <ScreenHeader
          title={`Hi ${me.firstName}`}
          subtitle={fmtDayDateY(today)}
          actions={<ProtonEntry page="dashboard" />}
        />
      }
      banner={banner}
      refreshing={projects.isRefetching}
      onRefresh={() => {
        void projects.refetch();
        void summaries.refetch();
        void requirements.refetch();
        labour.forEach((q) => void q.refetch());
      }}
    >
      {pending.waiting + pending.needsAttention > 0 ? (
        <Section>
          <PendingBanner {...pending} onPress={() => router.push("/pending")} />
        </Section>
      ) : null}
      {records ? (
        <Section>
          <Button
            label="Add materials"
            icon="plus"
            variant="primary"
            size="large"
            fullWidth
            onPress={() => router.push("/materials/add")}
          />
        </Section>
      ) : null}
      <Section
        title="My sites"
        action={{ label: "All sites", onPress: () => router.push("/sites") }}
      >
        {projects.isError && !projects.data ? (
          <InlineError
            what="your sites"
            message={toApiError(projects.error).message}
            onRetry={() => void projects.refetch()}
          />
        ) : !projects.data ? (
          <Skeleton lines={3} height={18} />
        ) : shownSites.length === 0 ? (
          <Text variant="small" tone="muted">
            No open sites.
          </Text>
        ) : (
          <Card padded={false}>
            {shownSites.map(({ project, lastRecordedAt }, i) => (
              <ListRow
                key={project.id}
                title={project.title}
                subtitle={
                  lastRecordedAt
                    ? `Last recorded ${relTime(lastRecordedAt)}`
                    : "Nothing recorded by you yet"
                }
                chevron
                divider={i < shownSites.length - 1}
                onPress={() => openSite(project.id)}
              />
            ))}
          </Card>
        )}
      </Section>
      {reports && mySites.length > 0 ? (
        <Section title={`Labour · week of ${fmtDate(weekStart)}`}>
          <Card padded={false}>
            {mySites.map(({ project }, i) => {
              const weeks = labour[i]?.data;
              const thisWeek = weeks?.weeks.find((w) => w.weekStart === weekStart);
              return (
                <ListRow
                  key={project.id}
                  title={project.title}
                  trailing={
                    !weeks ? undefined : (
                      <Badge
                        label={thisWeek?.isReported ? "Reported" : "Not reported"}
                        tone={thisWeek?.isReported ? "ok" : "warn"}
                      />
                    )
                  }
                  chevron
                  divider={i < mySites.length - 1}
                  onPress={() =>
                    router.push({
                      pathname: "/projects/[id]/labour/[weekStart]",
                      params: { id: String(project.id), weekStart },
                    })
                  }
                />
              );
            })}
          </Card>
        </Section>
      ) : null}
      {perms.has(P.REQUIREMENT_VIEW) ? (
        <Section
          title="Open requirements"
          action={{ label: "All", onPress: () => router.push("/requirements") }}
        >
          {requirements.isError && !requirements.data ? (
            <InlineError
              what="your requirements"
              message={toApiError(requirements.error).message}
              onRetry={() => void requirements.refetch()}
            />
          ) : !requirements.data ? (
            <Skeleton lines={3} height={18} />
          ) : openRequirements.length === 0 ? (
            <Text variant="small" tone="muted">
              No requirements assigned to you. Enjoy the quiet.
            </Text>
          ) : (
            <Card padded={false}>
              {openRequirements.map((r, i) => (
                <MyRequirementRow
                  key={r.id}
                  requirement={r}
                  divider={i < openRequirements.length - 1}
                  onPress={() =>
                    router.push({
                      pathname: "/projects/[id]/requirements",
                      params: { id: String(r.project.id), requirementId: String(r.id) },
                    })
                  }
                />
              ))}
            </Card>
          )}
        </Section>
      ) : null}
    </Screen>
  );
}
