/*
 * Work that must wait until the person has unlocked the app, such as opening the screen of a tapped push
 * (phase-0-plan.md section 9: restore the session, unlock, then route). The lock opens and closes the gate.
 */

let open = false;
let waiting: (() => void)[] = [];

/**
 * Runs `task` now when the app is unlocked and signed in, otherwise as soon as it is. Dropped if the person is
 * signed out first.
 */
export function afterUnlock(task: () => void): void {
  if (open) task();
  else waiting.push(task);
}

/** The lock's side: open runs what waited; closed holds new work. */
export function setUnlockGate(state: "open" | "closed"): void {
  open = state === "open";
  if (!open) return;
  const tasks = waiting;
  waiting = [];
  tasks.forEach((task) => task());
}

/** Signed out: nothing that waited may act for the next person. */
export function dropWaitingTasks(): void {
  waiting = [];
}
