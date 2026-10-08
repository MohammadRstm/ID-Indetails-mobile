import { z } from "zod";
import type { ApiError } from "@/api/errors";

/*
 * The outbox of records made on the phone and not yet sent (phase-0-plan.md sections 10 and 11): materials and
 * labour weeks. Everything here is pure: what a record is, how a send's outcome changes it, and when it is
 * tried again. The SQLite table and the sync engine are built on it.
 */

export type OutboxKind = "materials" | "labour_week";
export type OutboxStatus = "pending" | "sending" | "sent" | "needs_attention";

const text = (max: number) => z.string().trim().max(max);
const optionalText = (max: number) => text(max).nullable();
const amount = z.number().nonnegative().nullable();

export const materialItemSchema = z.object({
  /** Given once when the material is made on the phone; it never changes through retries (DB-3). */
  clientRef: z.uuid(),
  name: text(200).min(1),
  quantity: amount,
  unit: optionalText(40),
  unitCost: amount,
  amount: amount,
  supplier: optionalText(200),
  note: optionalText(1000),
});

export const materialsPayloadSchema = z.object({
  projectTitle: z.string(),
  items: z.array(materialItemSchema).min(1).max(100),
});

export const labourDaySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  workers: z.number().int().min(0).max(1000),
  dailyPay: z.number().min(0),
});

export const labourPayloadSchema = z.object({
  projectTitle: z.string(),
  days: z.array(labourDaySchema).max(6),
  note: optionalText(2000),
  /** The version the week had when the phone loaded it ("0" when it wasn't reported). */
  expectedVersion: z.string().min(1),
});

export type MaterialItem = z.infer<typeof materialItemSchema>;
export type MaterialsPayload = z.infer<typeof materialsPayloadSchema>;
export type LabourDay = z.infer<typeof labourDaySchema>;
export type LabourPayload = z.infer<typeof labourPayloadSchema>;

type RecordBase = {
  id: string;
  /** The owner: only their session ever sends or sees it. */
  userId: number;
  projectId: number;
  status: OutboxStatus;
  attempts: number;
  /** Epoch milliseconds; null when it isn't waiting to be tried again. */
  nextAttemptAt: number | null;
  lastErrorCode: string | null;
  lastErrorMessage: string | null;
  createdAt: number;
  updatedAt: number;
};

export type MaterialsRecord = RecordBase & {
  kind: "materials";
  weekStart: null;
  payload: MaterialsPayload;
};
export type LabourRecord = RecordBase & {
  kind: "labour_week";
  weekStart: string;
  payload: LabourPayload;
};
export type OutboxRecord = MaterialsRecord | LabourRecord;

/** What became of one attempt to send a record. */
export type SendOutcome =
  | { type: "sent" }
  /** No connection, a timeout, or the server failing: try again later. */
  | { type: "retry" }
  | { type: "rate_limited"; retryAfterMs: number | null }
  /** Refused even after a refresh: the session has ended, the whole queue waits for sign-in. */
  | { type: "unauthorized" }
  /** The API said no (400, 403, 404, 409, 422): a person has to look at it. */
  | { type: "refused"; status: number; code: string; message: string };

/** Sorts a failed send into what happens next. */
export function classify(error: ApiError, retryAfterSeconds?: number | null): SendOutcome {
  if (error.status === 0 || error.status === -1 || error.status >= 500) return { type: "retry" };
  if (error.status === 401) return { type: "unauthorized" };
  if (error.status === 429) {
    return {
      type: "rate_limited",
      retryAfterMs:
        retryAfterSeconds != null && retryAfterSeconds >= 0 ? retryAfterSeconds * 1000 : null,
    };
  }
  return { type: "refused", status: error.status, code: error.code, message: error.message };
}

const BACKOFF_MS = [5_000, 30_000, 120_000, 600_000];

