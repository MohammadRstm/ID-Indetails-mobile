import { router } from "expo-router";
import { Fragment, useState } from "react";
import { toApiError } from "@/api/errors";
import type { LabourWeek } from "@/api/types";
import { useCurrentUser } from "@/auth/session";
import { LabourConflictSheet } from "@/features/labour/components/LabourConflictSheet";
import { requestMaterialsCopy } from "@/features/materials/draft";
import { draftOf } from "@/features/materials/model";
import { fmtDate } from "@/format/time";
import type { LabourRecord, OutboxRecord } from "@/offline/model";
import { useOutbox } from "@/offline/outbox";
import { discardRecord, fetchCurrentWeek, resendMine } from "@/offline/resolve";
import { requestSync } from "@/offline/sync";
import { useIsOnline } from "@/offline/useOnline";
import { Card, ConfirmDialog, Divider } from "@/ui";
import { PendingRecordRow, recordTitle, type RecordAction } from "../components/PendingRecordRow";

type PendingRecordsListProps = {
  /** Only this site's records; every site's when left out. */
  projectId?: number;
  /** Leave out what was already sent. */
  unsentOnly?: boolean;
};

function openSent(record: OutboxRecord) {
  if (record.kind === "materials") {
    router.push({ pathname: "/projects/[id]/materials", params: { id: String(record.projectId) } });
  } else {
    router.push({
      pathname: "/projects/[id]/labour/[weekStart]",
      params: { id: String(record.projectId), weekStart: record.weekStart },
    });
  }
}

/** The person's records saved on the phone, each with what can be done about it. Nothing when there are none. */
export function PendingRecordsList({ projectId, unsentOnly }: PendingRecordsListProps) {
  const me = useCurrentUser();
  const online = useIsOnline();
  const records = useOutbox(me.id)
    .filter((r) => projectId == null || r.projectId === projectId)
    .filter((r) => !unsentOnly || r.status !== "sent")
    .reverse();
  const [discarding, setDiscarding] = useState<OutboxRecord | null>(null);
  const [conflict, setConflict] = useState<LabourRecord | null>(null);
  const [theirs, setTheirs] = useState<LabourWeek | null>(null);
  const [conflictError, setConflictError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (records.length === 0) return null;

  async function compare(record: LabourRecord) {
    setConflict(record);
    setTheirs(null);
    setConflictError(null);
    try {
      setTheirs(await fetchCurrentWeek(record));
    } catch (error) {
      setConflictError(toApiError(error).message);
    }
  }

  function actionsOf(record: OutboxRecord): RecordAction[] {
    if (record.status === "sent") return [{ label: "Open", onPress: () => openSent(record) }];
    if (record.status === "pending") {
      return online ? [{ label: "Send now", onPress: () => void requestSync() }] : [];
    }
    if (record.status !== "needs_attention") return [];
    const actions: RecordAction[] = [];
    if (record.kind === "labour_week" && record.lastErrorCode === "labour_week_changed") {
      actions.push({ label: "Compare", onPress: () => void compare(record) });
    }
    if (record.kind === "materials" && record.lastErrorCode === "project_locked") {
      actions.push({
        label: "Copy to another site",
        onPress: () => {
          requestMaterialsCopy(record.payload.items.map((item) => draftOf(item)));
          router.push("/materials/add");
        },
      });
    }
    actions.push({ label: "Discard", danger: true, onPress: () => setDiscarding(record) });
    return actions;
  }

  return (
    <>
      <Card padded={false}>
        {records.map((record, i) => (
          <Fragment key={record.id}>
            <PendingRecordRow
              record={record}
              showSite={projectId == null}
              actions={actionsOf(record)}
            />
            {i < records.length - 1 ? <Divider /> : null}
          </Fragment>
        ))}
      </Card>
      <ConfirmDialog
        visible={discarding !== null}
        title="Discard this record?"
        message={
          discarding ? `${recordTitle(discarding)} will be deleted from your phone.` : undefined
        }
        confirmLabel="Discard"
        destructive
        onCancel={() => setDiscarding(null)}
        onConfirm={() => {
          if (discarding) void discardRecord(discarding);
          setDiscarding(null);
        }}
      />
      {conflict ? (
        <LabourConflictSheet
          visible
          weekLabel={`${conflict.payload.projectTitle} · week of ${fmtDate(conflict.weekStart)}`}
          mine={{ days: conflict.payload.days, note: conflict.payload.note }}
          theirs={
            theirs
              ? {
                  days: theirs.days.map((d) => ({
                    date: d.date,
                    workers: d.workers,
                    dailyPay: d.dailyPay,
                  })),
                  note: theirs.note,
                  by: theirs.submittedBy?.name ?? null,
                }
              : null
          }
          error={conflictError}
          busy={busy}
          onClose={() => setConflict(null)}
          onKeepTheirs={() => {
            void discardRecord(conflict);
            setConflict(null);
          }}
          onUseMine={async () => {
            if (!theirs) return;
            setBusy(true);
            try {
              await resendMine(conflict, theirs.version);
              setConflict(null);
            } finally {
              setBusy(false);
            }
          }}
        />
      ) : null}
    </>
  );
}
