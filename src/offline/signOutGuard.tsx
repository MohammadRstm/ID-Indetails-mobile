import { useState, type ReactElement } from "react";
import { useCurrentUser, useSession } from "@/auth/session";
import { Button, ConfirmDialog, InlineError, Sheet, Text } from "@/ui";
import { isUnsent } from "./model";
import { deleteRecords, reloadOutbox, useOutbox } from "./outbox";
import { requestSync } from "./sync";
import { useIsOnline } from "./useOnline";

/*
 * Signing out on the phone (phase-0-plan.md section 10, "Signing out with unsent records"). With records not yet
 * sent, it first asks: send them now, or sign out and delete them (asked twice), or cancel. What the phone kept
 * for the person is removed by the cleanup in src/live/signOutCleanup.ts when the session signs out. (The API
 * removes the phone's push registration with the session.)
 */

export type UnsentRecordsGuard = {
  /** Signs out, asking first when records haven't been sent. */
  signOut: () => Promise<void>;
  /** The questions; render it once next to the sign-out button. */
  dialog: ReactElement;
};

export function useUnsentRecordsGuard(): UnsentRecordsGuard {
  const me = useCurrentUser();
  const session = useSession();
  const online = useIsOnline();
  const unsent = useOutbox(me.id).filter(isUnsent);
  const [asking, setAsking] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  async function leave() {
    setBusy(true);
    await session.signOut();
  }

  async function signOut() {
    if (unsent.length === 0) return leave();
    setProblem(null);
    setAsking(true);
  }

  async function sendNow() {
    setBusy(true);
    setProblem(null);
    await requestSync();
    setBusy(false);
    // Read afresh: the count above is from before the run.
    const left = (await reloadOutbox()).filter((r) => r.userId === me.id && isUnsent(r)).length;
    if (left === 0) await leave();
    else
      setProblem(`${left} still couldn't be sent. Check them in Pending records, or delete them.`);
  }

  const count = unsent.length;
  const dialog = (
    <>
      <Sheet
        visible={asking && !confirmingDelete}
        onClose={() => setAsking(false)}
        title={`${count} record${count === 1 ? " hasn't" : "s haven't"} been sent yet`}
        footer={
          <Button label="Cancel" variant="quiet" onPress={() => setAsking(false)} disabled={busy} />
        }
      >
        <Text tone="secondary">
          Materials or labour weeks you recorded are still only on this phone.
        </Text>
        {problem ? <InlineError message={problem} /> : null}
        <Button
          label="Send now"
          icon="send"
          variant="primary"
          fullWidth
          disabled={!online}
          loading={busy}
          onPress={() => void sendNow()}
        />
        {!online ? (
          <Text variant="small" tone="muted">
            You’re offline. Sending needs a connection.
          </Text>
        ) : null}
        <Button
          label="Sign out and delete them"
          variant="danger"
          fullWidth
          disabled={busy}
          onPress={() => setConfirmingDelete(true)}
        />
      </Sheet>
      <ConfirmDialog
        visible={confirmingDelete}
        title={`Delete ${count} record${count === 1 ? "" : "s"}?`}
        message="They were never sent, so they will be lost."
        confirmLabel="Delete and sign out"
        destructive
        busy={busy}
        onCancel={() => setConfirmingDelete(false)}
        onConfirm={async () => {
          await deleteRecords(unsent.map((r) => r.id));
          await leave();
        }}
      />
    </>
  );

  return { signOut, dialog };
}
