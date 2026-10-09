import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { http, HttpResponse } from "msw";
import { env } from "@/config/env";
import { authResponse } from "@test/auth";
import { api } from "@test/handlers";
import { secureStoreItems } from "@test/mocks/secureStore";
import { personas } from "@test/personas";
import { renderWithProviders } from "@test/render";
import { server } from "@test/server";
import { tokenManager } from "../tokenManager";
import { ChangePasswordScreen } from "./ChangePasswordScreen";
import { ForgotPasswordScreen } from "./ForgotPasswordScreen";
import { SignInScreen } from "./SignInScreen";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => false) },
}));
jest.mock("expo-web-browser", () => ({ openBrowserAsync: jest.fn(async () => ({})) }));

const mockedRouter = jest.mocked(router);

function apiError(status: number, type: string, code: string, message: string) {
  return HttpResponse.json({ type, code, message, errors: null, traceId: "t-1" }, { status });
}

async function typeInto(label: string, text: string) {
  await fireEvent.changeText(screen.getByLabelText(label), text);
}

// The first render of a suite loads much of the app, slowly on a throttled run.
jest.setTimeout(20_000);

beforeEach(async () => {
  await tokenManager.clearSession();
  secureStoreItems.clear();
  jest.clearAllMocks();
  server.use(
    http.get(api("/company/branding"), () =>
      HttpResponse.json({ name: "Studio Haddad", hasLogo: false, logoFileId: null }),
    ),
  );
});