/** How long to wait after the nth failed attempt (1-based): 5 s, 30 s, 2 min, 10 min, then every 10 min. */
export function backoffMs(attempts: number): number {
  return BACKOFF_MS[Math.min(Math.max(attempts, 1), BACKOFF_MS.length) - 1];
}

/** The record after an attempt, and whether the whole queue must stop. */
export function nextState(
  record: OutboxRecord,
  outcome: SendOutcome,
  now: number,
): { record: OutboxRecord; pauseQueue: boolean; stopRun: boolean } {
  const base = { ...record, updatedAt: now };
  switch (outcome.type) {
    case "sent":
      return {
        record: {
          ...base,
          status: "sent",
          nextAttemptAt: null,
          lastErrorCode: null,
          lastErrorMessage: null,
        },
        pauseQueue: false,
        stopRun: false,
      };
    case "retry": {
      const attempts = record.attempts + 1;
      return {
        record: {
          ...base,
          status: "pending",
          attempts,
          nextAttemptAt: now + backoffMs(attempts),
          lastErrorCode: "network_error",
          lastErrorMessage: null,
        },
        pauseQueue: false,
        // Without a connection the next record would fail the same way.
        stopRun: true,
      };
    }
    case "rate_limited": {
      const attempts = record.attempts + 1;
      return {
        record: {
          ...base,
          status: "pending",
          attempts,
          nextAttemptAt: now + (outcome.retryAfterMs ?? backoffMs(attempts)),
          lastErrorCode: "too_many_requests",
          lastErrorMessage: null,
        },
        pauseQueue: false,
        stopRun: true,
      };
    }
    case "unauthorized":
      // Not the record's fault: it goes back to waiting, untouched, until its owner signs in again.
      return {
        record: { ...base, status: "pending", nextAttemptAt: null },
        pauseQueue: true,
        stopRun: true,
      };
    case "refused":
      return {
        record: {
          ...base,
          status: "needs_attention",
          attempts: record.attempts + 1,
          nextAttemptAt: null,
          lastErrorCode: outcome.code,
          lastErrorMessage: outcome.message,
        },
        pauseQueue: false,
        stopRun: false,
      };
  }
}

/** Whether a record is due to be sent now. */
export function isDue(record: OutboxRecord, now: number): boolean {
  return (
    record.status === "pending" && (record.nextAttemptAt == null || record.nextAttemptAt <= now)
  );
}

/** Records not yet on the server: what the sign-out guard counts. */
export function isUnsent(record: OutboxRecord): boolean {
  return record.status !== "sent";
}

export const SENT_KEPT_MS = 7 * 24 * 60 * 60_000;
export const ORPHAN_KEPT_MS = 30 * 24 * 60 * 60_000;

/**
 * Records to delete: sent ones after 7 days, and those left on the phone by someone other than the signed-in
 * person after 30 days (a shared phone).
 */
export function expired(records: OutboxRecord[], userId: number, now: number): string[] {
  return records
    .filter((r) =>
      r.userId === userId
        ? r.status === "sent" && now - r.updatedAt > SENT_KEPT_MS
        : now - r.updatedAt > ORPHAN_KEPT_MS,
    )
    .map((r) => r.id);
}

/** Why a record needs attention, in words for the person who made it. */
export function attentionText(record: OutboxRecord): string {
  switch (record.lastErrorCode) {
    case "labour_week_changed":
      return "Someone changed this week after you opened it.";
    case "project_locked":
      return "The site was completed or archived, so nothing more can be added to it.";
    case "forbidden":
      return "You're no longer allowed to record this.";
    case "not_found":
      return "This site can no longer be seen.";
    default:
      return record.lastErrorMessage || "The server didn't accept this.";
  }
}

/** The state shown on each record: Waiting for connection, Sending, Sent, Needs attention. */
export function statusLabel(record: OutboxRecord): string {
  switch (record.status) {
    case "pending":
      return "Waiting for connection";
    case "sending":
      return "Sending";
    case "sent":
      return "Sent";
    case "needs_attention":
      return "Needs attention";
  }
}
