import { Platform } from "react-native";

/** What the lock screen shows while the timer runs. */
export type TimerActivity = {
  projectId: number;
  projectTitle: string;
  description: string;
  /** UTC ISO string: the running time is always now minus this. */
  startedAt: string;
};

/*
 * The lock-screen timer. iPhone shows a Live Activity (expo-widgets, needs the native build); Android does
 * nothing here because Phase 2's ongoing notification already covers it. Anything unsupported is a no-op:
 * the timer itself never depends on this. The native modules load only on iPhone.
 */

function logFailure(where: string, error: unknown) {
  const name = error instanceof Error ? error.name : typeof error;
  console.warn(`Timer activity: ${where} failed (${name}).`);
}

// Loaded on demand so Android never loads the iPhone-only native modules.
function loadTimerActivity(): typeof import("@/features/widgets/timerActivity") {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require("@/features/widgets/timerActivity");
}

export async function startTimerActivity(timer: TimerActivity): Promise<void> {
  if (Platform.OS !== "ios") return;
  try {
    const { timerActivity } = loadTimerActivity();
    await timerActivity.start(timer);
  } catch (error) {
    logFailure("starting", error);
  }
}

export async function stopTimerActivity(): Promise<void> {
  if (Platform.OS !== "ios") return;
  try {
    const { timerActivity } = loadTimerActivity();
    await timerActivity.stop();
  } catch (error) {
    logFailure("stopping", error);
  }
}
