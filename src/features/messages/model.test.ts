import type { Message } from "@/api/types";
import {
  insertMention,
  mentionIds,
  mentionParts,
  mentionQuery,
  sameChat,
  snippet,
  startsRun,
} from "./model";

const message = (
  id: number,
  senderId: number,
  createdAt: string,
  change: Partial<Message> = {},
): Message => ({
  id,
  attachments: [],
  body: "Hello",
  createdAt,
  kind: "text",
  mentions: [],
  sender: { id: senderId, name: `Person ${senderId}`, photoFileId: null },
  taskComment: null,
  ...change,
});

it("sums a message up for the list", () => {
  expect(snippet(message(1, 1, "2026-10-08T06:00:00Z"))).toBe("Hello");
  expect(
    snippet(
      message(1, 1, "2026-10-08T06:00:00Z", {
        body: null,
        attachments: [
          { id: 3, kind: "video", mimeType: "video/mp4", name: "v", sizeBytes: 1, createdAt: "" },
        ],
      }),
    ),
  ).toBe("Video");
  expect(
    snippet(message(1, 1, "2026-10-08T06:00:00Z", { kind: "task_comment", body: "Nice" })),
  ).toBe("Task comment: Nice");
});

it("cuts mentions out of the text, longest names first", () => {
  expect(mentionParts("Hi @Sarah Haddad and @Sarah", ["Sarah", "Sarah Haddad"])).toEqual([
    { text: "Hi ", mention: false },
    { text: "@Sarah Haddad", mention: true },
    { text: " and ", mention: false },
    { text: "@Sarah", mention: true },
  ]);
});

it("finds and completes the mention being typed", () => {
  expect(mentionQuery("Ask @Sa")).toBe("Sa");
  expect(mentionQuery("Ask Sa")).toBeNull();
  expect(insertMention("Ask @Sa", "Sarah Haddad")).toBe("Ask @Sarah Haddad ");
  expect(
    mentionIds("Ask @Sarah Haddad", [
      { id: 4, name: "Sarah Haddad" },
      { id: 5, name: "Omar" },
    ]),
  ).toEqual([4]);
});

it("starts a new run for another sender or after five minutes", () => {
  const a = message(1, 1, "2026-10-08T06:00:00Z");
  expect(startsRun(a, undefined)).toBe(true);
  expect(startsRun(message(2, 1, "2026-10-08T06:04:00Z"), a)).toBe(false);
  expect(startsRun(message(2, 1, "2026-10-08T06:06:00Z"), a)).toBe(true);
  expect(startsRun(message(2, 2, "2026-10-08T06:01:00Z"), a)).toBe(true);
});

it("compares chats", () => {
  expect(sameChat({ kind: "team", teamId: 1 }, { kind: "team", teamId: 1 })).toBe(true);
  expect(sameChat({ kind: "team", teamId: 1 }, { kind: "direct", userId: 1 })).toBe(false);
  expect(sameChat(null, { kind: "direct", userId: 1 })).toBe(false);
});
