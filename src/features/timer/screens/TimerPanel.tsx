import { router } from "expo-router";
import { useState } from "react";
import { useCurrentUser } from "@/auth/session";
import { useDomainSettings, useMyProjects } from "@/features/work/api";
import { requestLogWork } from "@/features/work/logWorkRequest";
import { loggableProjects } from "@/features/work/model";
import { P } from "@/permissions/codes";
import { usePermissions } from "@/permissions/usePermissions";
import { startTimer, stopTimer } from "../actions";
import { TimerCard } from "../components/TimerCard";
import { TimeToLogCard } from "../components/TimeToLogCard";
import { logSlotOf, type StoppedRun } from "../model";
import { removeRun, useTimerState } from "../store";

/** Opens the log sheet filled in from a stopped run. */
export function logRun(run: StoppedRun) {
  const slot = logSlotOf(run);
  requestLogWork({
    projectId: run.projectId,
    date: slot.date,
    startMin: slot.startMin,
    endMin: slot.endMin,
    shortTimer: slot.shortTimer,
    description: run.description,
    runId: run.id,
  });
  router.push("/log-work");
}

/**
 * The timer and the runs still to log, on a Design person's Today. The timer shows only while the domain's
 * `timerEnabled` is on and the person logs work; runs already stopped show either way.
 */
export function TimerPanel() {
  const me = useCurrentUser();
  const perms = usePermissions();
  const settings = useDomainSettings("design");
  const projects = useMyProjects();
  const { running, stopped } = useTimerState(me.id);
  const choices = loggableProjects(projects.data ?? []);
  const [projectId, setProjectId] = useState<number | null>(null);
  const [description, setDescription] = useState("");
  const chosen = choices.find((p) => p.id === projectId) ?? choices[0] ?? null;
  const showTimer =
    perms.has(P.WORK_ENTRY_CREATE) && (settings.data?.timerEnabled ?? false) && (running || chosen);

  return (
    <>
      {showTimer ? (
        <TimerCard
          running={running}
          projectOptions={choices.map((p) => ({ value: p.id, label: p.title }))}
          projectId={chosen?.id ?? null}
          onProjectChange={setProjectId}
          description={description}
          onDescriptionChange={setDescription}
          onStart={() => {
            if (!chosen) return;
            startTimer({
              userId: me.id,
              projectId: chosen.id,
              projectTitle: chosen.title,
              description: description.trim(),
            });
            setDescription("");
          }}
          onStop={() => {
            const run = stopTimer(me.id);
            if (run) logRun(run);
          }}
        />
      ) : null}
      {stopped.map((run) => {
        const slot = logSlotOf(run);
        return (
          <TimeToLogCard
            key={run.id}
            run={run}
            minutes={slot.endMin - slot.startMin}
            onLog={() => logRun(run)}
            onDiscard={() => removeRun(me.id, run.id)}
          />
        );
      })}
    </>
  );
}
