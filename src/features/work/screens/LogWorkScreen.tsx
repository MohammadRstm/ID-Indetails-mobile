import { router } from "expo-router";
import { useState } from "react";
import { toApiError } from "@/api/errors";
import type { WorkEntry } from "@/api/types";
import { useCurrentUser } from "@/auth/session";
import { startTimer } from "@/features/timer/actions";
import { removeRun } from "@/features/timer/store";
import { companyToday, dayKey, fmtDayDate, fmtDur, fmtRange, minutesOfDay } from "@/format/time";
import { P } from "@/permissions/codes";
import { usePermissions } from "@/permissions/usePermissions";
import { LoadError, Screen, ScreenHeader, Skeleton, toast } from "@/ui";
import {
  entryBody,
  fetchMyDay,
  useDeleteEntry,
  useDomainSettings,
  useMyDay,
  useMyProjects,
  useMySchedule,
  useOvertimePreview,
  useSaveEntry,
  type DomainSettings,
  type MyProject,
} from "../api";
import { AttachmentField } from "../components/AttachmentField";
import { LogWorkView } from "../components/LogWorkView";
import { takeLogWorkRequest, type LogWorkRequest } from "../logWorkRequest";
import {
  checkLog,
  DAY,
  DEFAULT_START,
  defaultSlot,
  durationOf,
  findSameEntry,
  isoAt,
  loggableProjects,
  overtimeTag,
  recentDays,
  spanOn,
  workErrorText,
  workHoursOf,
} from "../model";
import { useAttachment } from "../useAttachment";

function close() {
  if (router.canGoBack()) router.back();
  else router.replace("/today");
}

/** Logging work (also where a stopped timer lands), or editing an entry. */
export function LogWorkScreen() {
  const [request] = useState<LogWorkRequest>(takeLogWorkRequest);
  const today = companyToday();
  const firstDay = request.edit ? dayKey(request.edit.startedAt) : (request.date ?? today);
  const projects = useMyProjects();
  const settings = useDomainSettings("design");
  const day = useMyDay(firstDay);
  const schedule = useMySchedule(firstDay);
  const title = request.edit ? "Edit work entry" : "Log work";

  const queries = [projects, settings, day, schedule];
  const failed = queries.find((q) => q.isError && !q.data)?.error;
  const ready = projects.data && settings.data && day.data && schedule.data;

  return (
    <Screen header={<ScreenHeader title={title} onBack={close} />}>
      {failed ? (
        <LoadError
          what="your day"
          message={toApiError(failed).message}
          traceId={toApiError(failed).traceId}
          onRetry={() => queries.forEach((q) => void q.refetch())}
        />
      ) : !ready ? (
        <Skeleton lines={8} height={18} />
      ) : (
        <LogWorkForm
          request={request}
          firstDay={firstDay}
          today={today}
          projects={projects.data}
          settings={settings.data}
          firstDayEntries={day.data.entries}
          dayStart={workHoursOf(schedule.data.day)?.s ?? DEFAULT_START}
        />
      )}
    </Screen>
  );
}

type FormProps = {
  request: LogWorkRequest;
  firstDay: string;
  today: string;
  projects: MyProject[];
  settings: DomainSettings;
  firstDayEntries: WorkEntry[];
  dayStart: number;
};

/** Where the sheet opens: an edited entry where it is, given times as given, else the day's first free time. */
function firstSlot(
  request: LogWorkRequest,
  day: string,
  today: string,
  entries: WorkEntry[],
  dayStart: number,
): { start: number; end: number } {
  if (request.edit) {
    const start = minutesOfDay(request.edit.startedAt);
    return { start, end: (start + request.edit.minutes) % DAY };
  }
  if (request.startMin != null && request.endMin != null) {
    return { start: request.startMin, end: request.endMin % DAY };
  }
  const slot = defaultSlot(
    entries.map((e) => spanOn(e, day)),
    dayStart,
    day === today,
    minutesOfDay(new Date()),
  );
  return { start: slot.s, end: (slot.s + slot.d) % DAY };
}

