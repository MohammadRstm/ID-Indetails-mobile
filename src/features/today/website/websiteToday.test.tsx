import { fireEvent, screen } from "@testing-library/react-native";
import * as WebBrowser from "expo-web-browser";
import { env } from "@/config/env";
import { renderWithProviders } from "@test/render";
import { server } from "@test/server";
import TodayRoute from "../../../../app/(app)/(tabs)/today";
import { WebsiteTodayView } from "./components/WebsiteTodayView";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true },
}));
jest.mock("expo-web-browser", () => ({ openBrowserAsync: jest.fn(async () => ({})) }));
// The other Todays are tested on their own; here they only show which one the route chose.
function mockToday(text: string) {
  const { createElement } = jest.requireActual<typeof import("react")>("react");
  const { Text } = jest.requireActual<typeof import("react-native")>("react-native");
  return () => createElement(Text, null, text);
}
jest.mock("@/features/today/admin/screens/AdminTodayScreen", () => ({
  AdminTodayScreen: mockToday("admin today"),
}));
jest.mock("@/features/today/company/screens/CompanyTodayScreen", () => ({
  CompanyTodayScreen: mockToday("company today"),
}));
jest.mock("@/features/today/design/screens/DesignTodayScreen", () => ({
  DesignTodayScreen: mockToday("design today"),
}));
jest.mock("@/features/today/execution/screens/ExecutionTodayScreen", () => ({
  ExecutionTodayScreen: mockToday("execution today"),
}));

jest.setTimeout(20_000);
afterEach(() => jest.clearAllMocks());

const NOTICE = "The website is managed on the web";

describe("WebsiteTodayView", () => {
  it("greets by name and opens the website on request", async () => {
    const onOpenWebsite = jest.fn();
    await renderWithProviders(<WebsiteTodayView name="Lea" onOpenWebsite={onOpenWebsite} />);
    expect(screen.getByText("Hello, Lea")).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "Open the Website area" }));
    expect(onOpenWebsite).toHaveBeenCalledTimes(1);
  });
});

describe("the Today route", () => {
  it("tells website staff the website is managed on the web, and links to it", async () => {
    const requested: string[] = [];
    const record = ({ request }: { request: Request }) =>
      requested.push(new URL(request.url).pathname);
    server.events.on("request:start", record);
    await renderWithProviders(<TodayRoute />, { persona: "websiteAdmin" });

    expect(await screen.findByText(NOTICE)).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "Open the Website area" }));
    expect(WebBrowser.openBrowserAsync).toHaveBeenCalledWith(`${env.webUrl}/website/projects`);

    server.events.removeListener("request:start", record);
    expect(requested.filter((path) => /meetings|reports|dashboard/.test(path))).toEqual([]);
  });

  it.each([
    ["superAdmin", "company today"],
    ["designAdmin", "admin today"],
    ["executionAdmin", "admin today"],
    ["designEmployee", "design today"],
    ["executionEmployee", "execution today"],
  ] as const)("keeps %s on their own Today", async (name, shown) => {
    await renderWithProviders(<TodayRoute />, { persona: name });
    expect(await screen.findByText(shown)).toBeTruthy();
    expect(screen.queryByText(NOTICE)).toBeNull();
  });
});
