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

beforeEach(() => jest.clearAllMocks());

describe("signing out", () => {
  it("deletes the downloaded invoice and statement PDFs", async () => {
    rememberSignedInUser(4);
    await runSignOutCleanups("signedOut");
    expect(mockDeleteFolder).toHaveBeenCalledTimes(1);
  });
});
