import { screen } from "@testing-library/react-native";
import { http, HttpResponse } from "msw";
import { invoice } from "@test/billing";
import { api } from "@test/handlers";
import { renderWithProviders } from "@test/render";
import { server } from "@test/server";
import { INVOICE_FILTER_VALUES, InvoicesScreen } from "./InvoicesScreen";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), back: jest.fn(), canGoBack: () => true },
}));

function serveInvoices(asked: URLSearchParams[]) {
  server.use(
    http.get(api("/invoices"), ({ request }) => {
      asked.push(new URL(request.url).searchParams);
      return HttpResponse.json({
        items: [invoice({ isOverdue: true })],
        page: 1,
        pageSize: 25,
        totalCount: 1,
      });
    }),
  );
}

describe("the invoice list", () => {
  it("starts on the overdue invoices when a link asks for them", async () => {
    const asked: URLSearchParams[] = [];
    serveInvoices(asked);
    await renderWithProviders(<InvoicesScreen initialFilter="overdue" />, {
      persona: "superAdmin",
    });
    expect(await screen.findByText(/Habib Holdings/)).toBeTruthy();
    expect(asked[0]?.get("overdue")).toBe("true");
    expect(screen.getByRole("button", { name: "Overdue", selected: true })).toBeTruthy();
  });

  it("starts on everything without a link's filter", async () => {
    const asked: URLSearchParams[] = [];
    serveInvoices(asked);
    await renderWithProviders(<InvoicesScreen />, { persona: "superAdmin" });
    await screen.findByText(/Habib Holdings/);
    expect(asked[0]?.has("overdue")).toBe(false);
    expect(screen.getByRole("button", { name: "All", selected: true })).toBeTruthy();
  });

  it("accepts the same words as its filter chips", () => {
    expect(INVOICE_FILTER_VALUES).toEqual(["all", "overdue", "sent", "draft"]);
  });
});
