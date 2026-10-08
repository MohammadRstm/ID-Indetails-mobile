/** What the lock screen shows while the timer runs. */
export type TimerActivity = {
  projectId: number;
  projectTitle: string;
  description: string;
  /** UTC ISO string: the running time is always now minus this. */
  startedAt: string;
};

/** Slot: the lock-screen timer (Live Activity, foreground service). Phase 2 calls it on start; Phase 5 fills it in. */
export async function startTimerActivity(timer: TimerActivity): Promise<void> {}

/** Slot: ends the lock-screen timer. Phase 2 calls it on stop; Phase 5 fills it in. */
export async function stopTimerActivity(): Promise<void> {}
