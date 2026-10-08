import { startTimerActivity, stopTimerActivity } from "./liveActivity";
import type { RunningTimer, StoppedRun } from "./model";
import { clearTimerNotification, showTimerNotification } from "./notifications";
import { saveRunning, saveStopped } from "./store";

/*
 * Starting and stopping need no network: the state is saved on the phone first, then the notification and the
 * lock-screen timer follow. A notification that can't be shown (permission refused) never stops the timer.
 */

export function startTimer(input: Omit<RunningTimer, "startedAt">): RunningTimer {
  const timer: RunningTimer = { ...input, startedAt: new Date().toISOString() };
  saveRunning(timer);
  showTimerNotification(timer).catch(() => undefined);
  startTimerActivity({
    projectId: timer.projectId,
    projectTitle: timer.projectTitle,
    description: timer.description,
    startedAt: timer.startedAt,
  }).catch(() => undefined);
  return timer;
}

/** Stops the person's timer; the run is kept as "time to log" until it is logged or discarded. */
export function stopTimer(userId: number): StoppedRun | null {
  const run = saveStopped(userId, new Date().toISOString());
  clearTimerNotification().catch(() => undefined);
  stopTimerActivity().catch(() => undefined);
  return run;
}
