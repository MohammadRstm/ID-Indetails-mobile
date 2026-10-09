import { registerWidgetTaskHandler, type WidgetTaskHandler } from "react-native-android-widget";
import { AndroidTodayWidget } from "./AndroidTodayWidget";
import { ANDROID_WIDGET_NAME, readTodaySnapshot, shapeTodayView } from "./snapshot";

/** Draws the widget from the cache whenever Android asks (added, resized, periodic refresh). */
export const androidWidgetTask: WidgetTaskHandler = async ({
  widgetInfo,
  widgetAction,
  renderWidget,
}) => {
  if (widgetInfo.widgetName !== ANDROID_WIDGET_NAME) return;
  if (widgetAction === "WIDGET_DELETED") return;
  renderWidget(AndroidTodayWidget({ view: shapeTodayView(await readTodaySnapshot()) }));
};

/** Must run when the app's JavaScript loads, including a background launch that only draws the widget. */
export function registerAndroidWidgetTask(): void {
  registerWidgetTaskHandler(androidWidgetTask);
}
