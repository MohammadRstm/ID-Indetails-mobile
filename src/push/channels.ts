import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import type { AndroidChannel } from "@/api/mobileTypes";

/*
 * The Android notification channels, exactly as docs/contracts.md section 3 lists them: the server sends each
 * push on one of them, and the timer posts on `timer`. Android also gives people its own switch per channel.
 */

const { DEFAULT, HIGH, LOW } = Notifications.AndroidImportance;

export const ANDROID_CHANNELS: { id: AndroidChannel; name: string; importance: number }[] = [
  { id: "work", name: "Work", importance: DEFAULT },
  { id: "requirements", name: "Requirements", importance: DEFAULT },
  { id: "projects", name: "Projects", importance: DEFAULT },
  { id: "meetings", name: "Meetings", importance: DEFAULT },
  { id: "sites", name: "Sites", importance: DEFAULT },
  { id: "money", name: "Money", importance: DEFAULT },
  { id: "people", name: "People", importance: DEFAULT },
  { id: "messages", name: "Messages", importance: HIGH },
  { id: "reminders", name: "Reminders", importance: HIGH },
  { id: "timer", name: "Timer", importance: LOW },
  { id: "quiet", name: "Quiet hours", importance: LOW },
];

let created: Promise<void> | null = null;

/** Creates the channels once per app start; nothing to do on iOS. */
export function ensureAndroidChannels(): Promise<void> {
  if (Platform.OS !== "android") return Promise.resolve();
  created ??= Promise.all(
    ANDROID_CHANNELS.map((channel) =>
      Notifications.setNotificationChannelAsync(channel.id, {
        name: channel.name,
        importance: channel.importance,
        // The timer and quiet hours make no sound.
        sound: channel.importance === LOW ? null : "default",
      }),
    ),
  )
    .then(() => undefined)
    .catch((error: unknown) => {
      created = null;
      throw error;
    });
  return created;
}
