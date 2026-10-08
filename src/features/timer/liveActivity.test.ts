import { Platform } from "react-native";
import { startTimerActivity, stopTimerActivity } from "./liveActivity";

const mockStart = jest.fn();
const mockStop = jest.fn();
jest.mock("@/features/widgets/timerActivity", () => ({
  timerActivity: { start: (t: unknown) => mockStart(t), stop: () => mockStop() },
}));

const timer = {
  projectId: 1,
  projectTitle: "Villa",
  description: "Paint",
  startedAt: "2026-03-10T08:00:00Z",
};
const original = Platform.OS;
afterEach(() => {
  Platform.OS = original;
  jest.clearAllMocks();
});

describe("the lock-screen timer", () => {
  it("starts and stops a Live Activity on iPhone", async () => {
    Platform.OS = "ios";
    await startTimerActivity(timer);
    await stopTimerActivity();
    expect(mockStart).toHaveBeenCalledWith(timer);
    expect(mockStop).toHaveBeenCalledTimes(1);
  });

  it("does nothing on Android", async () => {
    Platform.OS = "android";
    await startTimerActivity(timer);
    await stopTimerActivity();
    expect(mockStart).not.toHaveBeenCalled();
    expect(mockStop).not.toHaveBeenCalled();
  });

  it("swallows a failing native module", async () => {
    Platform.OS = "ios";
    mockStart.mockRejectedValueOnce(new Error("no native module"));
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    await expect(startTimerActivity(timer)).resolves.toBeUndefined();
    warn.mockRestore();
  });
});
