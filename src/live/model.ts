import type { QueryKey } from "@tanstack/react-query";

/*
 * The live signals (the API's messaging.md, "Live updates") only say what to reload; and the connection needs a
 * token that won't expire while it connects.
 */

/** When a JWT access token expires (epoch ms), read from its payload; null when it can't be read. */
export function tokenExpiry(token: string): number | null {
  const part = token.split(".")[1];
  if (!part) return null;
  try {
    const base64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const json = globalThis.atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="));
    const exp = (JSON.parse(json) as { exp?: unknown }).exp;
    return typeof exp === "number" ? exp * 1000 : null;
  } catch {
    return null;
  }
}

/** Whether a token is missing or expires within the next minute, so a fresh one is needed first. */
export function needsFreshToken(token: string | null, now: number): boolean {
  if (!token) return true;
  const expiry = tokenExpiry(token);
  return expiry == null || expiry - now < 60_000;
}

export type MessagesSignal = { teamId?: number | null; userId?: number | null } | undefined;

/** What the `messages` signal makes stale: the badge, the list, and that chat. */
export function messagesStale(signal: MessagesSignal): QueryKey[] {
  const keys: QueryKey[] = [
    ["messages", "badge"],
    ["messages", "conversations"],
  ];
  if (signal?.teamId) keys.push(["messages", "thread", `team-${signal.teamId}`]);
  if (signal?.userId) keys.push(["messages", "thread", `direct-${signal.userId}`]);
  return keys;
}
