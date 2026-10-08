import { router } from "expo-router";
import { useState } from "react";
import { toApiError } from "@/api/errors";
import type { LabourWeek } from "@/api/types";
import { useCurrentUser } from "@/auth/session";
import { useProject } from "@/features/projects/api";
import { PendingRecordsList } from "@/features/sites/screens/PendingRecordsList";
import { fmtDate } from "@/format/time";
import type { LabourRecord } from "@/offline/model";
import { putLabourWeek, useOutbox } from "@/offline/outbox";
import { requestSync } from "@/offline/sync";
import { useIsOnline, useOfflineBanner } from "@/offline/useOnline";
import { P } from "@/permissions/codes";
import { usePermissions } from "@/permissions/usePermissions";
import {
  Badge,
  Button,
  InlineError,
  LoadError,
  Screen,
  ScreenHeader,
  Section,
  Skeleton,
  Text,
  toast,
} from "@/ui";
import { useLabourWeek } from "../api";
import { LabourWeekEditor } from "../components/LabourWeekEditor";
import { draftFromWeek, sameWeek, weekProblem, type WeekDraft } from "../model";

export type LabourWeekScreenProps = {
  projectId: number;
  /** The week's first day, "yyyy-MM-dd". */
  weekStart: string;
};

const back = () => (router.canGoBack() ? router.back() : router.replace("/sites"));

/**
 * One labour week of a site, editable on the phone: it opens from the loaded (or kept) week, and submitting
 * saves it on the phone first, sent with the version it was loaded at so someone else's change isn't overwritten.
 */
export function LabourWeekScreen({ projectId, weekStart }: LabourWeekScreenProps) {
  const project = useProject(projectId);
  const week = useLabourWeek(projectId, weekStart);
  const banner = useOfflineBanner(week.dataUpdatedAt);
  const title = `Week of ${fmtDate(weekStart)}`;

  return (
    <Screen
      header={<ScreenHeader title={title} subtitle={project.data?.title} onBack={back} />}
      banner={banner}
    >
      {week.isError && !week.data ? (
        <LoadError
          what="this week"
          message={toApiError(week.error).message}
          traceId={toApiError(week.error).traceId}
          onRetry={() => void week.refetch()}
        />
      ) : !week.data ? (
        <Skeleton lines={8} height={18} />
      ) : (
        <WeekForm
          projectId={projectId}
          weekStart={weekStart}
          projectTitle={project.data?.title ?? "the site"}
          week={week.data}
        />
      )}
    </Screen>
  );
}

type WeekFormProps = {
  projectId: number;
  weekStart: string;
  projectTitle: string;
  week: LabourWeek;
};

function WeekForm({ projectId, weekStart, projectTitle, week }: WeekFormProps) {
  const me = useCurrentUser();
  const perms = usePermissions();
  const online = useIsOnline();
  const pending = useOutbox(me.id).find(
    (r): r is LabourRecord =>
      r.kind === "labour_week" &&
      r.projectId === projectId &&
      r.weekStart === weekStart &&
      r.status !== "sent",
  );
  const [draft, setDraft] = useState<WeekDraft>(() => draftFromWeek(week, pending));
  const [problem, setProblem] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const canReport = perms.hasAny(P.LABOUR_REPORT_CREATE, P.LABOUR_REPORT_MANAGE);
  const editable = canReport && week.canEdit;
  const unchanged = week.isReported && !pending && sameWeek(draft, week);

  async function submit() {
    const issue = weekProblem(draft);
    if (issue) {
      setProblem(issue);
      return;
    }
    setSaving(true);
    try {
      await putLabourWeek(me.id, projectId, weekStart, {
        projectTitle,
        days: draft.days,
        note: draft.note.trim() || null,
        expectedVersion: draft.expectedVersion,
      });
      void requestSync();
      toast({
        text: online ? "Saved. Sending…" : "Saved on your phone",
        sub: online ? undefined : "It will send when you're back online.",
        icon: "checkCircle",
      });
      back();
    } catch (error) {
      setProblem(toApiError(error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Section>
        <Badge
          label={
            week.isReported
              ? `Reported${week.submittedBy ? ` by ${week.submittedBy.name}` : ""}`
              : "Not reported yet"
          }
          tone={week.isReported ? "ok" : "warn"}
        />
        {!week.isReported ? (
          <Text variant="small" tone="muted">
            Filled in from the site's usual crew and day rate. Change what was different.
          </Text>
        ) : null}
        <PendingRecordsList projectId={projectId} unsentOnly />
      </Section>
      <Section title="Days">
        <LabourWeekEditor
          draft={draft}
          onChange={(next) => {
            setDraft(next);
            setProblem(null);
          }}
          editable={editable}
        />
      </Section>
      {problem ? <InlineError message={problem} /> : null}
      {editable ? (
        <Button
          label={week.isReported ? "Save changes" : "Submit the week"}
          variant="primary"
          size="large"
          fullWidth
          loading={saving}
          disabled={unchanged || draft.days.length === 0}
          onPress={() => void submit()}
        />
      ) : (
        <Text variant="small" tone="muted">
          {canReport
            ? "Someone else reported this week; only they or a manager can change it."
            : "You can see this week but not report it."}
        </Text>
      )}
    </>
  );
}
