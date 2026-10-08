import { act, fireEvent, screen } from "@testing-library/react-native";
import { router } from "expo-router";
import { http, HttpResponse } from "msw";
import { api } from "@test/handlers";
import { renderWithProviders } from "@test/render";
import { server } from "@test/server";
import { clearToasts, ToastHost } from "@/ui";
import { AdminProjectActions } from "./AdminProjectActions";
import { aProject, anEmployee } from "./testData";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true },
}));

afterEach(async () => {
  await act(() => clearToasts());
  jest.clearAllMocks();
});

const openMenu = () => fireEvent.press(screen.getByRole("button", { name: "Project actions" }));

describe("AdminProjectActions", () => {
  it("offers the status changes the API allows from the project's status", async () => {
    await renderWithProviders(<AdminProjectActions project={aProject()} />, {
      persona: "designAdmin",
    });
    await openMenu();
    for (const label of ["Put on hold", "Complete project", "Archive"]) {
      expect(screen.getByRole("button", { name: label })).toBeTruthy();
    }
    expect(screen.queryByRole("button", { name: "Resume" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Reopen" })).toBeNull();
  });

  it("offers archive and reopen for a completed project", async () => {
    await renderWithProviders(
      <AdminProjectActions project={aProject({ status: "completed" })} />,
      { persona: "executionAdmin" },
    );
    await openMenu();
    expect(screen.getByRole("button", { name: "Archive" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Reopen" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Put on hold" })).toBeNull();
  });

  it("asks first, then changes the status and says so", async () => {
    const calls: string[] = [];
    server.use(
      http.post(api("/projects/7/hold"), ({ request }) => {
        calls.push(request.url);
        return HttpResponse.json(aProject({ status: "hold" }));
      }),
    );
    await renderWithProviders(
      <>
        <AdminProjectActions project={aProject()} />
        <ToastHost />
      </>,
      { persona: "designAdmin" },
    );
    await openMenu();
    await fireEvent.press(screen.getByRole("button", { name: "Put on hold" }));
    expect(screen.getByText("Put Villa Haddad on hold?")).toBeTruthy();
    expect(calls).toHaveLength(0);

    await fireEvent.press(screen.getByRole("button", { name: "Put on hold" }));
    expect(await screen.findByText("Villa Haddad is now on hold")).toBeTruthy();
    expect(calls).toHaveLength(1);
  });

  it("changes nothing when the confirmation is cancelled", async () => {
    let called = false;
    server.use(
      http.post(api("/projects/7/archive"), () => {
        called = true;
        return HttpResponse.json(aProject({ status: "archived" }));
      }),
    );
    await renderWithProviders(<AdminProjectActions project={aProject()} />, {
      persona: "superAdmin",
    });
    await openMenu();
    await fireEvent.press(screen.getByRole("button", { name: "Archive" }));
    await fireEvent.press(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByText("Archive Villa Haddad?")).toBeNull();
    expect(called).toBe(false);
  });

  it("explains the API's refusal to complete a site with unsent materials", async () => {
    server.use(
      http.post(api("/projects/7/complete"), () =>
        HttpResponse.json(
          {
            type: "business_rule",
            code: "materials_not_sent",
            message: "Send the materials first.",
            errors: null,
          },
          { status: 422 },
        ),
      ),
    );
    await renderWithProviders(
      <>
        <AdminProjectActions project={aProject({ domain: "execution" })} />
        <ToastHost />
      </>,
      { persona: "executionAdmin" },
    );
    await openMenu();
    await fireEvent.press(screen.getByRole("button", { name: "Complete project" }));
    expect(screen.getByText(/No new materials or labour can be added/)).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "Complete project" }));
    expect(await screen.findByText("The status didn't change")).toBeTruthy();
    expect(screen.getByText(/Send a client statement first/)).toBeTruthy();
  });

  it("changes the owner, keeping the project's other details", async () => {
    let body: unknown;
    server.use(
      http.get(api("/employees"), ({ request }) => {
        const role = new URL(request.url).searchParams.get("role");
        const items =
          role === "admin"
            ? [anEmployee({ id: 2, firstName: "Nadia", role: "admin" }), anEmployee({ id: 9, firstName: "Omar", role: "admin" })]
            : [];
        return HttpResponse.json({ items, page: 1, pageSize: 100, totalCount: items.length });
      }),
      http.put(api("/projects/7"), async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(aProject({ owner: { id: 9, name: "Omar Test" } }));
      }),
    );
    await renderWithProviders(
      <>
        <AdminProjectActions project={aProject()} />
        <ToastHost />
      </>,
      { persona: "designAdmin" },
    );
    await openMenu();
    await fireEvent.press(screen.getByRole("button", { name: /Change owner/ }));
    await fireEvent.press(await screen.findByRole("button", { name: /Omar Test/ }));
    expect(await screen.findByText("Omar Test now owns Villa Haddad")).toBeTruthy();
    expect(body).toEqual({
      title: "Villa Haddad",
      description: "Full interior",
      location: "Beirut",
      icon: null,
      tint: null,
      targetDate: "2026-12-01",
      ownerId: 9,
    });
  });

  it("opens the project's activity and Proton about it", async () => {
    await renderWithProviders(<AdminProjectActions project={aProject()} />, {
      persona: "designAdmin",
    });
    await openMenu();
    await fireEvent.press(screen.getByRole("button", { name: "Activity" }));
    expect(router.push).toHaveBeenCalledWith({
      pathname: "/projects/[id]/activity",
      params: { id: "7" },
    });
    await openMenu();
    await fireEvent.press(screen.getByRole("button", { name: "Ask Proton about it" }));
    expect(router.push).toHaveBeenLastCalledWith({
      pathname: "/proton",
      params: { about: "project", id: "7", area: "design" },
    });
  });

  it("shows nothing to employees", async () => {
    await renderWithProviders(<AdminProjectActions project={aProject()} />, {
      persona: "designEmployee",
    });
    expect(screen.queryByRole("button", { name: "Project actions" })).toBeNull();
  });

  it("leaves status changes out for someone who can't change them", async () => {
    await renderWithProviders(<AdminProjectActions project={aProject()} />, {
      persona: "customGrants",
    });
    expect(screen.queryByRole("button", { name: "Project actions" })).toBeNull();
  });
});
