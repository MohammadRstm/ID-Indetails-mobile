import * as BackgroundTask from "expo-background-task";
import * as TaskManager from "expo-task-manager";
import { REFRESH_TOKEN_KEY } from "@test/auth";
import { secureStoreItems } from "@test/mocks/secureStore";
import { BACKGROUND_SYNC_TASK, registerBackgroundSync, runBackgroundSync } from "./background";

jest.mock("expo-background-task", () => ({
  BackgroundTaskStatus: { Restricted: 1, Available: 2 },
  BackgroundTaskResult: { Success: 1, Failed: 2 },
  getStatusAsync: jest.fn(),
  registerTaskAsync: jest.fn(),
}));
jest.mock("expo-task-manager", () => ({
  isTaskDefined: jest.fn(() => false),
  defineTask: jest.fn(),
  isTaskRegisteredAsync: jest.fn(),
}));

const task = jest.mocked(TaskManager);
const background = jest.mocked(BackgroundTask);
// Read before any test clears the mocks: the task is defined when the module loads.
const defined = task.defineTask.mock.calls.slice();

let warn: jest.SpyInstance;
beforeEach(() => {
  jest.clearAllMocks();
  secureStoreItems.clear();
  warn = jest.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => warn.mockRestore());

describe("background sync", () => {
  it("defines its task when the module loads, as a background launch needs", () => {
    expect(defined).toEqual([[BACKGROUND_SYNC_TASK, runBackgroundSync]]);
  });

  it("registers the task once, at least 15 minutes apart", async () => {
    background.getStatusAsync.mockResolvedValue(2);
    task.isTaskRegisteredAsync.mockResolvedValueOnce(false).mockResolvedValueOnce(true);

    await registerBackgroundSync(jest.fn());
    await registerBackgroundSync(jest.fn());

    expect(background.registerTaskAsync).toHaveBeenCalledTimes(1);
    expect(background.registerTaskAsync).toHaveBeenCalledWith(BACKGROUND_SYNC_TASK, {
      minimumInterval: 15,
    });
  });

  it("doesn't register where background runs are restricted, and never throws", async () => {
    background.getStatusAsync.mockResolvedValue(1);
    await registerBackgroundSync(jest.fn());
    expect(background.registerTaskAsync).not.toHaveBeenCalled();

    background.getStatusAsync.mockRejectedValue(new Error("no native module"));
    await expect(registerBackgroundSync(jest.fn())).resolves.toBeUndefined();
  });

  it("runs the registered sync while a session is stored", async () => {
    background.getStatusAsync.mockResolvedValue(1);
    const run = jest.fn().mockResolvedValue(undefined);
    await registerBackgroundSync(run);
    secureStoreItems.set(REFRESH_TOKEN_KEY, "refresh-1");

    await expect(runBackgroundSync()).resolves.toBe(1);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("never runs without a stored session", async () => {
    background.getStatusAsync.mockResolvedValue(1);
    const run = jest.fn();
    await registerBackgroundSync(run);

    await expect(runBackgroundSync()).resolves.toBe(1);
    expect(run).not.toHaveBeenCalled();
  });

  it("swallows a failed run and logs only the error's name", async () => {
    background.getStatusAsync.mockResolvedValue(1);
    await registerBackgroundSync(
      jest.fn().mockRejectedValue(new TypeError("token refresh-1 for sarah@example.com")),
    );
    secureStoreItems.set(REFRESH_TOKEN_KEY, "refresh-1");

    await expect(runBackgroundSync()).resolves.toBe(2);
    expect(warn).toHaveBeenCalledWith("Background sync: a run failed (TypeError).");
  });
});
