import { delay, http, HttpResponse } from "msw";
import { isApiError } from "@/api/errors";
import { authResponse, REFRESH_TOKEN_KEY } from "@test/auth";
import { api } from "@test/handlers";
import { secureStoreItems, setItemAsync } from "@test/mocks/secureStore";
import { server } from "@test/server";
import { REFRESH_RETRY_DELAYS_MS, tokenManager } from "./tokenManager";

/** Answers refreshes with new tokens, counting them and recording the tokens presented. */
function refreshCounter(
  answer = authResponse({ accessToken: "access-2", refreshToken: "refresh-2" }),
) {
  const presented: string[] = [];
  server.use(
    http.post(api("/mobile/auth/refresh"), async ({ request }) => {
      presented.push(((await request.json()) as { refreshToken: string }).refreshToken);
      await delay(20);
      return HttpResponse.json(answer);
    }),
  );
  return presented;
}

/** Fails the first `failures` refreshes as if the network dropped them, then answers. */
function flakyRefresh(failures: number) {
  const presented: string[] = [];
  server.use(
    http.post(api("/mobile/auth/refresh"), async ({ request }) => {
      presented.push(((await request.json()) as { refreshToken: string }).refreshToken);
      if (presented.length <= failures) return HttpResponse.error();
      return HttpResponse.json(
        authResponse({ accessToken: "access-2", refreshToken: "refresh-2" }),
      );
    }),
  );
  return presented;
}

const realDelays = [...REFRESH_RETRY_DELAYS_MS];

beforeAll(() => {
  // The real waits add up to seconds; the order and count of the tries is what is tested here.
  REFRESH_RETRY_DELAYS_MS.splice(0, realDelays.length, 1, 1, 1);
});

afterAll(() => {
  REFRESH_RETRY_DELAYS_MS.splice(0, realDelays.length, ...realDelays);
});

beforeEach(async () => {
  await tokenManager.clearSession();
  secureStoreItems.clear();
  secureStoreItems.set(REFRESH_TOKEN_KEY, "refresh-1");
  setItemAsync.mockClear();
});

