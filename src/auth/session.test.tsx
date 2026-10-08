import { act, fireEvent, screen, waitFor } from "@testing-library/react-native";
import { http, HttpResponse } from "msw";
import { Pressable, Text } from "react-native";
import { authResponse, REFRESH_TOKEN_KEY } from "@test/auth";
import { api } from "@test/handlers";
import { secureStoreItems } from "@test/mocks/secureStore";
import { personas } from "@test/personas";
import { renderWithProviders } from "@test/render";
import { server } from "@test/server";
import { useSession } from "./session";
import { tokenManager } from "./tokenManager";

function SessionProbe() {
  const { status, user, signIn, signOut } = useSession();
  return (
    <>
      <Text>{status}</Text>
      <Text>{user?.firstName ?? "nobody"}</Text>
      <Pressable onPress={() => void signIn("sarah@hourline.test", "a long password")}>
        <Text>sign in</Text>
      </Pressable>
      <Pressable onPress={() => void signOut()}>
        <Text>sign out</Text>
      </Pressable>
    </>
  );
}

beforeEach(async () => {
  await tokenManager.clearSession();
  secureStoreItems.clear();
});

describe("SessionProvider", () => {
  it("is signed out when nothing is stored", async () => {
    await renderWithProviders(<SessionProbe />, { persona: null });
    expect(await screen.findByText("signedOut")).toBeTruthy();
  });

  it("restores the stored session at start", async () => {
    secureStoreItems.set(REFRESH_TOKEN_KEY, "refresh-1");
    server.use(
      http.post(api("/mobile/auth/refresh"), () =>
        HttpResponse.json(authResponse({ refreshToken: "refresh-2" })),
      ),
      http.get(api("/auth/me"), () => HttpResponse.json(personas.executionEmployee)),
    );
    await renderWithProviders(<SessionProbe />, { persona: null });
    expect(await screen.findByText("signedIn")).toBeTruthy();
    expect(screen.getByText("Tarek")).toBeTruthy();
    expect(secureStoreItems.get(REFRESH_TOKEN_KEY)).toBe("refresh-2");
  });

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
    expect(body).toEqual({ email: "sarah@hourline.test", password: "a long password" });
    expect(secureStoreItems.get(REFRESH_TOKEN_KEY)).toBe("refresh-new");
  });

  it("signs out locally even when the API can't be reached", async () => {
    await tokenManager.setSession(authResponse());
    server.use(http.post(api("/mobile/auth/logout"), () => HttpResponse.error()));
    const { queryClient } = await renderWithProviders(<SessionProbe />);
    queryClient.setQueryData(["projects"], ["cached"]);

    await fireEvent.press(screen.getByText("sign out"));
    expect(await screen.findByText("signedOut")).toBeTruthy();
    expect(secureStoreItems.has(REFRESH_TOKEN_KEY)).toBe(false);
    expect(tokenManager.getAccessToken()).toBeNull();
    expect(queryClient.getQueryData(["projects"])).toBeUndefined();
  });

  it("signs out when the session ends elsewhere", async () => {
    secureStoreItems.set(REFRESH_TOKEN_KEY, "refresh-1");
    server.use(
      http.post(api("/mobile/auth/refresh"), () =>
        HttpResponse.json({ code: "refresh_token_invalid" }, { status: 401 }),
      ),
    );
    await renderWithProviders(<SessionProbe />);
    expect(screen.getByText("signedIn")).toBeTruthy();

    await act(async () => {
      await tokenManager.refresh();
    });
    await waitFor(() => expect(screen.getByText("signedOut")).toBeTruthy());
  });
});
