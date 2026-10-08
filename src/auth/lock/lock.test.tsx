import { act, fireEvent, screen, waitFor } from "@testing-library/react-native";
import Storage from "expo-sqlite/kv-store";
import { http, HttpResponse } from "msw";
import {
  AppState,
  Pressable,
  Text,
  type AppStateStatus,
  type NativeEventSubscription,
} from "react-native";
import { authResponse, REFRESH_TOKEN_KEY } from "@test/auth";
import { api } from "@test/handlers";
import { secureStoreItems } from "@test/mocks/secureStore";
import { personas } from "@test/personas";
import { renderWithProviders } from "@test/render";
import { server } from "@test/server";
import { useSession } from "../session";
import { tokenManager } from "../tokenManager";
import { afterUnlock } from "./afterUnlock";
import { confirmOwner, lockSupport, type UnlockResult } from "./biometrics";
import { LockOverlay } from "./LockOverlay";
import { LockProvider, useLock } from "./LockProvider";
import { RELOCK_AFTER_MS } from "./lockRules";

jest.mock("./biometrics", () => ({
  ...jest.requireActual("./biometrics"),
  lockSupport: jest.fn(),
  confirmOwner: jest.fn(),
}));

const mockedSupport = jest.mocked(lockSupport);
const mockedConfirm = jest.mocked(confirmOwner);

const person = personas.designEmployee;
const LOCK_KEY = `lock.biometrics.${person.id}`;

// React Native's test AppState never changes: the app's moves are played by hand.
const appStateListeners = new Set<(state: AppStateStatus) => void>();

function setAppState(state: AppStateStatus) {
  Object.defineProperty(AppState, "currentState", { value: state, configurable: true });
}

async function moveApp(state: AppStateStatus) {
  setAppState(state);
  await act(async () => {
    appStateListeners.forEach((listener) => listener(state));
  });
}

function Probe() {
  const { status, signIn } = useSession();
  const lock = useLock();
  return (
    <>
      <Text>{status}</Text>
      <Text>{lock.locked ? "locked" : "open"}</Text>
      <Text>{lock.enabled ? "lock on" : "lock off"}</Text>
      <Pressable onPress={() => void signIn("sarah@hourline.test", "a long password")}>
        <Text>sign in</Text>
      </Pressable>
    </>
  );
}

function renderApp() {
  return renderWithProviders(
    <LockProvider>
      <Probe />
      <LockOverlay />
    </LockProvider>,
    { persona: null },
  );
}

/** A session stored on the phone from last time, with the person known. */
async function storedSession(lockOn: boolean | null) {
  secureStoreItems.set(REFRESH_TOKEN_KEY, "refresh-1");
  await Storage.setItem("session.user", JSON.stringify(person));
  if (lockOn !== null) await Storage.setItem(LOCK_KEY, lockOn ? "on" : "off");
}

let now = 1_000_000;
let spies: jest.SpyInstance[] = [];

// The first render of a suite loads much of the app, slowly on a throttled run.
jest.setTimeout(20_000);

beforeEach(async () => {
  await tokenManager.clearSession();
  secureStoreItems.clear();
  await Storage.clear();
  appStateListeners.clear();
  setAppState("active");
  now = 1_000_000;
  spies = [
    jest.spyOn(Date, "now").mockImplementation(() => now),
    jest.spyOn(AppState, "addEventListener").mockImplementation((_type, listener) => {
      appStateListeners.add(listener as (state: AppStateStatus) => void);
      return {
        remove: () => appStateListeners.delete(listener as (state: AppStateStatus) => void),
      } as NativeEventSubscription;
    }),
  ];
  mockedSupport.mockResolvedValue({ biometrics: true, kind: "fingerprint" });
  mockedConfirm.mockReset();
  server.use(
    http.post(api("/mobile/auth/refresh"), () =>
      HttpResponse.json(authResponse({ refreshToken: "refresh-2", user: person })),
    ),
    http.post(api("/mobile/auth/login"), () => HttpResponse.json(authResponse({ user: person }))),
    http.post(api("/mobile/auth/logout"), () => new HttpResponse(null, { status: 204 })),
  );
});

afterEach(() => {
  spies.forEach((spy) => spy.mockRestore());
});

describe("on a cold start", () => {
  it("opens locked when the person turned the lock on, and asks the phone at once", async () => {
    await storedSession(true);
    let answer: (result: UnlockResult) => void = () => {};
    mockedConfirm.mockImplementation(() => new Promise((resolve) => (answer = resolve)));

    await renderApp();
    expect(await screen.findByText("ID InDetails is locked")).toBeTruthy();
    expect(screen.getByText("locked")).toBeTruthy();
    expect(mockedConfirm).toHaveBeenCalledTimes(1);

    await act(async () => answer("unlocked"));
    expect(await screen.findByText("open")).toBeTruthy();
    expect(screen.queryByText("ID InDetails is locked")).toBeNull();
  });

  it("opens straight away when the lock is off", async () => {
    await storedSession(false);
    await renderApp();
    expect(await screen.findByText("signedIn")).toBeTruthy();
    expect(screen.getByText("open")).toBeTruthy();
    expect(mockedConfirm).not.toHaveBeenCalled();
  });
});

