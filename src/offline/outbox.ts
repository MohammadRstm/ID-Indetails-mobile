import { randomUUID } from "expo-crypto";
import { openDatabaseAsync, type SQLiteDatabase } from "expo-sqlite";
import { useEffect, useSyncExternalStore } from "react";
import {
  labourPayloadSchema,
  materialsPayloadSchema,
  type LabourPayload,
  type LabourRecord,
  type MaterialsPayload,
  type MaterialsRecord,
  type OutboxRecord,
} from "./model";

/*
 * The outbox table in the phone's SQLite database (phase-0-plan.md section 10), and a small store that lets
 * screens follow it. Payloads are checked with Zod when written and when read; a row that fails the check is
 * dropped rather than sent.
 */

type Row = {
  id: string;
  user_id: number;
  kind: string;
  project_id: number;
  week_start: string | null;
  payload: string;
  photos: string | null;
  status: string;
  attempts: number;
  next_attempt_at: number | null;
  last_error_code: string | null;
  last_error_message: string | null;
  created_at: number;
  updated_at: number;
};

const SCHEMA = `
CREATE TABLE IF NOT EXISTS outbox (
  id TEXT PRIMARY KEY NOT NULL,
  user_id INTEGER NOT NULL,
  kind TEXT NOT NULL,
  project_id INTEGER NOT NULL,
  week_start TEXT,
  payload TEXT NOT NULL,
  photos TEXT,
  status TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  next_attempt_at INTEGER,
  last_error_code TEXT,
  last_error_message TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS outbox_user ON outbox (user_id, created_at);
`;

let opened: Promise<SQLiteDatabase> | null = null;

function database(): Promise<SQLiteDatabase> {
  opened ??= openDatabaseAsync("outbox.db").then(async (db) => {
    await db.execAsync(SCHEMA);
    return db;
  });
  return opened;
}

const STATUSES = ["pending", "sending", "sent", "needs_attention"] as const;

