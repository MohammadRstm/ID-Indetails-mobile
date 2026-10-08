import { router } from "expo-router";
import { useState } from "react";
import { toApiError } from "@/api/errors";
import type { ProjectStatus, ProjectSummary } from "@/api/types";
import { useMyProjects } from "@/features/work/api";
import { useOfflineBanner } from "@/offline/useOnline";
import { P } from "@/permissions/codes";
import { usePermissions } from "@/permissions/usePermissions";
import {
  Card,
  EmptyState,
  ListRow,
  LoadError,
  Screen,
  ScreenHeader,
  Section,
  Segmented,
  Skeleton,
  StatusBadge,
  TextField,
} from "@/ui";
import { useProjects, useSiteSummaries } from "../api";

type Show = "active" | "hold" | "completed";

function ProjectList({ title, items }: { title: string; items: ProjectSummary[] }) {
  if (items.length === 0) return null;
  return (
    <Section title={`${title} · ${items.length}`}>
      <Card padded={false}>
        {items.map((p, i) => (
          <ListRow
            key={p.id}
            title={p.title}
            subtitle={[p.client?.displayName ?? "Internal", `${p.progressPct}%`].join(" · ")}
            trailing={p.status !== "active" ? <StatusBadge status={p.status} /> : undefined}
            chevron
            divider={i < items.length - 1}
            onPress={() =>
              router.push({ pathname: "/projects/[id]", params: { id: String(p.id) } })
            }
          />
        ))}
      </Card>
    </Section>
  );
}

/** The projects the person can see, theirs first: the ones they logged work or recorded on. */
export function ProjectsScreen() {
  const perms = usePermissions();
  const [show, setShow] = useState<Show>("active");
  const [search, setSearch] = useState("");
  const projects = useProjects({ status: show as ProjectStatus, search: search.trim() });
  const items = projects.data?.items ?? [];
  const logsWork = perms.has(P.WORK_ENTRY_VIEW_OWN);
  const myWork = useMyProjects(logsWork);
  const sites = useSiteSummaries(
    perms.hasAny(P.MATERIAL_CREATE, P.LABOUR_REPORT_CREATE)
      ? items.filter((p) => p.domain === "execution").map((p) => p.id)
      : [],
  );
  const banner = useOfflineBanner(projects.dataUpdatedAt);

  const mine = new Set<number>([
    ...(myWork.data ?? []).filter((p) => p.myLastStartedAt).map((p) => p.id),
    ...(sites.data ?? []).filter((s) => s.myLastRecordedAt).map((s) => s.projectId),
  ]);

  return (
    <Screen
      header={
        <ScreenHeader
          title="Projects"
          onBack={router.canGoBack() ? () => router.back() : undefined}
        />
      }
      banner={banner}
      refreshing={projects.isRefetching}
      onRefresh={() => void projects.refetch()}
    >
      <Section>
        <Segmented
          options={[
            { value: "active", label: "Active" },
            { value: "hold", label: "On hold" },
            { value: "completed", label: "Completed" },
          ]}
          value={show}
          onChange={setShow}
        />
        <TextField
          value={search}
          onChangeText={setSearch}
          placeholder="Search projects or clients"
          accessibilityLabel="Search projects"
          autoCorrect={false}
        />
      </Section>
      {projects.isError && !projects.data ? (
        <LoadError
          what="the projects"
          message={toApiError(projects.error).message}
          traceId={toApiError(projects.error).traceId}
          onRetry={() => void projects.refetch()}
        />
      ) : !projects.data ? (
        <Skeleton lines={6} height={20} />
      ) : items.length === 0 ? (
        <EmptyState art={search ? "search" : "projects"} title="No projects here" />
      ) : (
        <>
          <ProjectList title="Yours" items={items.filter((p) => mine.has(p.id))} />
          <ProjectList
            title={mine.size ? "Others" : "Projects"}
            items={items.filter((p) => !mine.has(p.id))}
          />
        </>
      )}
    </Screen>
  );
}