describe("SignInScreen", () => {
  async function signIn(email = "sarah@hourline.test", password = "a long password") {
    await renderWithProviders(<SignInScreen />, { persona: null });
    await typeInto("Work email", email);
    await typeInto("Password", password);
    await fireEvent.press(screen.getByRole("button", { name: "Sign in" }));
  }

  it("shows the company's name from its branding", async () => {
    await renderWithProviders(<SignInScreen />, { persona: null });
    expect(await screen.findByText("Studio Haddad")).toBeTruthy();
  });

  it("checks the fields before asking the API", async () => {
    let asked = false;
    server.use(
      http.post(api("/mobile/auth/login"), () => {
        asked = true;
        return HttpResponse.json(authResponse());
      }),
    );
    await renderWithProviders(<SignInScreen />, { persona: null });
    await fireEvent.press(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByText("Enter your email.")).toBeTruthy();
    expect(screen.getByText("Enter your password.")).toBeTruthy();

    await typeInto("Work email", "not an address");
    await fireEvent.press(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByText("Enter a valid email address.")).toBeTruthy();
    expect(asked).toBe(false);
  });

  it("says so when the email and password don't match", async () => {
    server.use(
      http.post(api("/mobile/auth/login"), () =>
        apiError(401, "authentication", "invalid_credentials", "Email or password is incorrect."),
      ),
    );
    await signIn();
    expect(await screen.findByText("That email and password don't match an account.")).toBeTruthy();
  });

  it("says why when a super admin has suspended the sign-in", async () => {
    const message =
      "A super admin has ended your sessions. You can sign in again once they restore your access.";
    server.use(
      http.post(api("/mobile/auth/login"), () =>
        apiError(403, "authorization", "sign_in_suspended", message),
      ),
    );
    await signIn();
    expect(await screen.findByText(message)).toBeTruthy();
  });

  it("asks to wait when there were too many attempts", async () => {
    server.use(
      http.post(api("/mobile/auth/login"), () =>
        apiError(429, "rate_limited", "too_many_requests", "Too many requests."),
      ),
    );
    await signIn();
    expect(await screen.findByText("Too many attempts. Wait a minute and try again.")).toBeTruthy();
  });

  it("says when the server can't be reached", async () => {
    server.use(http.post(api("/mobile/auth/login"), () => HttpResponse.error()));
    await signIn();
    expect(await screen.findByText(/can't be reached/)).toBeTruthy();
  });

  it("signs in with the trimmed address", async () => {
    let body: unknown;
    server.use(
      http.post(api("/mobile/auth/login"), async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(authResponse());
      }),
    );
    await signIn("  sarah@hourline.test ", "a long password");
    await waitFor(() =>
      expect(body).toEqual({ email: "sarah@hourline.test", password: "a long password" }),
    );
  });

  it("opens the website for invitation and reset links", async () => {
    await renderWithProviders(<SignInScreen />, { persona: null });
    await fireEvent.press(screen.getByRole("button", { name: "Open the website" }));
    expect(WebBrowser.openBrowserAsync).toHaveBeenCalledWith(env.webUrl);
  });
});

describe("ForgotPasswordScreen", () => {
  it("gives the same neutral answer once the link is asked for", async () => {
    let body: unknown;
    server.use(
      http.post(api("/auth/forgot-password"), async ({ request }) => {
        body = await request.json();
        return new HttpResponse(null, { status: 204 });
      }),
    );
    await renderWithProviders(<ForgotPasswordScreen />, { persona: null });
    await typeInto("Work email", "nadia@hourline.test");
    await fireEvent.press(screen.getByRole("button", { name: "Send the link" }));

    expect(await screen.findByText("Check your email")).toBeTruthy();
    expect(screen.getByText(/If an account uses nadia@hourline.test/)).toBeTruthy();
    expect(body).toEqual({ email: "nadia@hourline.test" });
  });

  it("asks to wait when there were too many attempts", async () => {
    server.use(
      http.post(api("/auth/forgot-password"), () =>
        apiError(429, "rate_limited", "too_many_requests", "Too many requests."),
      ),
    );
    await renderWithProviders(<ForgotPasswordScreen />, { persona: null });
    await typeInto("Work email", "nadia@hourline.test");
    await fireEvent.press(screen.getByRole("button", { name: "Send the link" }));
    expect(await screen.findByText("Too many attempts. Wait a minute and try again.")).toBeTruthy();
  });
});

describe("ChangePasswordScreen", () => {
  const pending = { ...personas.designEmployee, mustChangePassword: true };

  /** Renders it once the company's branding is in, so nothing updates after the test. */
  async function renderChangePassword() {
    await renderWithProviders(<ChangePasswordScreen />, { persona: pending });
    await screen.findByText("Studio Haddad");
  }

  async function fill(current: string, next: string, repeat = next) {
    await typeInto("Temporary password", current);
    await typeInto("New password", next);
    await typeInto("Repeat it", repeat);
    await fireEvent.press(screen.getByRole("button", { name: "Save password" }));
  }

  it("asks for a password of one's own while a temporary one is pending", async () => {
    await renderChangePassword();
    expect(screen.getByText("Choose your own password")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Sign out" })).toBeTruthy();
  });

  it("checks the length and the repeat before asking the API", async () => {
    await renderChangePassword();
    await fill("temporary pass", "short");
    expect(await screen.findByText("Use at least 10 characters.")).toBeTruthy();
    await fill("temporary pass", "my own long password", "my own long passwort");
    expect(await screen.findByText("The two passwords don't match.")).toBeTruthy();
  });

  it("says when the current password is wrong", async () => {
    server.use(
      http.post(api("/mobile/auth/change-password"), () =>
        apiError(400, "validation", "current_password_incorrect", "Current password is wrong."),
      ),
    );
    await renderChangePassword();
    await fill("wrong one!", "my own long password");
    expect(await screen.findByText("That isn't the password you signed in with.")).toBeTruthy();
  });

  it("keeps the new session and goes on to the app", async () => {
    await tokenManager.setSession(authResponse({ user: pending }));
    server.use(
      http.post(api("/mobile/auth/change-password"), () =>
        HttpResponse.json(authResponse({ refreshToken: "after" })),
      ),
    );
    await renderChangePassword();
    await fill("temporary pass", "my own long password");
    await waitFor(() => expect(mockedRouter.replace).toHaveBeenCalledWith("/today"));
    expect(secureStoreItems.get("idi.refreshToken")).toBe("after");
  });
});
