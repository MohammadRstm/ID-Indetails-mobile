import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { fmtTime } from "@/format/time";
import { ensureAndroidChannels } from "@/push/channels";
import { elapsedMs, REMIND_AFTER_MS, type RunningTimer } from "./model";

/*
 * The timer on the lock screen in V1 (phase-0-plan.md section 16): a local notification while it runs, sticky on
 * Android on the low-importance `timer` channel, an ordinary one on iOS, with a Stop button; and a reminder after
 * four hours. A ticking lock-screen counter is Phase 5 (timer/liveActivity.ts).
 */

export const TIMER_CATEGORY = "timer";
export const TIMER_STOP_ACTION = "stop";
const RUNNING_ID = "timer-running";
const REMINDER_ID = "timer-reminder";

/** What a timer notification carries: only who it is for. */
export type TimerNotificationData = { timer: true; userId: number };

export function isTimerNotification(data: unknown): data is TimerNotificationData {
  return (
    typeof data === "object" &&
    data !== null &&
    (data as { timer?: unknown }).timer === true &&
    typeof (data as { userId?: unknown }).userId === "number"
  );
}

/** The Stop button, registered once at start. */
export async function registerTimerCategory(): Promise<void> {
  await Notifications.setNotificationCategoryAsync(TIMER_CATEGORY, [
    { identifier: TIMER_STOP_ACTION, buttonTitle: "Stop", options: { opensAppToForeground: true } },
  ]);
}

const onChannel = (channelId: string) => (Platform.OS === "android" ? { channelId } : null);

/** Posts the running notification and schedules the four-hour reminder (again after a restart). */
export async function showTimerNotification(timer: RunningTimer): Promise<void> {
  await ensureAndroidChannels();
  const data: TimerNotificationData = { timer: true, userId: timer.userId };
  await Notifications.scheduleNotificationAsync({
    identifier: RUNNING_ID,
    content: {
      title: `Timer running since ${fmtTime(timer.startedAt)} · ${timer.projectTitle}`,
      body: timer.description || "Tap Stop when you finish, then log it.",
      data,
      sticky: true,
      autoDismiss: false,
      categoryIdentifier: TIMER_CATEGORY,
    },
    trigger: onChannel("timer"),
  });

  await Notifications.cancelScheduledNotificationAsync(REMINDER_ID);
  const remindInMs = REMIND_AFTER_MS - elapsedMs(timer.startedAt, Date.now());
  if (remindInMs > 0) {
    await Notifications.scheduleNotificationAsync({
      identifier: REMINDER_ID,
      content: {
        title: "Your timer is still running",
        body: `${timer.projectTitle} · since ${fmtTime(timer.startedAt)}`,
        data,
        categoryIdentifier: TIMER_CATEGORY,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: Math.ceil(remindInMs / 1000),
        channelId: "reminders",
      },
    });
  }
}

export async function clearTimerNotification(): Promise<void> {
  await Notifications.dismissNotificationAsync(RUNNING_ID);
  await Notifications.cancelScheduledNotificationAsync(REMINDER_ID);
}
