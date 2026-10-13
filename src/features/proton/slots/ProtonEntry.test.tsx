import { fireEvent, screen } from "@testing-library/react-native";
import { router } from "expo-router";
import { AccessibilityInfo } from "react-native";
import { P } from "@/permissions/codes";
import { personas, withPermissions, type PersonaName } from "@test/personas";
import { renderWithProviders } from "@test/render";
import { ProtonEntry } from "./ProtonEntry";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true },
}));

beforeEach(() => {
  jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(true);
});
afterEach(() => jest.clearAllMocks());

const button = () => screen.queryByRole("button", { name: "Ask Proton" });

describe("ProtonEntry", () => {
  it.each<[PersonaName, boolean]>([
    ["superAdmin", true],
    ["designAdmin", true],
    ["executionAdmin", true],
    ["designEmployee", false],
    ["executionEmployee", false],
  ])("for %s, shown: %s", async (persona, shown) => {
    await renderWithProviders(<ProtonEntry page="dashboard" />, { persona });
    expect(button() != null).toBe(shown);
  });

  it("is shown to an employee who was granted proton:use", async () => {
    await renderWithProviders(<ProtonEntry page="my_work" compact />, {
      persona: withPermissions(personas.designEmployee, { grant: [P.PROTON_USE] }),
    });
    expect(button()).toBeTruthy();
  });

  it("is hidden from an admin who lost proton:use", async () => {
    await renderWithProviders(<ProtonEntry page="my_work" compact />, {
      persona: withPermissions(personas.designAdmin, { revoke: [P.PROTON_USE] }),
    });
    expect(button()).toBeNull();
  });

  it("opens Proton on its page, in the person's own area", async () => {
    await renderWithProviders(<ProtonEntry page="my_pay" compact />, { persona: "executionAdmin" });
    await fireEvent.press(screen.getByRole("button", { name: "Ask Proton" }));
    expect(router.push).toHaveBeenCalledWith({
      pathname: "/proton",
      params: { page: "my_pay", area: "execution" },
    });
  });

  it("names no area for a super admin, whose Proton is the company's", async () => {
    await renderWithProviders(<ProtonEntry page="dashboard" />, { persona: "superAdmin" });
    await fireEvent.press(screen.getByRole("button", { name: "Ask Proton" }));
    expect(router.push).toHaveBeenCalledWith({
      pathname: "/proton",
      params: { page: "dashboard" },
    });
  });

  it("shows its words unless it is compact", async () => {
    await renderWithProviders(<ProtonEntry page="messages" />, { persona: "designAdmin" });
    expect(screen.getByText("Ask Proton")).toBeTruthy();
  });

  it("is only the blob when compact", async () => {
    await renderWithProviders(<ProtonEntry page="messages" compact />, { persona: "designAdmin" });
    expect(screen.queryByText("Ask Proton")).toBeNull();
    expect(button()).toBeTruthy();
  });
});
