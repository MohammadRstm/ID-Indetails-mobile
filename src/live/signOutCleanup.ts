import * as Notifications from "expo-notifications";
import { onSignOut } from "@/auth/signOutCleanup";
import { deleteDownloadedPdfs } from "@/features/billing/pdf";
import { stopTimerActivity } from "@/features/timer/liveActivity";
import { clearTimerNotification } from "@/features/timer/notifications";
import { clearWidgets } from "@/features/widgets";
import { clearPersistedQueries } from "@/offline/persistence";

/*
 * What this phone keeps for the signed-in person besides what the session clears itself (queries, toasts, images):
 * their kept queries, the badge, the timer's notification and iPhone Live Activity, the home-screen widgets and the
 * downloaded invoice and statement PDFs. Registered once with onSignOut, so it runs for
 * every way out: signing out, the lock's Sign out, and a session the API ended. The timer's own state stays under
 * the person's key for when they return.
 */

let lastSignedInUserId: number | null = null;

/** The session is already signed out when the cleanups run, so the person is remembered from while they were in. */
export function rememberSignedInUser(userId: number): void {
  lastSignedInUserId = userId;
}

onSignOut(async () => {
  const userId = lastSignedInUserId;
  lastSignedInUserId = null;
  await Promise.allSettled([
    userId == null ? Promise.resolve() : clearPersistedQueries(userId),
    Notifications.setBadgeCountAsync(0),
    clearTimerNotification(),
    stopTimerActivity(),
    clearWidgets(),
    deleteDownloadedPdfs(),
  ]);
});
