import { router } from "expo-router";
import type { ReactNode } from "react";
import { toApiError } from "@/api/errors";
import type { Project } from "@/api/types";
import { useCurrentUser } from "@/auth/session";
import { MeetingRow } from "@/features/meetings/components/MeetingRow";
import { useProjectMeetings } from "@/features/meetings/api";
import { useProjectRequirements } from "@/features/requirements/api";
import { orderRequirements } from "@/features/requirements/model";
import { usePendingCounts } from "@/features/sites/usePendingCounts";
import { requestLogWork } from "@/features/work/logWorkRequest";
import { companyToday, dayKey, fmtDate } from "@/format/time";
import { useOfflineBanner } from "@/offline/useOnline";
import { P } from "@/permissions/codes";
import { usePermissions } from "@/permissions/usePermissions";
import {
  Badge,
  Bar,
  Button,
  Card,
  ListRow,
  LoadError,
  Screen,
  ScreenHeader,
  Section,
  Skeleton,
  StatusBadge,
  Text,
} from "@/ui";
import { useProject } from "../api";
import { AdminProjectActions } from "../slots/AdminProjectActions";
import { ProjectMoney } from "../slots/ProjectMoney";

export type ProjectScreenProps = {
  projectId: number;
  /** Opened on this section (a push or link about a meeting). */
  section: "meetings" | null;
};

const back = () => (router.canGoBack() ? router.back() : router.replace("/today"));

/** A project: its summary, requirements and meetings, and on a site its materials and labour. */
export function ProjectScreen({ projectId, section }: ProjectScreenProps) {
  const project = useProject(projectId);
  const banner = useOfflineBanner(project.dataUpdatedAt);

  if (project.isError && !project.data) {
    const error = toApiError(project.error);
    return (
      <Screen header={<ScreenHeader title="Project" onBack={back} />}>
        <LoadError
          what="this project"
          message={
            error.status === 404 ? "It doesn't exist, or isn't one you can see." : error.message
          }
          traceId={error.traceId}
          onRetry={error.status === 404 ? undefined : () => void project.refetch()}
        />
      </Screen>
    );
  }
  if (!project.data) {
    return (
      <Screen header={<ScreenHeader title="Project" onBack={back} />}>
        <Skeleton lines={8} height={18} />
      </Screen>
    );
  }

  const p = project.data;
  return (
    <Screen
      header={
        <ScreenHeader
          title={p.title}
          subtitle={p.client?.displayName ?? "Internal project"}
          onBack={back}
          actions={<AdminProjectActions project={p} />}
        />
      }
      banner={banner}
      refreshing={project.isRefetching}
      onRefresh={() => void project.refetch()}
    >
      <ProjectSections project={p} meetingsFirst={section === "meetings"} />
    </Screen>
  );
}

function ProjectSections({
  project: p,
  meetingsFirst,
}: {
  project: Project;
  meetingsFirst: boolean;
}) {
  const perms = usePermissions();
  const open = p.status === "active" || p.status === "hold";
  const site = p.domain === "execution";
  const requirements = <RequirementsSection project={p} />;
  const meetings = <MeetingsSection project={p} open={open} />;

  return (
    <>
      <Section>
        <Card>
          <StatusBadge status={p.status} />
          <Text variant="small" tone="secondary">
            {p.progressPct}% done
          </Text>
          <Bar value={p.progressPct / 100} accessibilityLabel="Progress" />
          <Text variant="small" tone="muted">
            {[
              `Owner ${p.owner.name}`,
              `Started ${fmtDate(p.startDate)}`,
              p.targetDate ? `Target ${fmtDate(p.targetDate)}` : null,
              p.location,
            ]
              .filter(Boolean)
              .join(" · ")}
          </Text>
          {p.description ? <Text>{p.description}</Text> : null}
        </Card>
      </Section>
      <ProjectMoney project={p} />
      {!site && open && perms.hasAll(P.WORK_ENTRY_CREATE, P.WORK_ENTRY_VIEW_OWN) ? (
        <Section>
          <Button
            label="Log work on this project"
            icon="plus"
            variant="primary"
            fullWidth
            onPress={() => {
              requestLogWork({ projectId: p.id });
              router.push("/log-work");
            }}
          />
        </Section>
      ) : null}
      {site ? <SiteSection project={p} open={open} /> : null}
      {meetingsFirst ? meetings : requirements}
      {meetingsFirst ? requirements : meetings}
    </>
  );
}

