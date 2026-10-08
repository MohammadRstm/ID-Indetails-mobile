import * as BackgroundTask from "expo-background-task";
import * as TaskManager from "expo-task-manager";
import { tokenManager } from "@/auth/tokenManager";

/*
 * Sends the outbox in the background, when the phone lets the app run (Android and iOS decide when: at most
 * about every 15 minutes, often much less). The task is defined when this module loads, as expo-task-manager
 * requires: a background launch must find it defined before any screen mounts. It runs the sync the engine
 * registered in this process, only while a session is stored, and never fails loudly: the next foreground
 * sync catches up.
 */

export const BACKGROUND_SYNC_TASK = "idi-outbox-sync";
const MINIMUM_INTERVAL_MINUTES = 15;

let runSync: (() => Promise<void>) | null = null;

/** Logs what failed without anything personal: the error's name only, never its message or a payload. */
function logFailure(where: string, error: unknown) {
  const name = error instanceof Error ? error.name : typeof error;
  console.warn(`Background sync: ${where} failed (${name}).`);
}

export async function runBackgroundSync(): Promise<BackgroundTask.BackgroundTaskResult> {
  try {
    if (!runSync) return BackgroundTask.BackgroundTaskResult.Success;
    if (!(await tokenManager.getRefreshToken())) return BackgroundTask.BackgroundTaskResult.Success;
    await runSync();
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch (error) {
    logFailure("a run", error);
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
}

try {
  if (!TaskManager.isTaskDefined(BACKGROUND_SYNC_TASK)) {
    TaskManager.defineTask(BACKGROUND_SYNC_TASK, runBackgroundSync);
  }
} catch (error) {
  // A build without the native module (Expo Go): the app works, only without background runs.
  logFailure("defining the task", error);
}

/** Sends the outbox with `run` whenever the phone gives the app background time. Never throws. */
export async function registerBackgroundSync(run: () => Promise<void>): Promise<void> {
  runSync = run;
  try {
    const status = await BackgroundTask.getStatusAsync();
    if (status !== BackgroundTask.BackgroundTaskStatus.Available) return;
    if (await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK)) return;
    await BackgroundTask.registerTaskAsync(BACKGROUND_SYNC_TASK, {
      minimumInterval: MINIMUM_INTERVAL_MINUTES,
    });
  } catch (error) {
    logFailure("registering", error);
  }
}
