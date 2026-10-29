import { Platform } from "react-native";
import { runSignOutCleanups } from "@/auth/signOutCleanup";
import type { MaterialsPayload } from "@/offline/model";
import { addMaterials, reloadOutbox, resetOutboxForTests, saveRecord } from "@/offline/outbox";
import { resetFakeDatabase } from "@/offline/testing/fakeSqlite";
import { rememberSignedInUser } from "./signOutCleanup";

jest.mock("expo-sqlite", () => jest.requireActual("@/offline/testing/fakeSqlite"));
jest.mock("expo-crypto", () => ({
  randomUUID: () => jest.requireActual("node:crypto").randomUUID(),
}));

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

const materials: MaterialsPayload = {
  projectTitle: "Faqra site",
  items: [
    {
      clientRef: "8d0f5b8e-2b7c-4a43-9a52-1f3b1c0e6a11",
      name: "Cement",
      quantity: 10,
      unit: "bags",
      unitCost: 8,
      amount: null,
      supplier: null,
      note: null,
    },
  ],
};

const platform = Platform.OS;
beforeEach(() => {
  jest.clearAllMocks();
  resetFakeDatabase();
  resetOutboxForTests();
});
afterEach(() => {
  Platform.OS = platform;
});

describe("signing out", () => {
  it("deletes the person's sent records, with their costs, and keeps unsent ones to send later", async () => {
    const sent = await addMaterials(4, 7, materials);
    await saveRecord({ ...sent, status: "sent" });
    const unsent = await addMaterials(4, 7, materials);
    const theirs = await addMaterials(9, 7, materials);
    await saveRecord({ ...theirs, status: "sent" });

    rememberSignedInUser(4);
    await runSignOutCleanups("signedOut");

    const left = (await reloadOutbox()).map((r) => r.id).sort();
    expect(left).toEqual([unsent.id, theirs.id].sort());
  });

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