function SiteSection({ project: p, open }: { project: Project; open: boolean }) {
  const perms = usePermissions();
  const pending = usePendingCounts(p.id);
  const params = { id: String(p.id) };
  const rows: ReactNode[] = [];
  if (perms.hasAny(P.MATERIAL_CREATE, P.MATERIAL_MANAGE)) {
    rows.push(
      <ListRow
        key="materials"
        title="Materials"
        subtitle="What was delivered to the site"
        chevron
        divider
        onPress={() => router.push({ pathname: "/projects/[id]/materials", params })}
      />,
    );
  }
  if (perms.hasAny(P.LABOUR_REPORT_CREATE, P.LABOUR_REPORT_MANAGE)) {
    rows.push(
      <ListRow
        key="labour"
        title="Labour"
        subtitle="Workers on site, week by week"
        chevron
        divider
        onPress={() => router.push({ pathname: "/projects/[id]/labour", params })}
      />,
    );
  }
  if (pending.waiting + pending.needsAttention > 0) {
    rows.push(
      <ListRow
        key="pending"
        title="On your phone"
        subtitle="Records not sent yet"
        trailing={
          <Badge
            label={String(pending.waiting + pending.needsAttention)}
            tone={pending.needsAttention ? "now" : "warn"}
          />
        }
        chevron
        onPress={() => router.push("/pending")}
      />,
    );
  }
  if (rows.length === 0) return null;
  return (
    <Section title="Site">
      {open && perms.has(P.MATERIAL_CREATE) ? (
        <Button
          label="Add materials"
          icon="plus"
          variant="primary"
          fullWidth
          onPress={() =>
            router.push({ pathname: "/materials/add", params: { projectId: String(p.id) } })
          }
        />
      ) : null}
      <Card padded={false}>{rows}</Card>
    </Section>
  );
}

const SHOWN = 4;

function RequirementsSection({ project: p }: { project: Project }) {
  const me = useCurrentUser();
  const perms = usePermissions();
  const list = useProjectRequirements(p.id, perms.has(P.REQUIREMENT_VIEW));
  if (!perms.has(P.REQUIREMENT_VIEW)) return null;
  const open = orderRequirements(list.data?.items ?? []).filter((r) => !r.isDone);
  const shown = open.slice(0, SHOWN);
  const all = () =>
    router.push({ pathname: "/projects/[id]/requirements", params: { id: String(p.id) } });

  return (
    <Section title="Requirements" action={{ label: "All", onPress: all }}>
      {!list.data ? (
        list.isError ? (
          <Text variant="small" tone="danger">
            {toApiError(list.error).message}
          </Text>
        ) : (
          <Skeleton lines={2} />
        )
      ) : shown.length === 0 ? (
        <Text variant="small" tone="muted">
          {list.data.total ? "Every requirement is done." : "No requirements yet."}
        </Text>
      ) : (
        <Card padded={false}>
          {shown.map((r, i) => (
            <ListRow
              key={r.id}
              title={r.text}
              subtitle={
                [
                  r.assignees.some((a) => a.id === me.id) ? "Yours" : null,
                  r.deadline ? `Due ${fmtDate(r.deadline)}` : null,
                ]
                  .filter(Boolean)
                  .join(" · ") || undefined
              }
              trailing={r.isOverdue ? <Badge label="Overdue" tone="now" /> : undefined}
              divider={i < shown.length - 1}
              onPress={() =>
                router.push({
                  pathname: "/projects/[id]/requirements",
                  params: { id: String(p.id), requirementId: String(r.id) },
                })
              }
            />
          ))}
          {open.length > SHOWN ? (
            <ListRow title={`${open.length - SHOWN} more open`} chevron onPress={all} />
          ) : null}
        </Card>
      )}
    </Section>
  );
}

function MeetingsSection({ project: p, open }: { project: Project; open: boolean }) {
  const perms = usePermissions();
  const meetings = useProjectMeetings(p.id);
  const today = companyToday();
  const upcoming = (meetings.data ?? []).filter((m) => dayKey(m.startsAt) >= today);
  const canCreate = open && perms.has(P.MEETING_CREATE);

  return (
    <Section
      title="Meetings"
      action={
        canCreate
          ? {
              label: "Schedule",
              onPress: () =>
                router.push({ pathname: "/meetings/new", params: { projectId: String(p.id) } }),
            }
          : undefined
      }
    >
      {!meetings.data ? (
        meetings.isError ? (
          <Text variant="small" tone="danger">
            {toApiError(meetings.error).message}
          </Text>
        ) : (
          <Skeleton lines={2} />
        )
      ) : upcoming.length === 0 ? (
        <Text variant="small" tone="muted">
          No meetings coming up.
        </Text>
      ) : (
        <Card padded={false}>
          {upcoming.map((m, i) => (
            <MeetingRow
              key={m.id}
              meeting={m}
              withDay
              divider={i < upcoming.length - 1}
              onPress={() =>
                router.push({ pathname: "/meetings/[id]", params: { id: String(m.id) } })
              }
            />
          ))}
        </Card>
      )}
    </Section>
  );
}
