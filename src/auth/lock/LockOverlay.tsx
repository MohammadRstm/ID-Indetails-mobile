import { useEffect, useRef } from "react";
import { Modal, Platform } from "react-native";
import { ConfirmDialog } from "@/ui";
import { LockView } from "../components/LockView";
import { PrivacyCover } from "../components/PrivacyCover";
import { useSession } from "../session";
import { unlockName } from "./biometrics";
import { FAILURES_BEFORE_SIGN_OUT } from "./lockRules";
import { useLock } from "./LockProvider";

/**
 * Draws the lock over everything, sheets and dialogs included (a modal is the only thing above them): the lock
 * screen while locked, the privacy cover while away from the foreground, and the offer to turn the lock on.
 */
export function LockOverlay() {
  const lock = useLock();
  const { signOut } = useSession();
  const name = unlockName(lock.support?.kind ?? null, Platform.OS);
  const prompted = useRef(false);
  const { locked, covered, unavailable, unlock } = lock;

  // Each time it locks, the phone's prompt opens by itself once; after that the button asks again.
  useEffect(() => {
    if (!locked) {
      prompted.current = false;
      return;
    }
    if (covered || unavailable || prompted.current) return;
    prompted.current = true;
    void unlock();
  }, [locked, covered, unavailable, unlock]);

  return (
    <>
      <Modal
        visible={locked || covered}
        animationType="none"
        statusBarTranslucent
        // Android's back button can't leave the lock.
        onRequestClose={() => {}}
      >
        {locked ? (
          <LockView
            unlockName={name}
            onUnlock={() => void unlock()}
            onSignOut={() => void signOut()}
            unlocking={lock.unlocking}
            offerSignOut={lock.failures >= FAILURES_BEFORE_SIGN_OUT}
            unavailable={unavailable}
          />
        ) : (
          <PrivacyCover />
        )}
      </Modal>
      <ConfirmDialog
        visible={lock.offering}
        title={`Unlock with ${name}?`}
        message={`Use ${name} to open ID InDetails, so nobody else can see it on your phone. You can change this in Settings.`}
        confirmLabel={`Use ${name}`}
        cancelLabel="Not now"
        onConfirm={() => void lock.answerOffer(true)}
        onCancel={() => void lock.answerOffer(false)}
      />
    </>
  );
}
