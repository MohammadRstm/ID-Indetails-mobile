import { act, fireEvent, screen, waitFor } from "@testing-library/react-native";
import { http, HttpResponse } from "msw";
import type { Device } from "@/api/types";
import { clearToasts, ToastHost } from "@/ui";
import { api } from "@test/handlers";
import { renderWithProviders } from "@test/render";
import { server } from "@test/server";
import { DevicesScreen } from "./DevicesScreen";

jest.mock("expo-router", () => ({ router: { back: jest.fn(), canGoBack: () => true } }));

const thisPhone: Device = {
  id: 7,
  platform: "android",
  appVersion: "1.0.0",
  createdAt: "2026-10-01T08:00:00Z",
  updatedAt: "2026-10-08T08:00:00Z",
  current: true,
};
const otherPhone: Device = {
  id: 3,
  platform: "ios",
  appVersion: null,
  createdAt: "2026-09-20T08:00:00Z",
  updatedAt: "2026-09-21T08:00:00Z",
  current: false,
};

function renderScreen() {
  return renderWithProviders(
    <>
      <DevicesScreen />
      <ToastHost />
    </>,
  );
}

afterEach(() => act(() => clearToasts()));

describe("DevicesScreen", () => {
  it("lists the phones, marks this one and offers sign-out only for the others", async () => {
    server.use(http.get(api("/me/devices"), () => HttpResponse.json([thisPhone, otherPhone])));
    await renderScreen();

    expect(await screen.findByText("Android phone")).toBeTruthy();
    expect(screen.getByText("This phone")).toBeTruthy();
    expect(screen.getByText("iPhone")).toBeTruthy();
    expect(screen.getByText("Added Oct 1, 2026 · App 1.0.0")).toBeTruthy();
    expect(screen.getAllByRole("button", { name: /^Sign out / })).toHaveLength(1);
  });

  it("signs another phone out after confirming, and reloads the list", async () => {
    let deleted: string | undefined;
    let list = [thisPhone, otherPhone];
    server.use(
      http.get(api("/me/devices"), () => HttpResponse.json(list)),
      http.delete(api("/me/devices/:id"), ({ params }) => {
        deleted = String(params.id);
        list = [thisPhone];
        return new HttpResponse(null, { status: 204 });
      }),
    );
    await renderScreen();

    await fireEvent.press(await screen.findByRole("button", { name: /^Sign out iPhone/ }));
    expect(screen.getByText("Sign this phone out?")).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "Sign out" }));

    await waitFor(() => expect(deleted).toBe("3"));
    expect(await screen.findByText("Signed out the iPhone")).toBeTruthy();
    await waitFor(() => expect(screen.queryByText("iPhone")).toBeNull());
  });

  it("does nothing when the sign-out is cancelled", async () => {
    const remove = jest.fn();
    server.use(
      http.get(api("/me/devices"), () => HttpResponse.json([thisPhone, otherPhone])),
      http.delete(api("/me/devices/:id"), () => {
        remove();
        return new HttpResponse(null, { status: 204 });
      }),
    );
    await renderScreen();

    await fireEvent.press(await screen.findByRole("button", { name: /^Sign out iPhone/ }));
    await fireEvent.press(screen.getByRole("button", { name: "Cancel" }));
    expect(remove).not.toHaveBeenCalled();
  });

  it("says so when the phone was already signed out", async () => {
    server.use(
      http.get(api("/me/devices"), () => HttpResponse.json([thisPhone, otherPhone])),
      http.delete(api("/me/devices/:id"), () =>
        HttpResponse.json(
          { type: "not_found", code: "not_found", message: "Not found.", errors: null },
          { status: 404 },
        ),
      ),
    );
    await renderScreen();

    await fireEvent.press(await screen.findByRole("button", { name: /^Sign out iPhone/ }));
    await fireEvent.press(screen.getByRole("button", { name: "Sign out" }));
    expect(await screen.findByText("The iPhone was already signed out")).toBeTruthy();
  });

  it("shows why the list couldn't load, with a retry", async () => {
    server.use(
      http.get(api("/me/devices"), () =>
        HttpResponse.json(
          { type: "unexpected", code: "internal_error", message: "Something broke.", errors: null },
          { status: 500 },
        ),
      ),
    );
    await renderScreen();
    expect(await screen.findByText("Couldn't load your devices")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Try again" })).toBeTruthy();
  });

  it("explains an empty list", async () => {
    server.use(http.get(api("/me/devices"), () => HttpResponse.json([])));
    await renderScreen();
    expect(await screen.findByText("No phones get your notifications")).toBeTruthy();
  });
});