function LogWorkForm({
  request,
  firstDay,
  today,
  projects,
  settings,
  firstDayEntries,
  dayStart,
}: FormProps) {
  const me = useCurrentUser();
  const perms = usePermissions();
  const edit = request.edit ?? null;
  const choices = loggableProjects(projects, edit?.project.id);
  const [initial] = useState(() => firstSlot(request, firstDay, today, firstDayEntries, dayStart));
  const [projectId, setProjectId] = useState<number | null>(
    edit?.project.id ?? request.projectId ?? choices[0]?.id ?? null,
  );
  const [date, setDate] = useState(firstDay);
  const [startMin, setStartMin] = useState(initial.start);
  const [endMin, setEndMin] = useState(initial.end);
  const [description, setDescription] = useState(edit?.description ?? request.description ?? "");
  const [touched, setTouched] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const attachment = useAttachment(edit?.attachment ?? null);
  const save = useSaveEntry();
  const undoLog = useDeleteEntry();
  const undoEdit = useSaveEntry();
  const day = useMyDay(date);

  const duration = durationOf(startMin, endMin);
  const startedAt = isoAt(date, startMin);
  const endedAt = isoAt(date, startMin + duration);
  const others = (day.data?.entries ?? []).filter((e) => e.id !== edit?.id);
  const project = projects.find((p) => p.id === projectId);
  const preview = useOvertimePreview(
    duration > 0 ? { startedAt, endedAt, entryId: edit?.id ?? null } : null,
  );

  const needsDescription = settings.requireDescription && !description.trim();
  const check = checkLog({
    projectId,
    day: date,
    startMin,
    duration,
    others,
    ignoreId: edit?.id,
    allowFuture: settings.allowFutureEntries,
    allowOverlap: settings.allowOverlap,
  });
  // A project that stopped taking work (the timer ran on it) has to be picked again.
  const unlisted = !edit && projectId != null && !choices.some((c) => c.id === projectId);
  const problem =
    check ??
    saveError ??
    (unlisted ? "This project isn't taking new work now. Pick another." : null);
  const blocked = !!check || unlisted || needsDescription || attachment.uploading;

  function saved(entry: WorkEntry) {
    if (request.runId) removeRun(me.id, request.runId);
    const title = project?.title ?? entry.project.title;
    const sub = `${fmtDayDate(startedAt)} · ${fmtRange(startedAt, endedAt)}`;
    if (edit) {
      const before = entryBody(edit);
      toast({
        text: "Entry updated",
        sub: `${title} · ${sub}`,
        icon: "checkCircle",
        actionLabel: "Undo",
        action: () => undoEdit.mutate({ id: edit.id, body: before }),
      });
    } else {
      toast({
        text: `${fmtDur(entry.minutes)} logged on ${title}`,
        sub,
        icon: "checkCircle",
        actionLabel: "Undo",
        action: () => undoLog.mutate(entry.id),
      });
    }
    close();
  }

  async function submit() {
    setTouched(true);
    setSaveError(null);
    if (blocked || projectId == null) return;
    const body = {
      projectId,
      description: description.trim(),
      startedAt,
      endedAt,
      attachmentFileId: attachment.file?.id ?? null,
    };
    try {
      saved(await save.mutateAsync({ id: edit?.id, body }));
    } catch (error) {
      const apiError = toApiError(error);
      // A log whose answer was lost and was sent again overlaps itself: if the day holds this exact entry,
      // the first try saved it.
      if (!edit && apiError.code === "entry_overlaps") {
        setChecking(true);
        try {
          const same = findSameEntry((await fetchMyDay(date)).entries, body);
          if (same) {
            saved(same);
            return;
          }
        } catch {
          // keep the overlap message
        } finally {
          setChecking(false);
        }
      }
      setSaveError(workErrorText(apiError));
    }
  }

  function switchToTimer() {
    if (!project) return;
    startTimer({
      userId: me.id,
      projectId: project.id,
      projectTitle: project.title,
      description: description.trim(),
    });
    close();
  }

  const canUseTimer =
    !edit && settings.timerEnabled && perms.has(P.WORK_ENTRY_CREATE) && !!project?.acceptsWork;

  return (
    <LogWorkView
      projectOptions={choices.map((p) => ({ value: p.id, label: p.title }))}
      projectId={projectId}
      onProjectChange={(id) => {
        setProjectId(id);
        setSaveError(null);
      }}
      days={recentDays(today)}
      date={date}
      onDateChange={(next) => {
        setDate(next);
        setSaveError(null);
      }}
      startMin={startMin}
      endMin={endMin}
      onStartChange={(minutes) => {
        // Moving the start keeps the length, as the web's time range does.
        setEndMin((minutes + duration) % DAY);
        setStartMin(minutes);
        setSaveError(null);
      }}
      onEndChange={(minutes) => {
        setEndMin(minutes);
        setSaveError(null);
      }}
      duration={duration}
      endsNextDay={startMin + duration >= DAY}
      block={{ start: startedAt, end: endedAt }}
      others={others.map((e) => ({ start: e.startedAt, end: e.endedAt }))}
      now={date === today ? new Date() : undefined}
      overtime={preview ? overtimeTag(preview) : null}
      overtimeMinutes={preview?.overtimeMinutes ?? 0}
      description={description}
      onDescriptionChange={setDescription}
      descriptionRequired={settings.requireDescription}
      descriptionError={touched && needsDescription ? "Say what you worked on." : undefined}
      shortTimer={request.shortTimer}
      attachment={
        <AttachmentField
          photo={attachment.photo}
          uploading={attachment.uploading}
          error={attachment.error}
          onCamera={() => void attachment.pick("camera")}
          onLibrary={() => void attachment.pick("library")}
          onRemove={attachment.remove}
        />
      }
      problem={problem}
      saving={save.isPending || checking}
      editing={!!edit}
      onSave={() => void submit()}
      onUseTimer={canUseTimer ? switchToTimer : undefined}
    />
  );
}