describe("tokenManager.refresh", () => {
  it("runs one refresh for many callers at once", async () => {
    const presented = refreshCounter();
    const tokens = await Promise.all(Array.from({ length: 6 }, () => tokenManager.refresh()));
    expect(presented).toEqual(["refresh-1"]);
    expect(tokens).toEqual(Array(6).fill("access-2"));
  });

  it("stores the new refresh token before the new access token is used", async () => {
    refreshCounter();
    let accessWhileStoring: string | null | undefined;
    setItemAsync.mockImplementationOnce(async (key: string, value: string) => {
      accessWhileStoring = tokenManager.getAccessToken();
      secureStoreItems.set(key, value);
    });

    await expect(tokenManager.refresh()).resolves.toBe("access-2");
    expect(accessWhileStoring).toBeNull();
    expect(secureStoreItems.get(REFRESH_TOKEN_KEY)).toBe("refresh-2");
    expect(tokenManager.getAccessToken()).toBe("access-2");
  });

  it("keeps the store on this device only, out of backups", async () => {
    refreshCounter();
    await tokenManager.refresh();
    expect(setItemAsync).toHaveBeenCalledWith(REFRESH_TOKEN_KEY, "refresh-2", {
      keychainAccessible: 4,
    });
  });

  it("ends the session when the new token can't be stored", async () => {
    refreshCounter();
    const ended = jest.fn();
    const stop = tokenManager.onSessionEnded(ended);
    setItemAsync.mockRejectedValueOnce(new Error("keystore unavailable"));

    await expect(tokenManager.refresh()).resolves.toBeNull();
    expect(tokenManager.getAccessToken()).toBeNull();
    expect(secureStoreItems.has(REFRESH_TOKEN_KEY)).toBe(false);
    expect(ended).toHaveBeenCalledWith("storage_failed");
    stop();
  });

  it.each(["refresh_token_invalid", "refresh_token_reused", "sign_in_suspended"])(
    "ends the session when the API refuses the refresh (%s)",
    async (code) => {
      server.use(
        http.post(api("/mobile/auth/refresh"), () =>
          HttpResponse.json(
            { type: "authentication", code, message: "Sign in again." },
            { status: 401 },
          ),
        ),
      );
      const ended = jest.fn();
      const stop = tokenManager.onSessionEnded(ended);

      await expect(tokenManager.refresh()).resolves.toBeNull();
      expect(ended).toHaveBeenCalledWith("expired");
      expect(secureStoreItems.has(REFRESH_TOKEN_KEY)).toBe(false);
      expect(tokenManager.hasSession()).toBe(false);
      stop();
    },
  );

  it("tries a refresh that got no answer again, with the same token", async () => {
    const presented = flakyRefresh(2);
    await expect(tokenManager.refresh()).resolves.toBe("access-2");
    expect(presented).toEqual(["refresh-1", "refresh-1", "refresh-1"]);
    expect(secureStoreItems.get(REFRESH_TOKEN_KEY)).toBe("refresh-2");
  });

  it("gives up after three more tries and keeps the session", async () => {
    const presented = flakyRefresh(99);
    const ended = jest.fn();
    const stop = tokenManager.onSessionEnded(ended);

    const failure = await tokenManager.refresh().catch((error: unknown) => error);
    expect(isApiError(failure) && failure.isNetwork).toBe(true);
    expect(presented).toEqual(Array(4).fill("refresh-1"));
    expect(secureStoreItems.get(REFRESH_TOKEN_KEY)).toBe("refresh-1");
    expect(tokenManager.hasSession()).toBe(true);
    expect(ended).not.toHaveBeenCalled();
    stop();
  });

  it("starts its last try well inside the API's 5-minute replay window", () => {
    const requestTimeout = 30_000;
    const latestStart =
      realDelays.reduce((sum, ms) => sum + ms, 0) + realDelays.length * requestTimeout;
    expect(realDelays).toHaveLength(3);
    expect(latestStart).toBeLessThan(5 * 60_000);
  });

  it.each([
    ["the API is down", 503, "unavailable"],
    ["the API rate-limits", 429, "too_many_requests"],
  ] as const)("keeps the session without trying again when %s", async (_, status, code) => {
    let calls = 0;
    server.use(
      http.post(api("/mobile/auth/refresh"), () => {
        calls++;
        return HttpResponse.json({ code }, { status });
      }),
    );
    const ended = jest.fn();
    const stop = tokenManager.onSessionEnded(ended);

    const failure = await tokenManager.refresh().catch((error: unknown) => error);
    expect(isApiError(failure) && failure.status).toBe(status);
    expect(calls).toBe(1);
    expect(secureStoreItems.get(REFRESH_TOKEN_KEY)).toBe("refresh-1");
    expect(ended).not.toHaveBeenCalled();
    stop();
  });

  it("starts a new refresh once the last one has finished", async () => {
    const presented = refreshCounter();
    await tokenManager.refresh();
    await tokenManager.refresh();
    expect(presented).toEqual(["refresh-1", "refresh-2"]);
  });

  it("ends a known session whose token is gone from the store", async () => {
    await tokenManager.setSession(authResponse());
    secureStoreItems.clear();
    const ended = jest.fn();
    const stop = tokenManager.onSessionEnded(ended);
    await expect(tokenManager.refresh()).resolves.toBeNull();
    expect(ended).toHaveBeenCalledWith("expired");
    stop();
  });

  it("has nothing to end when no session is stored or known", async () => {
    secureStoreItems.clear();
    const ended = jest.fn();
    const stop = tokenManager.onSessionEnded(ended);
    await expect(tokenManager.refresh()).resolves.toBeNull();
    expect(ended).not.toHaveBeenCalled();
    stop();
  });

  it("tells its listeners what the API answered", async () => {
    const answer = authResponse({ accessToken: "access-2", refreshToken: "refresh-2" });
    refreshCounter(answer);
    const refreshed = jest.fn();
    const stop = tokenManager.onRefreshed(refreshed);
    await tokenManager.refresh();
    expect(refreshed).toHaveBeenCalledWith(answer);
    stop();
  });

  it("drops an answer that arrives after signing out", async () => {
    refreshCounter();
    const refreshing = tokenManager.refresh();
    await tokenManager.clearSession();

    await expect(refreshing).resolves.toBeNull();
    expect(tokenManager.getAccessToken()).toBeNull();
    expect(secureStoreItems.has(REFRESH_TOKEN_KEY)).toBe(false);
  });
});

