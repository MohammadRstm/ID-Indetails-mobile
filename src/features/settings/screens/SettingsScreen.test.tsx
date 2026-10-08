import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";
import Storage from "expo-sqlite/kv-store";
import { confirmOwner, lockSupport } from "@/auth/lock/biometrics";
import { LockProvider } from "@/auth/lock/LockProvider";
import { renderWithProviders } from "@test/render";
import { personas } from "@test/personas";
import { SettingsScreen } from "./SettingsScreen";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) },
}));
jest.mock("@/auth/lock/biometrics", () => ({
  ...jest.requireActual("@/auth/lock/biometrics"),
  lockSupport: jest.fn(),
  confirmOwner: jest.fn(),
}));

const mockedSupport = jest.mocked(lockSupport);
const mockedConfirm = jest.mocked(confirmOwner);
const LOCK_KEY = `lock.biometrics.${personas.designEmployee.id}`;

function renderSettings() {
  return renderWithProviders(
    <LockProvider>
      <SettingsScreen />
    </LockProvider>,
  );
}

beforeEach(async () => {
  jest.clearAllMocks();
  await Storage.clear();
  mockedSupport.mockResolvedValue({ biometrics: true, kind: "fingerprint" });
});

describe("SettingsScreen", () => {
  it("turns the lock on once the phone confirms its owner", async () => {
    mockedConfirm.mockResolvedValue("unlocked");
    await renderSettings();
    const toggle = await screen.findByRole("switch", { name: "Lock with Touch ID" });
    expect(toggle.props.accessibilityState.checked).toBe(false);

    await fireEvent.press(toggle);
    await waitFor(() =>
      expect(
        screen.getByRole("switch", { name: "Lock with Touch ID" }).props.accessibilityState.checked,
      ).toBe(true),
    );
    expect(await Storage.getItem(LOCK_KEY)).toBe("on");
  });

  it("leaves the lock off when the phone doesn't confirm", async () => {
    mockedConfirm.mockResolvedValue("failed");
    await renderSettings();
    await fireEvent.press(await screen.findByRole("switch", { name: "Lock with Touch ID" }));
    await waitFor(() => expect(mockedConfirm).toHaveBeenCalled());
    expect(await Storage.getItem(LOCK_KEY)).toBeNull();
  });

  it("explains that a phone without a screen lock can't lock the app", async () => {
    mockedSupport.mockResolvedValue({ biometrics: false, kind: null });
    await renderSettings();
    expect(await screen.findByText(/Set a screen lock on this phone first/)).toBeTruthy();
    expect(screen.queryByRole("switch")).toBeNull();
  });

  it("opens the notification settings and changing the password", async () => {
    await renderSettings();
    await fireEvent.press(screen.getByText("Notification settings"));
    expect(router.push).toHaveBeenCalledWith("/notifications/settings");
    await fireEvent.press(screen.getByText("Change password"));
    expect(router.push).toHaveBeenCalledWith("/change-password");
  });

  it("shows the app's version", async () => {
    await renderSettings();
    expect(screen.getByText(/^ID InDetails /)).toBeTruthy();
  });

  it("asks before signing out", async () => {
    await renderSettings();
    await fireEvent.press(screen.getByText("Sign out"));
    expect(screen.getByText("Sign out?")).toBeTruthy();
  });
});