describe("unlocking", () => {
  it("offers to sign out after unlocking fails twice", async () => {
    await storedSession(true);
    mockedConfirm.mockResolvedValue("failed");
    await renderApp();
    await screen.findByText("ID InDetails is locked");
    await waitFor(() => expect(mockedConfirm).toHaveBeenCalledTimes(1));
    expect(screen.queryByText("Sign out")).toBeNull();

    await fireEvent.press(screen.getByText("Unlock"));
    expect(await screen.findByText("Sign out")).toBeTruthy();

    await fireEvent.press(screen.getByText("Sign out"));
    expect(await screen.findByText("signedOut")).toBeTruthy();
    expect(screen.queryByText("ID InDetails is locked")).toBeNull();
  });

  it("leaves only signing out when the phone has no screen lock any more", async () => {
    await storedSession(true);
    mockedConfirm.mockResolvedValue("unavailable");
    await renderApp();
    expect(await screen.findByText(/no longer has a screen lock/)).toBeTruthy();
    expect(screen.queryByText("Unlock")).toBeNull();
    expect(screen.getByText("Sign out")).toBeTruthy();
  });

  it("holds work such as opening a tapped push until it is unlocked", async () => {
    await storedSession(true);
    let answer: (result: UnlockResult) => void = () => {};
    mockedConfirm.mockImplementation(() => new Promise((resolve) => (answer = resolve)));
    await renderApp();
    await screen.findByText("ID InDetails is locked");

    const openScreen = jest.fn();
    afterUnlock(openScreen);
    expect(openScreen).not.toHaveBeenCalled();

    await act(async () => answer("unlocked"));
    await waitFor(() => expect(openScreen).toHaveBeenCalledTimes(1));
  });

  it("drops held work when the person signs out instead", async () => {
    await storedSession(true);
    mockedConfirm.mockResolvedValue("failed");
    await renderApp();
    await screen.findByText("ID InDetails is locked");
    const openScreen = jest.fn();
    afterUnlock(openScreen);

    await fireEvent.press(screen.getByText("Unlock"));
    await fireEvent.press(await screen.findByText("Sign out"));
    await screen.findByText("signedOut");
    expect(openScreen).not.toHaveBeenCalled();
  });
});

describe("returning from the background", () => {
  async function unlockedApp() {
    await storedSession(true);
    mockedConfirm.mockResolvedValue("unlocked");
    await renderApp();
    expect(await screen.findByText("open")).toBeTruthy();
    mockedConfirm.mockClear();
  }

  it("covers the app while it is away", async () => {
    await unlockedApp();
    await moveApp("inactive");
    expect(screen.getByLabelText("ID InDetails")).toBeTruthy();
    await moveApp("active");
    expect(screen.queryByLabelText("ID InDetails")).toBeNull();
  });

  it("stays open after less than 5 minutes away", async () => {
    await unlockedApp();
    await moveApp("background");
    now += RELOCK_AFTER_MS - 1_000;
    await moveApp("active");
    expect(screen.getByText("open")).toBeTruthy();
  });

  it("locks again after 5 minutes away", async () => {
    await unlockedApp();
    mockedConfirm.mockImplementation(() => new Promise(() => {}));
    await moveApp("background");
    now += RELOCK_AFTER_MS;
    await moveApp("active");
    expect(await screen.findByText("ID InDetails is locked")).toBeTruthy();
    expect(mockedConfirm).toHaveBeenCalledTimes(1);
  });
});

describe("after signing in with the password", () => {
  it("is open, and offers the lock once", async () => {
    await renderApp();
    await screen.findByText("signedOut");
    await fireEvent.press(screen.getByText("sign in"));
    expect(await screen.findByText("Unlock with Touch ID?")).toBeTruthy();
    expect(screen.getByText("open")).toBeTruthy();

    await fireEvent.press(screen.getByText("Not now"));
    await waitFor(() => expect(screen.queryByText("Unlock with Touch ID?")).toBeNull());
    expect(await Storage.getItem(LOCK_KEY)).toBe("off");
  });

  it("turns the lock on once the phone confirms its owner", async () => {
    mockedConfirm.mockResolvedValue("unlocked");
    await renderApp();
    await screen.findByText("signedOut");
    await fireEvent.press(screen.getByText("sign in"));
    await fireEvent.press(await screen.findByText("Use Touch ID"));
    expect(await screen.findByText("lock on")).toBeTruthy();
    expect(await Storage.getItem(LOCK_KEY)).toBe("on");
  });

  it("doesn't offer it on a phone without biometrics", async () => {
    mockedSupport.mockResolvedValue({ biometrics: false, kind: "passcode" });
    await renderApp();
    await screen.findByText("signedOut");
    await fireEvent.press(screen.getByText("sign in"));
    await screen.findByText("signedIn");
    expect(screen.queryByText(/^Unlock with/)).toBeNull();
  });

  it("doesn't ask a person who already answered", async () => {
    await Storage.setItem(LOCK_KEY, "off");
    await renderApp();
    await screen.findByText("signedOut");
    await fireEvent.press(screen.getByText("sign in"));
    await screen.findByText("signedIn");
    expect(screen.queryByText("Unlock with Touch ID?")).toBeNull();
  });
});
