import * as Notifications from "expo-notifications";
import {
  categoryForPush,
  PUSH_ACTION,
  PUSH_CATEGORY,
  registerNotificationCategories,
} from "./categories";

jest.mock("expo-notifications", () => ({ setNotificationCategoryAsync: jest.fn() }));

const setCategory = jest.mocked(Notifications.setNotificationCategoryAsync);
const requirement = {
  type: "requirement" as const,
  projectId: 4,
  requirementId: 9,
  domain: "design" as const,
};

beforeEach(() => setCategory.mockReset());

describe("categoryForPush", () => {
  it("gives a single open requirement the Mark done buttons", () => {
    for (const kind of ["requirement_assigned", "requirement_due_soon", "requirement_overdue"]) {
      expect(categoryForPush({ kind, target: requirement })).toBe("requirement");
    }
  });

  it("gives no buttons to a requirement already done, or one without its requirement target", () => {
    expect(categoryForPush({ kind: "requirement_done", target: requirement })).toBeNull();
    expect(
      categoryForPush({
        kind: "requirement_assigned",
        target: { type: "page", page: "notifications" },
      }),
    ).toBeNull();
  });

  it("gives messages the Reply button", () => {
    expect(categoryForPush({ kind: "message", target: { type: "conversation", teamId: 2 } })).toBe(
      "message",
    );
  });

  it("gives every other push no buttons", () => {
    expect(
      categoryForPush({ kind: "work_logged", target: { type: "work_entry", id: 3 } }),
    ).toBeNull();
    expect(
      categoryForPush({ kind: "log_reminder", target: { type: "page", page: "work" } }),
    ).toBeNull();
  });
});

describe("registerNotificationCategories", () => {
  it("registers Mark done and Reply, both opening the app after unlocking, never as the timer category", async () => {
    setCategory.mockResolvedValue({} as never);
    await registerNotificationCategories();

    expect(setCategory).toHaveBeenCalledTimes(2);
    const ids = setCategory.mock.calls.map(([id]) => id);
    expect(ids).toEqual([PUSH_CATEGORY.requirement, PUSH_CATEGORY.message]);
    expect(ids).not.toContain("timer");
    for (const id of ids) expect(id).not.toMatch(/[:-]/);

    const [markDone] = setCategory.mock.calls[0][1];
    expect(markDone).toMatchObject({
      identifier: PUSH_ACTION.markDone,
      options: { opensAppToForeground: true, isAuthenticationRequired: true },
    });
    const [reply] = setCategory.mock.calls[1][1];
    expect(reply).toMatchObject({ identifier: PUSH_ACTION.reply, textInput: expect.any(Object) });
  });

  it("never throws when the phone refuses", async () => {
    setCategory.mockRejectedValue(new Error("unavailable"));
    await expect(registerNotificationCategories()).resolves.toBeUndefined();
  });
});
