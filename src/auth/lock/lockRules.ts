/*
 * When the app locks (phase-0-plan.md section 7, decision 11): on a cold start, and on returning after more than
 * 5 minutes in the background. Brief trips away (a call, the app switcher, the unlock prompt itself) don't lock.
 */

export const RELOCK_AFTER_MS = 5 * 60_000;

/** After this many unlocks that didn't work, the lock screen offers to sign out instead. */
export const FAILURES_BEFORE_SIGN_OUT = 2;

export function locksOnReturn(backgroundedAt: number | null, now: number): boolean {
  return backgroundedAt !== null && now - backgroundedAt >= RELOCK_AFTER_MS;
}
