import { router } from "expo-router";
import { toApiError } from "@/api/errors";
import { useProject } from "@/features/projects/api";
import { PendingRecordsList } from "@/features/sites/screens/PendingRecordsList";
import { fmtDate } from "@/format/time";
import { useOfflineBanner } from "@/offline/useOnline";
import {
  Badge,
  Card,
  EmptyState,
  ListRow,
  LoadError,
  Screen,
  ScreenHeader,
  Section,
  Skeleton,
} from "@/ui";
import { useLabourWeeks } from "../api";

export type LabourWeeksScreenProps = {
  projectId: number;
};

/** A site's labour weeks, newest first, reported or not. */
export function LabourWeeksScreen({ projectId }: LabourWeeksScreenProps) {
  const project = useProject(projectId);
  const weeks = useLabourWeeks(projectId);
  const banner = useOfflineBanner(weeks.dataUpdatedAt);
  const back = () => (router.canGoBack() ? router.back() : router.replace("/sites"));

  return (
    <Screen
      header={<ScreenHeader title="Labour" subtitle={project.data?.title} onBack={back} />}
      banner={banner}
      refreshing={weeks.isRefetching}
      onRefresh={() => void weeks.refetch()}
    >
      <Section>
        <PendingRecordsList projectId={projectId} unsentOnly />
      </Section>
      {weeks.isError && !weeks.data ? (
        <LoadError
          what="the labour weeks"
          message={toApiError(weeks.error).message}
          traceId={toApiError(weeks.error).traceId}
          onRetry={() => void weeks.refetch()}
        />
      ) : !weeks.data ? (
        <Skeleton lines={6} height={18} />
      ) : weeks.data.weeks.length === 0 ? (
        <EmptyState
          art="time"
          title="No weeks yet"
          text="Weeks start from the site's first week."
        />
      ) : (
        <Section title={`${weeks.data.reportedWeeks} reported`}>
          <Card padded={false}>
            {weeks.data.weeks.map((week, i) => (
              <ListRow
                key={week.weekStart}
                title={`Week of ${fmtDate(week.weekStart)}`}
                subtitle={
                  week.isReported
                    ? `${week.workerDays ?? 0} worker-days${week.submittedBy ? ` · ${week.submittedBy.name}` : ""}`
                    : "Not reported yet"
                }
                trailing={
                  <Badge
                    label={week.isReported ? "Reported" : "Open"}
                    tone={week.isReported ? "ok" : "warn"}
                  />
                }
                chevron
                divider={i < weeks.data.weeks.length - 1}
                onPress={() =>
                  router.push({
                    pathname: "/projects/[id]/labour/[weekStart]",
                    params: { id: String(projectId), weekStart: week.weekStart },
                  })
                }
              />
            ))}
          </Card>
        </Section>
      )}
    </Screen>
  );
}
