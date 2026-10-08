import { http } from "@/api/http";
import type { LabourWeek } from "@/api/types";
import type { LabourRecord, OutboxRecord } from "./model";
import { deleteRecords, saveRecord } from "./outbox";
import { requestSync } from "./sync";

/*
 * What a person can do with a record that needs attention (phase-0-plan.md section 10, "Conflicts").
 */

/** The week as it is on the server now, to show next to the phone's version. */
export async function fetchCurrentWeek(record: LabourRecord): Promise<LabourWeek> {
  return (
    await http.get<LabourWeek>(`/projects/${record.projectId}/labour-weeks/${record.weekStart}`)
  ).data;
}

/** "Use mine": sends the phone's week again, against the version the server has now. */
export async function resendMine(record: LabourRecord, currentVersion: string): Promise<void> {
  await saveRecord({
    ...record,
    payload: { ...record.payload, expectedVersion: currentVersion },
    status: "pending",
    attempts: 0,
    nextAttemptAt: null,
    lastErrorCode: null,
    lastErrorMessage: null,
    updatedAt: Date.now(),
  });
  void requestSync();
}

/** "Keep theirs", or discarding a record that can't be sent: it is deleted from the phone. */
export async function discardRecord(record: OutboxRecord): Promise<void> {
  await deleteRecords([record.id]);
}