describe("tokenManager.getRefreshToken", () => {
  it("waits for a refresh in flight, so the newest token is the one handed out", async () => {
    refreshCounter();
    void tokenManager.refresh();
    await expect(tokenManager.getRefreshToken()).resolves.toBe("refresh-2");
  });
});

describe("tokenManager.expiresWithin and refreshIfExpiring", () => {
  const inMinutes = (minutes: number) => new Date(Date.now() + minutes * 60_000).toISOString();

  it("knows when the access token runs out", async () => {
    expect(tokenManager.expiresWithin(60_000)).toBe(true);
    await tokenManager.setSession(authResponse({ accessTokenExpiresAt: inMinutes(10) }));
    expect(tokenManager.expiresWithin(60_000)).toBe(false);
    await tokenManager.setSession(authResponse({ accessTokenExpiresAt: inMinutes(0.5) }));
    expect(tokenManager.expiresWithin(60_000)).toBe(true);
  });

  it("refreshes when the access token is about to run out", async () => {
    await tokenManager.setSession(authResponse({ accessTokenExpiresAt: inMinutes(0.5) }));
    const presented = refreshCounter();
    await tokenManager.refreshIfExpiring(60_000);
    expect(presented).toHaveLength(1);
    expect(tokenManager.getAccessToken()).toBe("access-2");
  });

  it("leaves a token with time left alone", async () => {
    await tokenManager.setSession(authResponse({ accessTokenExpiresAt: inMinutes(10) }));
    const presented = refreshCounter();
    await tokenManager.refreshIfExpiring(60_000);
    expect(presented).toHaveLength(0);
  });

  it("does nothing without a session, so a signed-out phone never hears its session ended", async () => {
    const presented = refreshCounter();
    const ended = jest.fn();
    const stop = tokenManager.onSessionEnded(ended);
    await tokenManager.refreshIfExpiring(60_000);
    expect(presented).toHaveLength(0);
    expect(ended).not.toHaveBeenCalled();
    stop();
  });

  it("doesn't fail when the API can't be reached", async () => {
    await tokenManager.setSession(authResponse({ accessTokenExpiresAt: inMinutes(0.5) }));
    server.use(http.post(api("/mobile/auth/refresh"), () => HttpResponse.error()));
    await expect(tokenManager.refreshIfExpiring(60_000)).resolves.toBeUndefined();
    expect(tokenManager.hasSession()).toBe(true);
  });
});

describe("tokenManager.setSession", () => {
  it("stores the refresh token and keeps the access token in memory only", async () => {
    await tokenManager.setSession(authResponse({ accessToken: "a", refreshToken: "r" }));
    expect(secureStoreItems.get(REFRESH_TOKEN_KEY)).toBe("r");
    expect(tokenManager.getAccessToken()).toBe("a");
    expect([...secureStoreItems.values()]).not.toContain("a");
  });

  it("keeps the old tokens when the new refresh token can't be stored", async () => {
    await tokenManager.setSession(authResponse({ accessToken: "a", refreshToken: "r" }));
    setItemAsync.mockRejectedValueOnce(new Error("keystore unavailable"));
    await expect(
      tokenManager.setSession(authResponse({ accessToken: "b", refreshToken: "s" })),
    ).rejects.toThrow();
    expect(tokenManager.getAccessToken()).toBe("a");
  });
});
