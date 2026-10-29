import { focusManager } from "@tanstack/react-query";
import { act, fireEvent, screen, waitFor } from "@testing-library/react-native";
import Storage from "expo-sqlite/kv-store";
import { http, HttpResponse } from "msw";
import { Pressable, Text } from "react-native";
import { P } from "@/permissions/codes";
import { authResponse, REFRESH_TOKEN_KEY, UNFINISHED_SIGN_OUTS_KEY } from "@test/auth";
import { api } from "@test/handlers";
import { secureStoreItems } from "@test/mocks/secureStore";
import { personas, withPermissions } from "@test/personas";
import { renderWithProviders } from "@test/render";
import { server } from "@test/server";
import { SERVER_UNREACHABLE_NOTICE, SESSION_ENDED_NOTICE, useSession } from "./session";
import { onSignOut } from "./signOutCleanup";
import { REFRESH_RETRY_DELAYS_MS, tokenManager } from "./tokenManager";

function SessionProbe() {
  const { status, user, notice, signedInWith, signIn, signOut, changePassword } = useSession();
  return (
    <>
      <Text>{status}</Text>
      <Text>{user?.firstName ?? "nobody"}</Text>
      <Text>{`permissions: ${user?.permissions.length ?? 0}`}</Text>
      <Text>{`must change: ${String(user?.mustChangePassword ?? false)}`}</Text>
      <Text>{`with: ${signedInWith ?? "-"}`}</Text>
      <Text>{notice ?? "no notice"}</Text>
      <Pressable onPress={() => void signIn("sarah@hourline.test", "a long password")}>
        <Text>sign in</Text>
      </Pressable>
      <Pressable onPress={() => void signOut()}>
        <Text>sign out</Text>
      </Pressable>
      <Pressable onPress={() => void changePassword("temporary pass", "my own long password")}>
        <Text>change password</Text>
      </Pressable>
    </>
  );
}

const CACHED_USER_KEY = "session.user";
const realDelays = [...REFRESH_RETRY_DELAYS_MS];

beforeAll(() => {
  REFRESH_RETRY_DELAYS_MS.splice(0, realDelays.length, 1, 1, 1);
});

afterAll(() => {
  REFRESH_RETRY_DELAYS_MS.splice(0, realDelays.length, ...realDelays);
});

beforeEach(async () => {
  await tokenManager.clearSession();
  secureStoreItems.clear();
  await Storage.clear();
});

describe("restoring the session at start", () => {
  it("is signed out when nothing is stored", async () => {
    await renderWithProviders(<SessionProbe />, { persona: null });
    expect(await screen.findByText("signedOut")).toBeTruthy();
    expect(screen.getByText("no notice")).toBeTruthy();
  });

  it("restores the stored session and keeps the new refresh token", async () => {
    secureStoreItems.set(REFRESH_TOKEN_KEY, "refresh-1");
    server.use(
      http.post(api("/mobile/auth/refresh"), () =>
        HttpResponse.json(
          authResponse({ refreshToken: "refresh-2", user: personas.executionEmployee }),
        ),
      ),
    );
    await renderWithProviders(<SessionProbe />, { persona: null });
    expect(await screen.findByText("signedIn")).toBeTruthy();
    expect(screen.getByText("Tarek")).toBeTruthy();
    expect(screen.getByText("with: storedSession")).toBeTruthy();
    expect(secureStoreItems.get(REFRESH_TOKEN_KEY)).toBe("refresh-2");
  });

  it("opens with the person known from last time when the API can't be reached", async () => {
    secureStoreItems.set(REFRESH_TOKEN_KEY, "refresh-1");
    await Storage.setItem(CACHED_USER_KEY, JSON.stringify(personas.executionEmployee));
    server.use(http.post(api("/mobile/auth/refresh"), () => HttpResponse.error()));

    await renderWithProviders(<SessionProbe />, { persona: null });
    expect(await screen.findByText("signedIn")).toBeTruthy();
    expect(screen.getByText("Tarek")).toBeTruthy();
    await waitFor(() => expect(tokenManager.hasSession()).toBe(true));
    expect(secureStoreItems.get(REFRESH_TOKEN_KEY)).toBe("refresh-1");
  });

  it("says the server can't be reached, and keeps the stored session, when nobody is known", async () => {
    secureStoreItems.set(REFRESH_TOKEN_KEY, "refresh-1");
    server.use(http.post(api("/mobile/auth/refresh"), () => HttpResponse.error()));

    await renderWithProviders(<SessionProbe />, { persona: null });
    expect(await screen.findByText("signedOut")).toBeTruthy();
    expect(screen.getByText(SERVER_UNREACHABLE_NOTICE)).toBeTruthy();
    expect(secureStoreItems.get(REFRESH_TOKEN_KEY)).toBe("refresh-1");
  });

  it("asks for the password again when the stored session has ended", async () => {
    secureStoreItems.set(REFRESH_TOKEN_KEY, "refresh-1");
    await Storage.setItem(CACHED_USER_KEY, JSON.stringify(personas.executionEmployee));
    server.use(
      http.post(api("/mobile/auth/refresh"), () =>
        HttpResponse.json({ code: "refresh_token_invalid" }, { status: 401 }),
      ),
    );
    await renderWithProviders(<SessionProbe />, { persona: null });
    expect(await screen.findByText(SESSION_ENDED_NOTICE)).toBeTruthy();
    expect(screen.getByText("signedOut")).toBeTruthy();
    expect(await Storage.getItem(CACHED_USER_KEY)).toBeNull();
  });
});

