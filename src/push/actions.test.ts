import { act } from "@testing-library/react-native";
import { http, HttpResponse } from "msw";
import type { PushData } from "@/api/mobileTypes";
import { clearToasts } from "@/ui/toast";
import { api } from "@test/handlers";
import { personas } from "@test/personas";
import { server } from "@test/server";
import { handleNotificationAction } from "./actions";

// The base handlers answer GET /auth/me with the Design employee.
const me = personas.designEmployee.id;

const requirementPush: PushData = {
  forUserId: me,
  kind: "requirement_assigned",
  notificationId: 12,
  target: { type: "requirement", projectId: 4, requirementId: 9, domain: "design" },
};
const teamMessage: PushData = {
  forUserId: me,
  kind: "message",
  target: { type: "conversation", teamId: 2 },
};
const directMessage: PushData = {
  forUserId: me,
  kind: "message",
  target: { type: "conversation", userId: 31 },
};

function recordPosts() {
  const posts: { path: string; body: unknown }[] = [];
  server.use(
    http.post(api("/*"), async ({ request }) => {
      const text = await request.text();
      posts.push({ path: new URL(request.url).pathname, body: text ? JSON.parse(text) : null });
      return HttpResponse.json({});
    }),
  );
  return posts;
}

afterEach(() => act(() => clearToasts()));

describe("Mark done", () => {
  it("ticks the requirement and opens nothing", async () => {
    const posts = recordPosts();
    await expect(handleNotificationAction("mark_done", requirementPush)).resolves.toBe(true);
    expect(posts).toEqual([{ path: "/api/projects/4/requirements/9/done", body: null }]);
  });

  it("does nothing for a push meant for someone else signed in on this phone", async () => {
    const posts = recordPosts();
    await expect(
      handleNotificationAction("mark_done", { ...requirementPush, forUserId: me + 1000 }),
    ).resolves.toBe(false);
    expect(posts).toEqual([]);
  });

  it("does nothing with a payload that doesn't fit", async () => {
    const posts = recordPosts();
    const bad = [
      { ...requirementPush, target: { type: "page", page: "notifications" } },
      { ...requirementPush, target: { ...requirementPush.target, requirementId: -1 } },
      { ...requirementPush, target: { ...requirementPush.target, projectId: "4" } },
    ] as PushData[];
    for (const data of bad) {
      await expect(handleNotificationAction("mark_done", data)).resolves.toBe(false);
    }
    expect(posts).toEqual([]);
  });

  it("lets the requirement open when the API refuses", async () => {
    server.use(
      http.post(api("/projects/4/requirements/9/done"), () =>
        HttpResponse.json(
          { type: "forbidden", code: "forbidden", message: "No.", errors: null },
          { status: 403 },
        ),
      ),
    );
    await expect(handleNotificationAction("mark_done", requirementPush)).resolves.toBe(false);
  });
});

describe("Reply", () => {
  it("sends the typed text to the team chat", async () => {
    const posts = recordPosts();
    await expect(handleNotificationAction("reply", teamMessage, "  On my way  ")).resolves.toBe(
      true,
    );
    expect(posts).toEqual([{ path: "/api/messages/teams/2", body: { body: "On my way" } }]);
  });

  it("sends it to the direct chat with the sender", async () => {
    const posts = recordPosts();
    await expect(handleNotificationAction("reply", directMessage, "Thanks")).resolves.toBe(true);
    expect(posts).toEqual([{ path: "/api/messages/direct/31", body: { body: "Thanks" } }]);
  });

  it("opens the chat instead when there is no text, or too much", async () => {
    const posts = recordPosts();
    await expect(handleNotificationAction("reply", teamMessage)).resolves.toBe(false);
    await expect(handleNotificationAction("reply", teamMessage, "   ")).resolves.toBe(false);
    await expect(handleNotificationAction("reply", teamMessage, "x".repeat(4001))).resolves.toBe(
      false,
    );
    expect(posts).toEqual([]);
  });

  it("opens the chat when the message can't be sent", async () => {
    server.use(
      http.post(api("/messages/teams/2"), () =>
        HttpResponse.json(
          { type: "validation", code: "validation_failed", message: "No.", errors: null },
          { status: 400 },
        ),
      ),
    );
    await expect(handleNotificationAction("reply", teamMessage, "Hi")).resolves.toBe(false);
  });
});

describe("other actions", () => {
  it("leaves a plain tap and unknown actions to the caller", async () => {
    const posts = recordPosts();
    await expect(
      handleNotificationAction("expo.modules.notifications.actions.DEFAULT", requirementPush),
    ).resolves.toBe(false);
    await expect(handleNotificationAction("stop_timer", requirementPush)).resolves.toBe(false);
    expect(posts).toEqual([]);
  });
});
