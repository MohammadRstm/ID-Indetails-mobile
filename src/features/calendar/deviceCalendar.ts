import * as Calendar from "expo-calendar";
import { Platform } from "react-native";
import { formatSettings } from "@/format/time";
import type { CalendarEvent } from "./AddToCalendarButton";
import { APP_CALENDAR_TITLE, chooseAndroidCalendar, toEventDetails } from "./model";

/** The theme's accent (src/theme/tokens.ts), for a calendar the app creates. */
const APP_CALENDAR_COLOR = "#0C6B69";

export type AddToCalendarResult = "added" | "denied" | "unavailable";

/*
 * iOS asks only for write access (iOS 17+): the app adds events to the person's default calendar and never
 * reads their calendars. Android has no write-only access, so it asks for calendar access and picks a calendar
 * (model.ts).
 */
async function targetCalendar(): Promise<Calendar.ExpoCalendar | "denied"> {
  if (Platform.OS === "ios") {
    const permission = await Calendar.requestCalendarPermissions(true);
    if (!permission.granted) return "denied";
    return Calendar.getDefaultCalendarSync();
  }

  const permission = await Calendar.requestCalendarPermissions();
  if (!permission.granted) return "denied";
  const calendars = await Calendar.getCalendars();
  const choice = chooseAndroidCalendar(calendars);
  const existing = calendars.find((c) => c.id === choice);
  if (existing) return existing;
  return Calendar.createCalendar({
    title: APP_CALENDAR_TITLE,
    name: APP_CALENDAR_TITLE,
    color: APP_CALENDAR_COLOR,
    entityType: Calendar.EntityTypes.EVENT,
    source: { isLocalAccount: true, name: APP_CALENDAR_TITLE, type: Calendar.SourceType.LOCAL },
    ownerAccount: APP_CALENDAR_TITLE,
    accessLevel: Calendar.CalendarAccessLevel.OWNER,
  });
}

/**
 * Adds the event to the phone's calendar, asking for permission the first time. Resolves "denied" when the
 * person refused, "unavailable" where there is no device calendar; rejects when the calendar refused the event.
 */
export async function addToDeviceCalendar(event: CalendarEvent): Promise<AddToCalendarResult> {
  if (Platform.OS !== "ios" && Platform.OS !== "android") return "unavailable";
  const details = toEventDetails(event, Platform.OS, formatSettings().timeZone);
  if (!details) return "unavailable";

  const calendar = await targetCalendar();
  if (calendar === "denied") return "denied";
  await calendar.createEvent(details);
  return "added";
}
