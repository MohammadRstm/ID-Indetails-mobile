import NetInfo from "@react-native-community/netinfo";
import type { QueryClient } from "@tanstack/react-query";
import { AppState } from "react-native";
import { toApiError } from "@/api/errors";
import { http } from "@/api/http";
import { registerBackgroundSync } from "./background";
import { classify, expired, isDue, nextState, type OutboxRecord, type SendOutcome } from "./model";
import { allRecords, deleteRecords, reloadOutbox, saveRecord } from "./outbox";

/*
 * The outbox sync engine (phase-0-plan.md section 11). It sends one record at a time, oldest first, only the
 * signed-in owner's, with their session. It runs right after a record is saved, when the network comes back,
 * when the app returns to the foreground, on a timer while records wait, and in the background (Phase 5).
 */

/** Sends one record; a duplicate send is harmless (materials carry their clientRef, weeks are a no-op). */
export async function sendRecord(record: OutboxRecord): Promise<SendOutcome> {
  // A 429 is answered here rather than thrown, so its Retry-After can be read.
  const config = { validateStatus: (status: number) => status < 400 || status === 429 };
  try {
    const response =
      record.kind === "materials"
        ? await http.post(
            `/projects/${record.projectId}/materials`,
            { items: record.payload.items },
            config,
          )
        : await http.put(
            `/projects/${record.projectId}/labour-weeks/${record.weekStart}`,
            {
              days: record.payload.days,
              note: record.payload.note,
              expectedVersion: record.payload.expectedVersion,
            },
            config,
          );
    if (response.status === 429) {
      const retryAfter = Number(response.headers["retry-after"]);
      return {
        type: "rate_limited",
        retryAfterMs: Number.isFinite(retryAfter) && retryAfter >= 0 ? retryAfter * 1000 : null,
      };
    }
    return { type: "sent" };
  } catch (error) {
    return classify(toApiError(error));
  }
}

type Engine = { userId: number; queryClient: QueryClient };

let engine: Engine | null = null;
let paused = false;
let running: Promise<void> | null = null;
let wakeTimer: ReturnType<typeof setTimeout> | null = null;

function afterSent(record: OutboxRecord, queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: ["projects"] });
  void queryClient.invalidateQueries({
    queryKey: [record.kind === "materials" ? "materials" : "labour", record.projectId],
  });
}

function scheduleWake(records: OutboxRecord[]) {
  if (wakeTimer) clearTimeout(wakeTimer);
  wakeTimer = null;
  const next = records
    .filter((r) => r.status === "pending" && r.nextAttemptAt != null)
    .map((r) => r.nextAttemptAt as number)
    .sort((a, b) => a - b)[0];
  if (next == null || paused) return;
  wakeTimer = setTimeout(() => void runSync(), Math.max(1000, next - Date.now()));
}

async function runOnce(current: Engine) {
  const queued = (await allRecords())
    .filter((r) => r.userId === current.userId && isDue(r, Date.now()))
    .sort((a, b) => a.createdAt - b.createdAt);

  for (const { id } of queued) {
    if (engine !== current || paused) return;
    // Read again: while earlier records were sending, this one may have been edited or discarded.
    const record = (await allRecords()).find((r) => r.id === id);
    if (!record || !isDue(record, Date.now())) continue;
    await saveRecord({ ...record, status: "sending", updatedAt: Date.now() });
    const outcome = await sendRecord(record);
    const next = nextState(record, outcome, Date.now());
    await saveRecord(next.record);
    if (outcome.type === "sent") afterSent(record, current.queryClient);
    if (next.pauseQueue) paused = true;
    if (next.stopRun) break;
  }
}

/** Sends what is due now; resolves when this run is over. Runs never overlap. */
export function runSync(): Promise<void> {
  const current = engine;
  if (!current || paused) return Promise.resolve();
  running ??= runOnce(current)
    .catch(() => undefined)
    .finally(async () => {
      running = null;
      if (engine === current) scheduleWake(await allRecords());
    });
  return running;
}

/** Asks for a run soon: after a record is saved, or when someone taps "Send now". */
export function requestSync(): Promise<void> {
  return runSync();
}

/**
 * Starts the engine for the signed-in person; the returned function stops it (sign-out, or someone else signing
 * in). A record left "sending" by an app that was killed mid-send goes back to waiting: sending it again is safe.
 */
export function startSyncEngine(userId: number, queryClient: QueryClient): () => void {
  const current: Engine = { userId, queryClient };
  engine = current;
  paused = false;

  void (async () => {
    const records = await reloadOutbox();
    await deleteRecords(expired(records, userId, Date.now()));
    for (const r of records) {
      if (r.userId === userId && r.status === "sending") {
        await saveRecord({ ...r, status: "pending", nextAttemptAt: null });
      }
    }
    await runSync();
  })();

  const netinfo = NetInfo.addEventListener((state) => {
    if (state.isConnected) void runSync();
  });
  const appState = AppState.addEventListener("change", (state) => {
    if (state === "active") void runSync();
  });
  registerBackgroundSync(runSync).catch(() => undefined);

  return () => {
    netinfo();
    appState.remove();
    if (wakeTimer) clearTimeout(wakeTimer);
    wakeTimer = null;
    if (engine === current) engine = null;
  };
}

/** Whether the engine stopped because the session was refused; it starts again with the next sign-in. */
export function isSyncPaused(): boolean {
  return paused;
}
