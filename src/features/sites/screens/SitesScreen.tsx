import { router } from "expo-router";
import { toApiError } from "@/api/errors";
import { useProjects, useSiteSummaries } from "@/features/projects/api";
import { relTime } from "@/format/time";
import { useOfflineBanner } from "@/offline/useOnline";
import { P } from "@/permissions/codes";
import { usePermissions } from "@/permissions/usePermissions";
import {
  Card,
  EmptyState,
  IconButton,
  ListRow,
  LoadError,
  Screen,
  ScreenHeader,
  Section,
  Skeleton,
  StatusBadge,
} from "@/ui";
import { PendingBanner } from "../components/PendingBanner";
import { orderSites } from "../model";
import { usePendingCounts } from "../usePendingCounts";

/** Site staff's sites: the ones they recorded on most recently first, each opening its materials and labour. */
export function SitesScreen() {
  const perms = usePermissions();
  const projects = useProjects({ domain: "execution" });
  const ids = (projects.data?.items ?? []).map((p) => p.id);
  const summaries = useSiteSummaries(ids);
  const pending = usePendingCounts();
  const banner = useOfflineBanner(projects.dataUpdatedAt);
  const sites = orderSites(projects.data?.items ?? [], summaries.data ?? []);
  const canAdd = perms.has(P.MATERIAL_CREATE);

  return (
    <Screen
      header={
        <ScreenHeader
          title="Sites"
          actions={
            canAdd ? (
              <IconButton
                icon="plus"
                accessibilityLabel="Add materials"
                onPress={() => router.push("/materials/add")}
              />
            ) : null
          }
        />
      }
      banner={banner}
      refreshing={projects.isRefetching}
      onRefresh={() => {
        void projects.refetch();
        void summaries.refetch();
      }}
    >
      {pending.waiting + pending.needsAttention > 0 ? (
        <Section>
          <PendingBanner {...pending} onPress={() => router.push("/pending")} />
        </Section>
      ) : null}
      {projects.isError && !projects.data ? (
        <LoadError
          what="your sites"
          message={toApiError(projects.error).message}
          traceId={toApiError(projects.error).traceId}
          onRetry={() => void projects.refetch()}
        />
      ) : !projects.data ? (
        <Skeleton lines={6} height={20} />
      ) : sites.length === 0 ? (
        <EmptyState
          art="projects"
          title="No open sites"
          text="Sites show here while they are active or on hold."
        />
      ) : (
        <Section title="Most recently recorded first">
          <Card padded={false}>
            {sites.map(({ project, lastRecordedAt }, i) => (
              <ListRow
                key={project.id}
                title={project.title}
                subtitle={[
                  project.client?.displayName ?? project.location,
                  lastRecordedAt
                    ? `You recorded ${relTime(lastRecordedAt)}`
                    : "Nothing recorded by you",
                ]
                  .filter(Boolean)
                  .join(" · ")}
                trailing={project.status === "hold" ? <StatusBadge status="hold" /> : undefined}
                chevron
                divider={i < sites.length - 1}
                onPress={() =>
                  router.push({ pathname: "/projects/[id]", params: { id: String(project.id) } })
                }
              />
            ))}
          </Card>
        </Section>
      )}
    </Screen>
  );
}
