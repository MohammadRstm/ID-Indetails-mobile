import { fireEvent, screen } from "@testing-library/react-native";
import { router } from "expo-router";
import { http, HttpResponse } from "msw";
import { Linking } from "react-native";
import type { Client } from "@/api/types";
import { aProject } from "@/features/projects/slots/testData";
import { api } from "@test/handlers";
import { renderWithProviders } from "@test/render";
import { server } from "@test/server";
import { ClientScreen } from "./screens/ClientScreen";
import { ClientsScreen } from "./screens/ClientsScreen";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true },
}));

const open = jest.spyOn(Linking, "openURL");

beforeEach(() => open.mockResolvedValue(true));
afterEach(() => jest.clearAllMocks());

const billing = {
  drafts: 0,
  invoiced: 0,
  notYetInvoiced: 0,
  outstanding: 4200,
  overdue: 0,
  received: 0,
};

const aClient = (change: Partial<Client> = {}): Client => ({
  id: 3,
  name: "Hala Rizk",
  displayName: "Hala Rizk",
  domain: "design",
  label: "VIP",
  organisation: null,
  note: null,
  isArchived: false,
  nameSharedWithAnotherClient: false,
  createdAt: "2026-01-01T08:00:00Z",
  projectCount: 1,
  contacts: [
    {
      id: 1,
      kind: "phone",
      value: "+961 70 111 222",
      label: "Mobile",
      isPrimary: true,
      isWhatsapp: true,
    },
    {
      id: 2,
      kind: "phone",
      value: "+961 1 555 000",
      label: "Office",
      isPrimary: false,
      isWhatsapp: false,
    },
    {
      id: 3,
      kind: "email",
      value: "hala@example.test",
      label: null,
      isPrimary: false,
      isWhatsapp: false,
    },
  ],
  money: { revenue: 18000, profit: 6000, billing } as Client["money"],
  projectMoney: null,
  work: null,
  ...change,
});

function serve(client = aClient()) {
  server.use(
    http.get(api(`/clients/${client.id}`), () => HttpResponse.json(client)),
    http.get(api("/projects"), () =>
      HttpResponse.json({ items: [aProject()], page: 1, pageSize: 100, totalCount: 1 }),
    ),
  );
}

describe("ClientScreen", () => {
  it("puts each contact one tap away, with WhatsApp only where the number has it", async () => {
    serve();
    await renderWithProviders(<ClientScreen clientId={3} />, { persona: "designAdmin" });
    await screen.findByText("+961 70 111 222 (main)");
    expect(screen.getAllByRole("button", { name: "Call" })).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: "WhatsApp" })).toHaveLength(1);
    await fireEvent.press(screen.getByRole("button", { name: "WhatsApp" }));
    await fireEvent.press(screen.getByRole("button", { name: "Email" }));
    expect(open.mock.calls.map(([url]) => url)).toEqual([
      "https://wa.me/96170111222",
      "mailto:hala@example.test",
    ]);
  });

  it("lists the client's projects and opens one", async () => {
    serve();
    await renderWithProviders(<ClientScreen clientId={3} />, { persona: "designAdmin" });
    await fireEvent.press(await screen.findByRole("button", { name: /Villa Haddad/ }));
    expect(router.push).toHaveBeenCalledWith({ pathname: "/projects/[id]", params: { id: "7" } });
  });

  it("shows no money without financial:view, even if the API sent it", async () => {
    serve();
    await renderWithProviders(<ClientScreen clientId={3} />, { persona: "designAdmin" });
    await screen.findByText("Villa Haddad");
    expect(screen.queryByText("Money")).toBeNull();
    expect(screen.queryByText("Revenue")).toBeNull();
  });

  it("shows money with financial:view", async () => {
    serve();
    await renderWithProviders(<ClientScreen clientId={3} />, { persona: "superAdmin" });
    expect(await screen.findByText("Revenue")).toBeTruthy();
    expect(screen.getByText("Outstanding")).toBeTruthy();
  });
});

describe("ClientsScreen", () => {
  it("lists clients with their project counts and opens one", async () => {
    server.use(
      http.get(api("/clients"), () =>
        HttpResponse.json({
          items: [{ id: 3, displayName: "Hala Rizk", label: "VIP", projectCount: 2 }],
          page: 1,
          pageSize: 100,
          totalCount: 1,
        }),
      ),
    );
    await renderWithProviders(<ClientsScreen />, { persona: "designAdmin" });
    await fireEvent.press(await screen.findByRole("button", { name: /Hala Rizk/ }));
    expect(screen.getByText("2 projects")).toBeTruthy();
    expect(router.push).toHaveBeenCalledWith({ pathname: "/clients/[id]", params: { id: "3" } });
  });
});
