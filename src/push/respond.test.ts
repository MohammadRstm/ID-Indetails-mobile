import type * as Notifications from "expo-notifications";
import { permissionsOf } from "@/permissions/permissions";
import { personas } from "@test/personas";
import { handleNotificationAction } from "./actions";
import { isForOpenChat, parsePushData, staleQueries } from "./model";
import { respondToNotification, type ResponseContext } from "./respond";

jest.mock("./actions", () => ({ handleNotificationAction: jest.fn(async () => false) }));

const tap = (data: unknown, actionIdentifier = "expo.modules.notifications.actions.DEFAULT") =>
  ({ actionIdentifier, notification: { request: { content: { data } } } }) as unknown as Pick<
    Notifications.NotificationResponse,
    "actionIdentifier" | "notification"
  >;

function context(
  persona: "designEmployee" | "executionEmployee" = "designEmployee",
): ResponseContext {
  return {
    userId: personas[persona].id,
    perms: permissionsOf(personas[persona]),
    navigate: jest.fn(),
    stopTimer: jest.fn(),
  };
}

beforeEach(() => jest.mocked(handleNotificationAction).mockClear());

describe("tapping a push", () => {
  it("opens its target when the person may open it", async () => {
    const ctx = context();
    await respondToNotification(
      tap({
        forUserId: 4,
        kind: "entry_comment",
        notificationId: 3,
        target: { type: "work_entry", id: 50 },
      }),
      ctx,
    );
    expect(ctx.navigate).toHaveBeenCalledWith({
      pathname: "/work/entry/[id]",
      params: { id: "50" },
    });
  });

  it("ignores a push for someone else on a shared phone", async () => {
    const ctx = context();
    await respondToNotification(
      tap({ forUserId: 99, kind: "message", target: { type: "conversation", userId: 2 } }),
      ctx,
    );
    expect(ctx.navigate).not.toHaveBeenCalled();
    expect(handleNotificationAction).not.toHaveBeenCalled();
  });

  it("opens Alerts when the target isn't one the person may open", async () => {
    const ctx = context("executionEmployee");
    await respondToNotification(
      tap({ forUserId: 5, kind: "entry_comment", target: { type: "work_entry", id: 50 } }),
      ctx,
    );
    expect(ctx.navigate).toHaveBeenCalledWith("/alerts");
  });

  it("lets the action-button slot handle it first", async () => {
    jest.mocked(handleNotificationAction).mockResolvedValueOnce(true);
    const ctx = context();
    await respondToNotification(
      tap(
        { forUserId: 4, kind: "requirement_assigned", target: { type: "page", page: "today" } },
        "done",
      ),
      ctx,
    );
    expect(handleNotificationAction).toHaveBeenCalledWith(
      "done",
      expect.objectContaining({ forUserId: 4 }),
    );
    expect(ctx.navigate).not.toHaveBeenCalled();
  });

  it("ignores a malformed payload", async () => {
    const ctx = context();
    await respondToNotification(tap({ forUserId: "4", target: "x" }), ctx);
    expect(ctx.navigate).not.toHaveBeenCalled();
  });

  it("stops the timer from its Stop button, only for its owner", async () => {
    const ctx = context();
    await respondToNotification(tap({ timer: true, userId: 4 }, "stop"), ctx);
    expect(ctx.stopTimer).toHaveBeenCalledTimes(1);
    await respondToNotification(tap({ timer: true, userId: 9 }, "stop"), ctx);
    expect(ctx.stopTimer).toHaveBeenCalledTimes(1);
  });
});

describe("a push in the foreground", () => {
  const message = parsePushData({
    forUserId: 4,
    kind: "message",
    target: { type: "conversation", teamId: 3 },
  })!;

  it("isn't shown over the chat it is for", () => {
    expect(isForOpenChat(message, { kind: "team", teamId: 3 })).toBe(true);
    expect(isForOpenChat(message, { kind: "team", teamId: 4 })).toBe(false);
    expect(isForOpenChat(message, null)).toBe(false);
  });

  it("reloads what it is about", () => {
    expect(staleQueries(message)).toEqual([["messages"]]);
    const materials = parsePushData({
      forUserId: 4,
      kind: "materials_added",
      target: { type: "page", page: "today" },
    })!;
    expect(staleQueries(materials)).toEqual([["notifications"], ["materials"], ["projects"]]);
  });
});
