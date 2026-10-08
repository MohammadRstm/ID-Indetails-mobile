import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { http, HttpResponse } from "msw";
import type { Project } from "@/api/types";
import { companyOverview, employee, failedSendNotification, projectWithMoney } from "@test/billing";
import { api } from "@test/handlers";
import { renderWithProviders } from "@test/render";
import { server } from "@test/server";
import { PersonSecurityActions } from "../people/slots/PersonSecurityActions";
import { ProjectMoney } from "../projects/slots/ProjectMoney";
import { CompanyTodayScreen } from "../today/company/screens/CompanyTodayScreen";

jest.mock("expo-router", () => ({
  router: { back: jest.fn(), push: jest.fn(), canGoBack: () => true },
}));

function serveCompany() {
  server.use(
    http.get(api("/company/overview"), () => HttpResponse.json(companyOverview())),
    http.get(api("/finance/design/attention"), () => HttpResponse.json([])),
    http.get(api("/finance/execution/attention"), () => HttpResponse.json([])),
    http.get(api("/invoices"), () =>
      HttpResponse.json({ items: [], page: 1, pageSize: 1, totalCount: 3 }),
    ),
    http.get(api("/notifications/unread-count"), () => HttpResponse.json({ unread: 5 })),
    http.get(api("/notifications"), () =>
      HttpResponse.json({
        items: [failedSendNotification(1), failedSendNotification(2)],
        page: 1,
        pageSize: 50,
        totalCount: 2,
      }),
    ),
  );
}

describe("CompanyTodayScreen", () => {
  it("shows a super admin the month, the domains and what needs chasing", async () => {
    serveCompany();
    await renderWithProviders(<CompanyTodayScreen />, { persona: "superAdmin" });
    expect(await screen.findByText("The month so far")).toBeTruthy();
    expect(await screen.findByLabelText("Overdue invoices: 3")).toBeTruthy();
    expect(await screen.findByLabelText("Automatic sends that failed: 2")).toBeTruthy();
    expect(await screen.findByLabelText("Unread alerts: 5")).toBeTruthy();
    expect(screen.getAllByText("Design").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Execution").length).toBeGreaterThan(0);
  });

  it("shows an admin no money and asks the API for none", async () => {
    server.use(
      http.get(api("/notifications/unread-count"), () => HttpResponse.json({ unread: 1 })),
    );
    await renderWithProviders(<CompanyTodayScreen />, { persona: "designAdmin" });
    expect(await screen.findByLabelText("Unread alerts: 1")).toBeTruthy();
    expect(screen.queryByText("The month so far")).toBeNull();
    expect(screen.queryByText("Money follow-ups")).toBeNull();
    expect(screen.queryByText("Invoices")).toBeNull();
  });

  it("shows an employee no money either", async () => {
    server.use(
      http.get(api("/notifications/unread-count"), () => HttpResponse.json({ unread: 0 })),
    );
    await renderWithProviders(<CompanyTodayScreen />, { persona: "designEmployee" });
    expect(await screen.findByLabelText("Unread alerts: 0")).toBeTruthy();
    expect(screen.queryByText("The month so far")).toBeNull();
    expect(screen.queryByText("Overdue invoices")).toBeNull();
  });
});

// Only the parts the slot reads.
const money = {
  currency: "USD",
  revenue: 9000,
  profit: 2500,
  margin: 0.28,
  cost: { total: 6500 },
  billing: { received: 4000, outstanding: 5000, overdue: 0, overdueCount: 0 },
} as unknown as NonNullable<Project["money"]>;

describe("ProjectMoney", () => {
  it("shows the money to someone who may see financials", async () => {
    await renderWithProviders(<ProjectMoney project={projectWithMoney(money)} />, {
      persona: "superAdmin",
    });
    expect(await screen.findByLabelText(/^Revenue: /)).toBeTruthy();
    expect(screen.getByLabelText(/^Profit: /)).toBeTruthy();
  });

  it("shows nothing to an admin without financials", async () => {
    await renderWithProviders(<ProjectMoney project={projectWithMoney(money)} />, {
      persona: "designAdmin",
    });
    expect(screen.queryByText("Money")).toBeNull();
  });

  it("shows nothing when the API sent no money", async () => {
    await renderWithProviders(<ProjectMoney project={projectWithMoney(null)} />, {
      persona: "superAdmin",
    });
    expect(screen.queryByText("Money")).toBeNull();
  });
});

describe("PersonSecurityActions", () => {
  it("ends a person's sessions only after a confirmation", async () => {
    let ended = false;
    server.use(
      http.post(api("/employees/12/sessions/end"), () => {
        ended = true;
        return HttpResponse.json(employee({ sessionsRevokedAt: "2026-10-08T09:00:00Z" }));
      }),
    );
    await renderWithProviders(<PersonSecurityActions person={employee()} />, {
      persona: "superAdmin",
    });
    fireEvent.press(await screen.findByText("End sessions"));
    expect(await screen.findByText("End all sessions?")).toBeTruthy();
    expect(ended).toBe(false);
    fireEvent.press(screen.getAllByText("End sessions")[1]);
    await waitFor(() => expect(ended).toBe(true));
  });

  it("offers to restore sign-in when sessions were ended", async () => {
    await renderWithProviders(
      <PersonSecurityActions person={employee({ sessionsRevokedAt: "2026-10-08T09:00:00Z" })} />,
      { persona: "superAdmin" },
    );
    expect(await screen.findByText("Restore sign-in")).toBeTruthy();
    expect(screen.queryByText("End sessions")).toBeNull();
  });

  it("is hidden without session:manage", async () => {
    await renderWithProviders(<PersonSecurityActions person={employee()} />, {
      persona: "designAdmin",
    });
    expect(screen.queryByText("Security")).toBeNull();
  });

  it("is hidden on one's own account", async () => {
    await renderWithProviders(<PersonSecurityActions person={employee({ id: 1 })} />, {
      persona: "superAdmin",
    });
    expect(screen.queryByText("Security")).toBeNull();
  });
});
