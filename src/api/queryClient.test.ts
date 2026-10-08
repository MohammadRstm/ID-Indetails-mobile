import { http as mock, HttpResponse } from "msw";
import { AppState } from "react-native";
import { tokenManager } from "@/auth/tokenManager";
import { authResponse, REFRESH_TOKEN_KEY } from "@test/auth";
import { api } from "@test/handlers";
import { secureStoreItems } from "@test/mocks/secureStore";
import { server } from "@test/server";
import { handleAppStateForQueries } from "./queryClient";

const inMinutes = (minutes: number) => new Date(Date.now() + minutes * 60_000).toISOString();

/** React Native's test AppState has no real state: set the one the code reads. */
function setAppState(state: string) {
  Object.defineProperty(AppState, "currentState", { value: state, configurable: true });
}

/** Records the order of refreshes and focus changes. */
function recorder() {
  const events: string[] = [];
  server.use(
    mock.post(api("/mobile/auth/refresh"), () => {
      events.push("refresh");
      return HttpResponse.json(authResponse({ accessToken: "a2", refreshToken: "r2" }));
    }),
  );
  return { events, setFocused: (focused: boolean) => events.push(`focused ${focused}`) };
}

beforeEach(async () => {
  await tokenManager.clearSession();
  secureStoreItems.clear();
  setAppState("active");
});

describe("returning to the foreground", () => {
  it("refreshes an access token about to run out before the queries refetch", async () => {
    await tokenManager.setSession(authResponse({ accessTokenExpiresAt: inMinutes(0.5) }));
    const { events, setFocused } = recorder();
    await handleAppStateForQueries("active", setFocused);
    expect(events).toEqual(["refresh", "focused true"]);
    expect(secureStoreItems.get(REFRESH_TOKEN_KEY)).toBe("r2");
  });

  it("refetches at once when the access token has time left", async () => {
    await tokenManager.setSession(authResponse({ accessTokenExpiresAt: inMinutes(10) }));
    const { events, setFocused } = recorder();
    await handleAppStateForQueries("active", setFocused);
    expect(events).toEqual(["focused true"]);
  });

  it("refetches even when the refresh can't reach the API", async () => {
    await tokenManager.setSession(authResponse({ accessTokenExpiresAt: inMinutes(0.5) }));
    const { events, setFocused } = recorder();
    server.use(
      mock.post(api("/mobile/auth/refresh"), () =>
        HttpResponse.json({ code: "unavailable" }, { status: 503 }),
      ),
    );
    await handleAppStateForQueries("active", setFocused);
    expect(events).toEqual(["focused true"]);
    expect(tokenManager.hasSession()).toBe(true);
  });

  it("doesn't start the refetches when the app went back to the background meanwhile", async () => {
    await tokenManager.setSession(authResponse({ accessTokenExpiresAt: inMinutes(0.5) }));
    const { events, setFocused } = recorder();
    const returning = handleAppStateForQueries("active", setFocused);
    setAppState("background");
    await returning;
    expect(events).toEqual(["refresh"]);
  });
});

describe("going to the background", () => {
  it("stops new work without refreshing", async () => {
    await tokenManager.setSession(authResponse({ accessTokenExpiresAt: inMinutes(0.5) }));
    const { events, setFocused } = recorder();
    await handleAppStateForQueries("background", setFocused);
    expect(events).toEqual(["focused false"]);
  });
});
