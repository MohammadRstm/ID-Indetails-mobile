import Storage from "expo-sqlite/kv-store";
import { onSignOut } from "@/auth/signOutCleanup";

/*
 * Which saved chat each person had open, so reopening Proton shows it again. Only the chat's id is kept, on this
 * phone, under the person's own key: the messages always come from the API, which also decides whether the person
 * may still see the chat.
 */

const keyOf = (userId: number) => `idi.proton.chat.${userId}`;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const touched = new Set<number>();

export function readOpenChat(userId: number): string | null {
  try {
    const stored = Storage.getItemSync(keyOf(userId));
    if (!stored || !UUID.test(stored)) return null;
    touched.add(userId);
    return stored;
  } catch {
    return null;
  }
}

/** Remembers the open chat, or forgets it with null (a new chat, a deleted one, one that is gone). */
export function saveOpenChat(userId: number, conversationId: string | null): void {
  touched.add(userId);
  try {
    if (conversationId) Storage.setItemSync(keyOf(userId), conversationId);
    else void Storage.removeItem(keyOf(userId)).catch(() => undefined);
  } catch {
    // without it, Proton opens on a new chat next time
  }
}

// The open chat goes when the person leaves, however they leave.
onSignOut(async () => {
  const people = [...touched];
  touched.clear();
  await Promise.allSettled(people.map((userId) => Storage.removeItem(keyOf(userId))));
});
