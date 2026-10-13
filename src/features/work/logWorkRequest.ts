import type { WorkEntry } from "@/api/types";

/*
 * Log work is opened from several places (Today, the timer, a stopped run, an entry, a project): whoever opens it
 * leaves what it should start with here, then navigates to /log-work, which takes it once.
 */

export type LogWorkRequest = {
  projectId?: number;
  /** "yyyy-MM-dd"; today when left out. */
  date?: string;
  startMin?: number;
  /** Past 1440 when it ends the next day. */
  endMin?: number;
  description?: string;
  /** A timer stopped before an entry's 5 minutes: how long it ran, as it is logged as 5. */
  shortTimer?: number;
  /** The stopped timer run this logs; it is removed once logged. */
  runId?: string;
  /** Editing this entry instead of logging a new one. */
  edit?: WorkEntry;
  /** What Proton filled in, by name, for the form to say so. The person still checks and saves it. */
  filledByProton?: string[];
};

let pending: LogWorkRequest | null = null;

export function requestLogWork(request: LogWorkRequest) {
  pending = request;
}

/** What the sheet opens with; asking again gives nothing, so a later plain "Log work" starts fresh. */
export function takeLogWorkRequest(): LogWorkRequest {
  const request = pending ?? {};
  pending = null;
  return request;
}
