import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";
import { http, HttpResponse } from "msw";
import { api } from "@test/handlers";
import { renderWithProviders } from "@test/render";
import { server } from "@test/server";
import { AlertsScreen } from "./AlertsScreen";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true },
}));
jest.setTimeout(20_000);

it("lists notifications in the web's words, and a tap marks it read and opens it", async () => {
  let read = 0;
  server.use(
    http.get(api("/notifications"), () =>
      HttpResponse.json({
        items: [
          {
            id: 12,
            kind: "requirement_assigned",
            actor: { id: 2, name: "Nadia Test", photoFileId: null },
            project: { id: 7, title: "Villa Haddad", domain: "design", icon: null, tint: null },
            subjectType: "requirement",
            subjectId: 31,
            payload: { text: "Finish the kitchen" },
            count: 1,
            createdAt: new Date().toISOString(),
            readAt: null,
          },
        ],
        page: 1,
        pageSize: 30,
        totalCount: 1,
      }),
    ),
    http.get(api("/notifications/unread-count"), () => HttpResponse.json({ unread: 1 })),
    http.post(api("/notifications/12/read"), () => {
      read += 1;
      return HttpResponse.json({ unread: 0 });
    }),
  );
  await renderWithProviders(<AlertsScreen />, { persona: "designEmployee" });
  const item = await screen.findByRole("button", {
    name: /Nadia Test assigned you a requirement on Villa Haddad/,
  });
  await fireEvent.press(item);
  await waitFor(() => expect(read).toBe(1));
  expect(router.push).toHaveBeenCalledWith({
    pathname: "/projects/[id]/requirements",
    params: { id: "7", requirementId: "31" },
  });
});
