import { Platform } from "react-native";
import {
  ANDROID_WIDGET_NAME,
  clearTodaySnapshot,
  shapeTodayView,
  writeTodaySnapshot,
  type TodaySnapshot,
} from "./snapshot";

/*
 * The home-screen widgets (Android: react-native-android-widget, iPhone: expo-widgets). Both need a native
 * build; without one every call here is a quiet no-op, so nothing in the app depends on a widget existing.
 * The native modules load only on the platform that uses them.
 */

function logFailure(where: string, error: unknown) {
  const name = error instanceof Error ? error.name : typeof error;
  console.warn(`Widgets: ${where} failed (${name}).`);
}

async function redraw(snapshot: TodaySnapshot | null) {
  const view = shapeTodayView(snapshot);
  if (Platform.OS === "ios") {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { iosTodayWidget } = require("./iosWidget") as typeof import("./iosWidget");
    iosTodayWidget.updateSnapshot(view);
  } else if (Platform.OS === "android") {
    /* eslint-disable @typescript-eslint/no-require-imports */
    const { requestWidgetUpdate } =
      require("react-native-android-widget") as typeof import("react-native-android-widget");
    const { AndroidTodayWidget } =
      require("./AndroidTodayWidget") as typeof import("./AndroidTodayWidget");
    /* eslint-enable @typescript-eslint/no-require-imports */
    await requestWidgetUpdate({
      widgetName: ANDROID_WIDGET_NAME,
      renderWidget: () => AndroidTodayWidget({ view }),
    });
  }
}

/** Saves today's hours for the widgets and redraws them. Never throws. */
export async function publishTodayHours(snapshot: TodaySnapshot): Promise<void> {
  try {
    await writeTodaySnapshot(snapshot);
    await redraw(snapshot);
  } catch (error) {
    logFailure("publishing", error);
  }
}

/** Empties the widgets (on sign out). Never throws. */
export async function clearWidgets(): Promise<void> {
  try {
    await clearTodaySnapshot();
    await redraw(null);
  } catch (error) {
    logFailure("clearing", error);
  }
}
/** Android only: lets the widget draw itself when the system asks. Call once at start. Never throws. */
export async function registerWidgets(): Promise<void> {
  if (Platform.OS !== "android") return;
  try {
    /* eslint-disable @typescript-eslint/no-require-imports */
    const { registerAndroidWidgetTask } =
      require("./androidTask") as typeof import("./androidTask");
    /* eslint-enable @typescript-eslint/no-require-imports */
    registerAndroidWidgetTask();
  } catch (error) {
    logFailure("registering", error);
  }
}