describe("signing in", () => {
  it("signs in through the mobile endpoint and keeps the refresh token", async () => {
    let body: unknown;
    server.use(
      http.post(api("/mobile/auth/login"), async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(authResponse({ refreshToken: "refresh-new" }));
      }),
    );
    await renderWithProviders(<SessionProbe />, { persona: null });
    await screen.findByText("signedOut");

    await fireEvent.press(screen.getByText("sign in"));
    expect(await screen.findByText("signedIn")).toBeTruthy();
    expect(screen.getByText("with: password")).toBeTruthy();
    expect(body).toEqual({ email: "sarah@hourline.test", password: "a long password" });
    expect(secureStoreItems.get(REFRESH_TOKEN_KEY)).toBe("refresh-new");
  });

  it("drops what the person before left in the cache", async () => {
    server.use(http.post(api("/mobile/auth/login"), () => HttpResponse.json(authResponse())));
    const { queryClient } = await renderWithProviders(<SessionProbe />, { persona: null });
    await screen.findByText("signedOut");
    queryClient.setQueryData(["projects"], ["someone else's"]);

    await fireEvent.press(screen.getByText("sign in"));
    await screen.findByText("signedIn");
    expect(queryClient.getQueryData(["projects"])).toBeUndefined();
  });
});

describe("signing out", () => {
  it("signs out locally even when the API can't be reached", async () => {
    await tokenManager.setSession(authResponse());
    server.use(http.post(api("/mobile/auth/logout"), () => HttpResponse.error()));
    const { queryClient } = await renderWithProviders(<SessionProbe />);
    queryClient.setQueryData(["projects"], ["cached"]);

    await fireEvent.press(screen.getByText("sign out"));
    expect(await screen.findByText("signedOut")).toBeTruthy();
    expect(screen.getByText("no notice")).toBeTruthy();
    expect(secureStoreItems.has(REFRESH_TOKEN_KEY)).toBe(false);
    expect(tokenManager.getAccessToken()).toBeNull();
    expect(queryClient.getQueryData(["projects"])).toBeUndefined();
  });

  it("ends this phone's session on the API with its refresh token", async () => {
    await tokenManager.setSession(authResponse({ refreshToken: "mine" }));
    let presented: unknown;
    server.use(
      http.post(api("/mobile/auth/logout"), async ({ request }) => {
        presented = await request.json();
        return new HttpResponse(null, { status: 204 });
      }),
    );
    await renderWithProviders(<SessionProbe />);
    await fireEvent.press(screen.getByText("sign out"));
    await screen.findByText("signedOut");
    expect(presented).toEqual({ refreshToken: "mine" });
    expect(secureStoreItems.has(UNFINISHED_SIGN_OUTS_KEY)).toBe(false);
  });

  it("finishes a sign-out the API didn't hear about at the next start, so its pushes stop", async () => {
    await tokenManager.setSession(authResponse({ refreshToken: "mine" }));
    server.use(http.post(api("/mobile/auth/logout"), () => HttpResponse.error()));
    const offline = await renderWithProviders(<SessionProbe />);
    await fireEvent.press(screen.getByText("sign out"));
    await screen.findByText("signedOut");
    expect(secureStoreItems.has(REFRESH_TOKEN_KEY)).toBe(false);
    expect(secureStoreItems.get(UNFINISHED_SIGN_OUTS_KEY)).toBe(JSON.stringify(["mine"]));
    await offline.unmount();

    const presented: unknown[] = [];
    server.use(
      http.post(api("/mobile/auth/logout"), async ({ request }) => {
        presented.push(await request.json());
        return new HttpResponse(null, { status: 204 });
      }),
    );
    await renderWithProviders(<SessionProbe />, { persona: null });
    await waitFor(() => expect(secureStoreItems.has(UNFINISHED_SIGN_OUTS_KEY)).toBe(false));
    expect(presented).toEqual([{ refreshToken: "mine" }]);
  });

  it("runs the registered clean-ups, saying the person chose to leave", async () => {
    await tokenManager.setSession(authResponse());
    server.use(
      http.post(api("/mobile/auth/logout"), () => new HttpResponse(null, { status: 204 })),
    );
    const cleanup = jest.fn();
    const stop = onSignOut(cleanup);
    await Storage.setItem(CACHED_USER_KEY, JSON.stringify(personas.designEmployee));
    await renderWithProviders(<SessionProbe />);

    await fireEvent.press(screen.getByText("sign out"));
    await waitFor(() => expect(cleanup).toHaveBeenCalledWith("signedOut"));
    expect(await Storage.getItem(CACHED_USER_KEY)).toBeNull();
    stop();
  });
});

