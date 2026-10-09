import { fireEvent, screen } from "@testing-library/react-native";
import { router } from "expo-router";
import { http, HttpResponse } from "msw";
import { Linking } from "react-native";
import type { Employee } from "@/api/types";
import { anEmployee } from "@/features/projects/slots/testData";
import { P } from "@/permissions/codes";
import { api } from "@test/handlers";
import { personas, withPermissions } from "@test/personas";
import { renderWithProviders } from "@test/render";
import { server } from "@test/server";
import { callUrl, mailUrl, whatsappUrl } from "./contactLinks";
import { PeopleScreen } from "./screens/PeopleScreen";
import { PersonScreen } from "./screens/PersonScreen";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true },
}));

const open = jest.spyOn(Linking, "openURL");

beforeEach(() => open.mockResolvedValue(true));
afterEach(() => jest.clearAllMocks());

const aPerson = (change: Partial<Employee> = {}): Employee => ({
  ...anEmployee(),
  phone: "+961 3 123 456",
  currentPay: null,
  createdAt: "2025-09-01T08:00:00Z",
  ...change,
});

const entry = {
  id: 90,
  minutes: 120,
  overtimeMinutes: 0,
  description: "Moodboard for the kitchen",
  startedAt: "2026-10-08T06:00:00Z",
  endedAt: "2026-10-08T08:00:00Z",
  createdAt: "2026-10-08T08:00:00Z",
  updatedAt: null,
  canEdit: false,
  commentCount: 0,
  attachment: null,
  person: { id: 4, name: "Sarah Test" },
  project: { id: 7, title: "Villa Haddad", icon: null, tint: null },
};

let entriesAsked = 0;

function serve(person: Employee = aPerson()) {
  entriesAsked = 0;
  server.use(
    http.get(api(`/employees/${person.id}`), () => HttpResponse.json(person)),
    http.get(api("/work-entries"), () => {
      entriesAsked += 1;
      return HttpResponse.json({ items: [entry], page: 1, pageSize: 8, totalCount: 1 });
    }),
  );
}

describe("contact links", () => {
  it("builds a dialler link, a WhatsApp link and a mail link", () => {
    expect(callUrl("+961 3 123-456")).toBe("tel:+9613123456");
    expect(callUrl("03 123 456")).toBe("tel:03123456");
    expect(whatsappUrl("+961 3 123 456")).toBe("https://wa.me/9613123456");
    expect(whatsappUrl("00961 3 123 456")).toBe("https://wa.me/9613123456");
    expect(mailUrl(" sarah@hourline.test ")).toBe("mailto:sarah@hourline.test");
  });

  it("builds nothing from a value that isn't a number or an address", () => {
    expect(callUrl("n/a")).toBeNull();
    expect(whatsappUrl("")).toBeNull();
    expect(mailUrl("not an address")).toBeNull();
  });
});

describe("PersonScreen", () => {
  it("calls, writes on WhatsApp and emails in one tap", async () => {
    serve();
    await renderWithProviders(<PersonScreen personId={4} />, { persona: "designAdmin" });
    await fireEvent.press(await screen.findByRole("button", { name: "Call" }));
    await fireEvent.press(screen.getByRole("button", { name: "WhatsApp" }));
    await fireEvent.press(screen.getByRole("button", { name: "Email" }));
    expect(open.mock.calls.map(([url]) => url)).toEqual([
      "tel:+9613123456",
      "https://wa.me/9613123456",
      "mailto:sarah@hourline.test",
    ]);
  });

  it("starts a direct chat from Send message, but not with yourself", async () => {
    serve();
    await renderWithProviders(<PersonScreen personId={4} />, { persona: "designAdmin" });
    await fireEvent.press(await screen.findByRole("button", { name: "Send message" }));
    expect(router.push).toHaveBeenCalledWith({
      pathname: "/messages/direct/[userId]",
      params: { userId: "4" },
    });
  });

  it("hides Send message on one's own profile", async () => {
    serve(aPerson({ id: 2, firstName: "Nadia", email: "nadia@hourline.test" }));
    await renderWithProviders(<PersonScreen personId={2} />, { persona: "designAdmin" });
    await screen.findByRole("button", { name: "Call" });
    expect(screen.queryByRole("button", { name: "Send message" })).toBeNull();
  });

  it("shows recent work to people who see everyone's work", async () => {
    serve();
    await renderWithProviders(<PersonScreen personId={4} />, { persona: "designAdmin" });
    expect(await screen.findByText("Villa Haddad")).toBeTruthy();
    expect(screen.getByText("2h 00m")).toBeTruthy();
  });

  it("neither shows nor asks for work without work_entry:view_all", async () => {
    serve();
    await renderWithProviders(<PersonScreen personId={4} />, {
      persona: withPermissions(personas.designAdmin, { revoke: [P.WORK_ENTRY_VIEW_ALL] }),
    });
    await screen.findByRole("button", { name: "Call" });
    expect(screen.queryByText("Recent work")).toBeNull();
    expect(entriesAsked).toBe(0);
  });

  it("says so when the person can't be found", async () => {
    server.use(
      http.get(api("/employees/99"), () =>
        HttpResponse.json({ code: "not_found", message: "Not found" }, { status: 404 }),
      ),
    );
    await renderWithProviders(<PersonScreen personId={99} />, { persona: "designAdmin" });
    expect(await screen.findByText(/doesn't exist or isn't visible/)).toBeTruthy();
  });
});

describe("PeopleScreen", () => {
  it("lists people with who is online and opens one", async () => {
    server.use(
      http.get(api("/employees"), () =>
        HttpResponse.json({
          items: [anEmployee({ online: true }), anEmployee({ id: 8, firstName: "Omar" })],
          page: 1,
          pageSize: 100,
          totalCount: 2,
        }),
      ),
    );
    await renderWithProviders(<PeopleScreen />, { persona: "designAdmin" });
    const row = await screen.findByRole("button", { name: /Sarah Test/ });
    expect(screen.getByText(/Online/)).toBeTruthy();
    expect(screen.getByText(/Not seen yet/)).toBeTruthy();
    await fireEvent.press(row);
    expect(router.push).toHaveBeenCalledWith({ pathname: "/people/[id]", params: { id: "4" } });
  });
});
