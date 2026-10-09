import Storage from "expo-sqlite/kv-store";
import type { CurrentUser } from "@/api/types";

/*
 * The signed-in person as last read from the API, kept so a restart without a connection still opens the app
 * (offline reading, phase-0-plan.md section 10). It is only ever used while a refresh token is stored, is
 * replaced by every answer from the API, and goes when the person signs out or the session ends.
 */

const KEY = "session.user";

function isCurrentUser(value: unknown): value is CurrentUser {
  if (typeof value !== "object" || value === null) return false;
  const user = value as Partial<CurrentUser>;
  return (
    typeof user.id === "number" &&
    typeof user.firstName === "string" &&
    typeof user.role === "string" &&
    Array.isArray(user.permissions) &&
    Array.isArray(user.visibleDomains)
  );
}

export function readCachedUser(): CurrentUser | null {
  try {
    const stored = Storage.getItemSync(KEY);
    if (!stored) return null;
    const value: unknown = JSON.parse(stored);
    return isCurrentUser(value) ? value : null;
  } catch {
    return null;
  }
}

export function cacheUser(user: CurrentUser): void {
  Storage.setItem(KEY, JSON.stringify(user)).catch(() => {
    // without it, a restart offline shows the sign-in screen instead
  });
}

export async function forgetCachedUser(): Promise<void> {
  try {
    await Storage.removeItem(KEY);
  } catch {
    // nothing else to do
  }
}
