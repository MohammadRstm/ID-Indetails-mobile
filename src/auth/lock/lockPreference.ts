import Storage from "expo-sqlite/kv-store";

/*
 * Whether a person wants the app locked on this phone. Kept per person, so the next person signing in on a
 * shared phone is asked for themselves. Absent: never asked.
 */

const keyOf = (userId: number) => `lock.biometrics.${userId}`;

export function readLockPreference(userId: number): boolean | null {
  try {
    const stored = Storage.getItemSync(keyOf(userId));
    return stored === "on" ? true : stored === "off" ? false : null;
  } catch {
    return null;
  }
}

export function saveLockPreference(userId: number, enabled: boolean): void {
  try {
    Storage.setItemSync(keyOf(userId), enabled ? "on" : "off");
  } catch {
    // the choice applies until the app closes
  }
}
