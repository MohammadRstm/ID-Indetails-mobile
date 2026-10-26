import { Platform } from "react-native";
import { runSignOutCleanups } from "@/auth/signOutCleanup";
import { rememberSignedInUser } from "./signOutCleanup";

jest.mock("expo-notifications", () => ({
  ...jest.requireActual("expo-notifications"),
  setBadgeCountAsync: jest.fn(async () => undefined),
  dismissNotificationAsync: jest.fn(async () => undefined),
  cancelScheduledNotificationAsync: jest.fn(async () => undefined),
}));
jest.mock("@/features/widgets", () => ({ clearWidgets: jest.fn(async () => undefined) }));

const mockDeleteFolder = jest.fn();
jest.mock("expo-file-system", () => ({
  Paths: { cache: "cache" },
  File: class {},
  Directory: class {
    exists = true;
    delete() {
      mockDeleteFolder();
    }
  },
}));

const mockStopActivity = jest.fn();
jest.mock("@/features/widgets/timerActivity", () => ({
  timerActivity: { start: jest.fn(), stop: () => mockStopActivity() },
}));

const platform = Platform.OS;
beforeEach(() => jest.clearAllMocks());
afterEach(() => {
  Platform.OS = platform;
});

describe("signing out", () => {
  it("ends the timer's Live Activity, so the iPhone lock screen stops showing it", async () => {
    Platform.OS = "ios";
    rememberSignedInUser(4);
    await runSignOutCleanups("signedOut");
    expect(mockStopActivity).toHaveBeenCalledTimes(1);
  });

  it("deletes the downloaded invoice and statement PDFs", async () => {
    rememberSignedInUser(4);
    await runSignOutCleanups("signedOut");
    expect(mockDeleteFolder).toHaveBeenCalledTimes(1);
  });
});
