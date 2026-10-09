import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AppState, type AppStateStatus } from "react-native";
import { useSession, type SignedInWith } from "../session";
import { dropWaitingTasks, setUnlockGate } from "./afterUnlock";
import { confirmOwner, lockSupport, type LockSupport } from "./biometrics";
import { readLockPreference, saveLockPreference } from "./lockPreference";
import { locksOnReturn } from "./lockRules";

/*
 * The biometric lock (phase-0-plan.md section 7). It is a local lock, not sign-in: it locks a session restored
 * at start and one left in the background too long, and covers the app whenever it isn't in the foreground.
 * After a password sign-in it is offered once, when the phone has biometrics set up.
 */

type LockState = {
  /** The person and how their session began; a new value starts a new lock state. */
  key: string | null;
  /** The person's choice: on, off, or never asked. */
  preference: boolean | null;
  locked: boolean;
  /** Offer the lock (once a temporary password is out of the way). */
  offerPending: boolean;
  /** Unlocks that didn't work since the lock last closed. */
  failures: number;
  /** The phone has no screen lock any more, so it can't unlock the app. */
  unavailable: boolean;
};

export type LockValue = {
  enabled: boolean;
  locked: boolean;
  /** Not in the foreground with the lock on: the content is hidden, also from the app switcher. */
  covered: boolean;
  support: LockSupport | null;
  failures: number;
  unavailable: boolean;
  unlocking: boolean;
  /** Ask whether to turn the lock on (after a password sign-in). */
  offering: boolean;
  unlock(): Promise<void>;
  /** Turning it on asks the phone to confirm its owner first. Resolves with whether it changed. */
  setEnabled(enabled: boolean): Promise<boolean>;
  answerOffer(accept: boolean): Promise<void>;
};

function stateFor(
  key: string | null,
  userId: number | null,
  signedInWith: SignedInWith | null,
): LockState {
  const preference = userId === null ? null : readLockPreference(userId);
  return {
    key,
    preference,
    // A session restored at start opens locked; the password just typed is proof enough.
    locked: signedInWith === "storedSession" && preference === true,
    offerPending: signedInWith === "password" && preference === null,
    failures: 0,
    unavailable: false,
  };
}

const LockContext = createContext<LockValue | null>(null);

export function LockProvider({ children }: { children: ReactNode }) {
  const { status, user, signedInWith } = useSession();
  const userId = status === "signedIn" && user ? user.id : null;
  const key = userId === null ? null : `${userId}:${signedInWith}`;

  const [lock, setLock] = useState<LockState>(() => stateFor(key, userId, signedInWith));
  if (lock.key !== key) setLock(stateFor(key, userId, signedInWith));

  const [support, setSupport] = useState<LockSupport | null>(null);
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);
  const [unlocking, setUnlocking] = useState(false);
  const unlockingNow = useRef(false);
  const backgroundedAt = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    void lockSupport().then((found) => {
      if (!cancelled) setSupport(found);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (next) => {
      setAppState(next);
      if (next === "background") {
        backgroundedAt.current ??= Date.now();
        return;
      }
      if (next !== "active") return;
      const relock = locksOnReturn(backgroundedAt.current, Date.now());
      backgroundedAt.current = null;
      if (relock) setLock((s) => (s.preference ? { ...s, locked: true, failures: 0 } : s));
      // Fingerprints or the passcode may have changed while away.
      void lockSupport().then(setSupport);
    });
    return () => subscription.remove();
  }, []);

  // Pushes and links wait for the restore and the unlock; signing out drops them.
  useEffect(() => {
    if (status === "signedOut") dropWaitingTasks();
    setUnlockGate(status === "loading" || lock.locked ? "closed" : "open");
  }, [status, lock.locked]);

  const unlock = useCallback(async () => {
    if (unlockingNow.current) return;
    unlockingNow.current = true;
    setUnlocking(true);
    const result = await confirmOwner("Unlock ID InDetails");
    unlockingNow.current = false;
    setUnlocking(false);
    setLock((s) => {
      if (result === "unlocked") return { ...s, locked: false, failures: 0, unavailable: false };
      if (result === "unavailable") return { ...s, unavailable: true };
      return { ...s, failures: s.failures + 1 };
    });
  }, []);

  const setEnabled = useCallback(
    async (enabled: boolean) => {
      if (userId === null) return false;
      if (enabled && (await confirmOwner("Turn on the lock for ID InDetails")) !== "unlocked") {
        return false;
      }
      saveLockPreference(userId, enabled);
      setLock((s) => ({ ...s, preference: enabled }));
      return true;
    },
    [userId],
  );

  const answerOffer = useCallback(
    async (accept: boolean) => {
      setLock((s) => ({ ...s, offerPending: false }));
      // Declined, or the phone's prompt cancelled: not asked again; Settings can still turn it on.
      if (!(accept && (await setEnabled(true))) && userId !== null) {
        saveLockPreference(userId, false);
        setLock((s) => ({ ...s, preference: false }));
      }
    },
    [setEnabled, userId],
  );

  const enabled = userId !== null && lock.preference === true;
  const value = useMemo<LockValue>(
    () => ({
      enabled,
      locked: userId !== null && lock.locked,
      covered: enabled && appState !== "active",
      support,
      failures: lock.failures,
      unavailable: lock.unavailable,
      unlocking,
      offering:
        lock.offerPending &&
        support?.biometrics === true &&
        user?.mustChangePassword === false &&
        appState === "active",
      unlock,
      setEnabled,
      answerOffer,
    }),
    [enabled, userId, lock, appState, support, unlocking, user, unlock, setEnabled, answerOffer],
  );

  return <LockContext.Provider value={value}>{children}</LockContext.Provider>;
}

export function useLock(): LockValue {
  const value = useContext(LockContext);
  if (!value) throw new Error("useLock is used outside LockProvider.");
  return value;
}