describe("a session that ends elsewhere", () => {
  it("signs out with a notice, clears the cache and runs the clean-ups", async () => {
    secureStoreItems.set(REFRESH_TOKEN_KEY, "refresh-1");
    server.use(
      http.post(api("/mobile/auth/refresh"), () =>
        HttpResponse.json({ code: "refresh_token_invalid" }, { status: 401 }),
      ),
    );
    const cleanup = jest.fn();
    const stop = onSignOut(cleanup);
    const { queryClient } = await renderWithProviders(<SessionProbe />);
    queryClient.setQueryData(["projects"], ["cached"]);
    expect(screen.getByText("signedIn")).toBeTruthy();

    await act(async () => {
      await tokenManager.refresh();
    });
    await waitFor(() => expect(screen.getByText("signedOut")).toBeTruthy());
    expect(screen.getByText(SESSION_ENDED_NOTICE)).toBeTruthy();
    expect(queryClient.getQueryData(["projects"])).toBeUndefined();
    await waitFor(() => expect(cleanup).toHaveBeenCalledWith("sessionEnded"));
    stop();
  });
});

describe("keeping the person up to date", () => {
  it("takes the person from every refresh, so new permissions arrive", async () => {
    secureStoreItems.set(REFRESH_TOKEN_KEY, "refresh-1");
    const promoted = withPermissions(personas.designEmployee, { grant: [P.CLIENT_VIEW] });
    server.use(
      http.post(api("/mobile/auth/refresh"), () =>
        HttpResponse.json(authResponse({ refreshToken: "refresh-2", user: promoted })),
      ),
    );
    await renderWithProviders(<SessionProbe />);
    const before = personas.designEmployee.permissions.length;
    expect(screen.getByText(`permissions: ${before}`)).toBeTruthy();

    await act(async () => {
      await tokenManager.refresh();
    });
    expect(await screen.findByText(`permissions: ${before + 1}`)).toBeTruthy();
  });

  it("reads /auth/me again on returning to the foreground", async () => {
    const promoted = withPermissions(personas.designEmployee, { grant: [P.CLIENT_VIEW] });
    let reads = 0;
    server.use(
      http.get(api("/auth/me"), () => {
        reads++;
        return HttpResponse.json(promoted);
      }),
    );
    await renderWithProviders(<SessionProbe />);
    expect(reads).toBe(0);

    await act(async () => {
      focusManager.setFocused(false);
      focusManager.setFocused(true);
    });
    const after = personas.designEmployee.permissions.length + 1;
    expect(await screen.findByText(`permissions: ${after}`)).toBeTruthy();
    expect(reads).toBe(1);
    focusManager.setFocused(undefined);
  });
});

describe("changing the password", () => {
  it("keeps the new tokens and the person without a pending temporary password", async () => {
    const pending = { ...personas.designEmployee, mustChangePassword: true };
    await tokenManager.setSession(authResponse({ refreshToken: "before", user: pending }));
    let body: unknown;
    server.use(
      http.post(api("/mobile/auth/change-password"), async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(authResponse({ accessToken: "after-a", refreshToken: "after-r" }));
      }),
    );
    await renderWithProviders(<SessionProbe />, { persona: pending });
    expect(screen.getByText("must change: true")).toBeTruthy();

    await fireEvent.press(screen.getByText("change password"));
    expect(await screen.findByText("must change: false")).toBeTruthy();
    expect(body).toEqual({
      currentPassword: "temporary pass",
      newPassword: "my own long password",
    });
    expect(secureStoreItems.get(REFRESH_TOKEN_KEY)).toBe("after-r");
    expect(tokenManager.getAccessToken()).toBe("after-a");
  });
});