function fromRow(row: Row): OutboxRecord | null {
  const status = STATUSES.find((s) => s === row.status);
  if (!status) return null;
  const base = {
    id: row.id,
    userId: row.user_id,
    projectId: row.project_id,
    status,
    attempts: row.attempts,
    nextAttemptAt: row.next_attempt_at,
    lastErrorCode: row.last_error_code,
    lastErrorMessage: row.last_error_message,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
  try {
    const json: unknown = JSON.parse(row.payload);
    if (row.kind === "materials") {
      const payload = materialsPayloadSchema.safeParse(json);
      return payload.success
        ? { ...base, kind: "materials", weekStart: null, payload: payload.data }
        : null;
    }
    if (row.kind === "labour_week" && row.week_start) {
      const payload = labourPayloadSchema.safeParse(json);
      return payload.success
        ? { ...base, kind: "labour_week", weekStart: row.week_start, payload: payload.data }
        : null;
    }
  } catch {
    // unreadable JSON: dropped below
  }
  return null;
}

async function readAll(): Promise<OutboxRecord[]> {
  const db = await database();
  const rows = await db.getAllAsync<Row>("SELECT * FROM outbox ORDER BY created_at, id");
  const records: OutboxRecord[] = [];
  const broken: string[] = [];
  for (const row of rows) {
    const record = fromRow(row);
    if (record) records.push(record);
    else broken.push(row.id);
  }
  for (const id of broken) await db.runAsync("DELETE FROM outbox WHERE id = ?", [id]);
  return records;
}

// ---------- the store screens follow ----------

let snapshot: OutboxRecord[] = [];
let loaded = false;
const listeners = new Set<() => void>();

/** Reads the table again and tells everyone following it. */
export async function reloadOutbox(): Promise<OutboxRecord[]> {
  snapshot = await readAll();
  loaded = true;
  listeners.forEach((listener) => listener());
  return snapshot;
}

/** Every record, whoever made it (the sync engine filters by owner). */
export async function allRecords(): Promise<OutboxRecord[]> {
  return loaded ? snapshot : reloadOutbox();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The signed-in person's records, oldest first. Other people's records on the phone are never shown. */
export function useOutbox(userId: number): OutboxRecord[] {
  const all = useSyncExternalStore(subscribe, () => snapshot);
  useEffect(() => {
    if (!loaded) void reloadOutbox();
  }, []);
  return all.filter((r) => r.userId === userId);
}

// ---------- writing ----------

async function insert(record: OutboxRecord) {
  const db = await database();
  await db.runAsync(
    `INSERT INTO outbox (id, user_id, kind, project_id, week_start, payload, photos, status, attempts,
       next_attempt_at, last_error_code, last_error_message, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?)`,
    [
      record.id,
      record.userId,
      record.kind,
      record.projectId,
      record.weekStart,
      JSON.stringify(record.payload),
      record.status,
      record.attempts,
      record.nextAttemptAt,
      record.lastErrorCode,
      record.lastErrorMessage,
      record.createdAt,
      record.updatedAt,
    ],
  );
}

/** Saves a record's state and payload. */
export async function saveRecord(record: OutboxRecord): Promise<void> {
  const db = await database();
  await db.runAsync(
    `UPDATE outbox SET payload = ?, status = ?, attempts = ?, next_attempt_at = ?, last_error_code = ?,
       last_error_message = ?, updated_at = ? WHERE id = ?`,
    [
      JSON.stringify(record.payload),
      record.status,
      record.attempts,
      record.nextAttemptAt,
      record.lastErrorCode,
      record.lastErrorMessage,
      record.updatedAt,
      record.id,
    ],
  );
  await reloadOutbox();
}

export async function deleteRecords(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const db = await database();
  for (const id of ids) await db.runAsync("DELETE FROM outbox WHERE id = ?", [id]);
  await reloadOutbox();
}

function fresh(userId: number, projectId: number, now: number) {
  return {
    id: randomUUID(),
    userId,
    projectId,
    status: "pending" as const,
    attempts: 0,
    nextAttemptAt: null,
    lastErrorCode: null,
    lastErrorMessage: null,
    createdAt: now,
    updatedAt: now,
  };
}

/** Puts a batch of materials in the outbox at once: one row per batch. */
export async function addMaterials(
  userId: number,
  projectId: number,
  payload: MaterialsPayload,
): Promise<MaterialsRecord> {
  const record: MaterialsRecord = {
    ...fresh(userId, projectId, Date.now()),
    kind: "materials",
    weekStart: null,
    payload: materialsPayloadSchema.parse(payload),
  };
  await insert(record);
  await reloadOutbox();
  return record;
}

/**
 * Puts a labour week in the outbox. A week has at most one unsent row per project: a newer edit replaces one
 * that is waiting or needs attention (one already being sent is left to finish, and the edit follows it).
 */
export async function putLabourWeek(
  userId: number,
  projectId: number,
  weekStart: string,
  payload: LabourPayload,
): Promise<LabourRecord> {
  const checked = labourPayloadSchema.parse(payload);
  const now = Date.now();
  const existing = (await allRecords()).find(
    (r): r is LabourRecord =>
      r.kind === "labour_week" &&
      r.userId === userId &&
      r.projectId === projectId &&
      r.weekStart === weekStart &&
      (r.status === "pending" || r.status === "needs_attention"),
  );
  if (existing) {
    const replaced: LabourRecord = {
      ...existing,
      payload: checked,
      status: "pending",
      attempts: 0,
      nextAttemptAt: null,
      lastErrorCode: null,
      lastErrorMessage: null,
      updatedAt: now,
    };
    await saveRecord(replaced);
    return replaced;
  }
  const record: LabourRecord = {
    ...fresh(userId, projectId, now),
    kind: "labour_week",
    weekStart,
    payload: checked,
  };
  await insert(record);
  await reloadOutbox();
  return record;
}

/** For tests: forgets the open database and the snapshot. */
export function resetOutboxForTests() {
  opened = null;
  snapshot = [];
  loaded = false;
}
