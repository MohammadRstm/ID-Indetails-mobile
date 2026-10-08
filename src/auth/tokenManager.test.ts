import { delay, http, HttpResponse } from "msw";
import { isApiError } from "@/api/errors";
import { authResponse, REFRESH_TOKEN_KEY } from "@test/auth";
import { api } from "@test/handlers";
import { secureStoreItems, setItemAsync } from "@test/mocks/secureStore";
import { server } from "@test/server";
import { tokenManager } from "./tokenManager";

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

  it("ends the session when the API refuses the refresh", async () => {
    server.use(
      http.post(api("/mobile/auth/refresh"), () =>
        HttpResponse.json(
          { type: "authentication", code: "refresh_token_invalid", message: "Sign in again." },
          { status: 401 },
        ),
      ),
    );
    const ended = jest.fn();
    const stop = tokenManager.onSessionEnded(ended);

    await expect(tokenManager.refresh()).resolves.toBeNull();
    expect(ended).toHaveBeenCalledWith("expired");
    expect(secureStoreItems.has(REFRESH_TOKEN_KEY)).toBe(false);
    stop();
  });

  it.each([
    ["the network fails", () => HttpResponse.error(), 0],
    ["the API is down", () => HttpResponse.json({ code: "unavailable" }, { status: 503 }), 503],
    [
      "the API rate-limits",
      () => HttpResponse.json({ code: "rate_limited" }, { status: 429 }),
      429,
    ],
  ] as const)("keeps the session when %s", async (_, answer, status) => {
    server.use(http.post(api("/mobile/auth/refresh"), answer));
    const ended = jest.fn();
    const stop = tokenManager.onSessionEnded(ended);

    const failure = await tokenManager.refresh().catch((error: unknown) => error);
    expect(isApiError(failure) && failure.status).toBe(status);
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

  it("ends the session when there is no stored token", async () => {
    secureStoreItems.clear();
    await expect(tokenManager.refresh()).resolves.toBeNull();
  });
});

describe("tokenManager.setSession", () => {
  it("stores the refresh token and keeps the access token in memory only", async () => {
    await tokenManager.setSession(authResponse({ accessToken: "a", refreshToken: "r" }));
    expect(secureStoreItems.get(REFRESH_TOKEN_KEY)).toBe("r");
    expect(tokenManager.getAccessToken()).toBe("a");
    expect([...secureStoreItems.values()]).not.toContain("a");
  });
});
