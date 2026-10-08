import { Platform } from "react-native";
import { companyToday } from "@/format/time";
import { clearWidgets, publishTodayHours, registerWidgets } from "./index";
import { readTodaySnapshot } from "./snapshot";

const mockUpdateSnapshot = jest.fn();
const mockRequestWidgetUpdate = jest.fn();
const mockRegisterTaskHandler = jest.fn();

jest.mock("./iosWidget", () => ({
  iosTodayWidget: { updateSnapshot: (v: unknown) => mockUpdateSnapshot(v) },
}));
jest.mock("./AndroidTodayWidget", () => ({ AndroidTodayWidget: () => null }));
jest.mock("react-native-android-widget", () => ({
  requestWidgetUpdate: (p: unknown) => mockRequestWidgetUpdate(p),
  registerWidgetTaskHandler: (h: unknown) => mockRegisterTaskHandler(h),
}));

const original = Platform.OS;
afterEach(() => {
  Platform.OS = original;
  jest.clearAllMocks();
});

const snapshot = { day: companyToday(), minutes: 75, timerRunning: false };

describe("publishTodayHours", () => {
  it("caches the hours and updates the iPhone widget", async () => {
    Platform.OS = "ios";
    await publishTodayHours(snapshot);
    await expect(readTodaySnapshot()).resolves.toEqual(snapshot);
    expect(mockUpdateSnapshot).toHaveBeenCalledWith(expect.objectContaining({ hours: "1h 15m" }));
    expect(mockRequestWidgetUpdate).not.toHaveBeenCalled();
  });

  it("updates the Android widget", async () => {
    Platform.OS = "android";
    await publishTodayHours(snapshot);
    expect(mockRequestWidgetUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ widgetName: "TodayHours" }),
    );
    expect(mockUpdateSnapshot).not.toHaveBeenCalled();
  });

  it("does not throw when the native widget is missing", async () => {
    Platform.OS = "android";
    mockRequestWidgetUpdate.mockRejectedValueOnce(new Error("no native module"));
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    await expect(publishTodayHours(snapshot)).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalledWith(expect.not.stringContaining("no native module"));
    warn.mockRestore();
  });
});

describe("clearWidgets", () => {
  it("empties the cache and shows the open-the-app text", async () => {
    Platform.OS = "ios";
    await publishTodayHours(snapshot);
    await clearWidgets();
    await expect(readTodaySnapshot()).resolves.toBeNull();
    expect(mockUpdateSnapshot).toHaveBeenLastCalledWith(expect.objectContaining({ hours: "--" }));
  });
});

describe("registerWidgets", () => {
  it("registers the task handler on Android only", async () => {
    Platform.OS = "ios";
    await registerWidgets();
    expect(mockRegisterTaskHandler).not.toHaveBeenCalled();
    Platform.OS = "android";
    await registerWidgets();
    expect(mockRegisterTaskHandler).toHaveBeenCalledTimes(1);
  });
});
