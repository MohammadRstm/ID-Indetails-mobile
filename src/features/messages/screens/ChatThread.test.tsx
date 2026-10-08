import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { http, HttpResponse } from "msw";
import { api } from "@test/handlers";
import { renderWithProviders } from "@test/render";
import { server } from "@test/server";
import { openChat } from "../openChat";
import { ChatThread } from "./ChatThread";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true },
  useIsFocused: () => true,
}));
jest.mock("expo-crypto", () => ({
  randomUUID: () => jest.requireActual("node:crypto").randomUUID(),
}));
jest.setTimeout(20_000);

const sent = {
  id: 2,
  attachments: [],
  body: "On my way",
  createdAt: "2026-10-08T06:01:00Z",
  kind: "text",
  mentions: [],
  sender: { id: 4, name: "Sarah Test", photoFileId: null },
  taskComment: null,
};

function serveThread() {
  let read = 0;
  server.use(
    http.get(api("/messages/direct/9"), () =>
      HttpResponse.json({
        hasMore: false,
        items: [
          {
            ...sent,
            id: 1,
            body: "Where are you?",
            sender: { id: 9, name: "Omar Test", photoFileId: null },
          },
        ],
      }),
    ),
    http.post(api("/messages/direct/9/read"), () => {
      read += 1;
      return HttpResponse.json({ unread: 0, mention: false });
    }),
    http.get(api("/messages/conversations"), () => HttpResponse.json([])),
  );
  return () => read;
}

it("marks the chat read, says it is open, and sends with the message shown at once", async () => {
  const reads = serveThread();
  let attempts = 0;
  server.use(
    http.post(api("/messages/direct/9"), () => {
      attempts += 1;
      return attempts === 1
        ? HttpResponse.json(
            { type: "unexpected", code: "internal_error", message: "" },
            { status: 500 },
          )
        : HttpResponse.json(sent, { status: 201 });
    }),
  );
  await renderWithProviders(<ChatThread chat={{ kind: "direct", userId: 9 }} title="Omar Test" />);
  expect(await screen.findByText("Where are you?")).toBeTruthy();
  await waitFor(() => expect(reads()).toBe(1));
  expect(openChat()).toEqual({ kind: "direct", userId: 9 });

  await fireEvent.changeText(screen.getByLabelText("Message"), "On my way");
  await fireEvent.press(screen.getByRole("button", { name: "Send" }));
  // The first try fails: the message stays, marked for a retry.
  const failed = await screen.findByRole("button", { name: "Not sent. Tap to retry" });
  await fireEvent.press(failed);
  await waitFor(() => expect(attempts).toBe(2));
  await waitFor(() =>
    expect(screen.queryByRole("button", { name: "Not sent. Tap to retry" })).toBeNull(),
  );
});
