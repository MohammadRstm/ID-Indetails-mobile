import { act, fireEvent, screen } from "@testing-library/react-native";
import * as Calendar from "expo-calendar";
import { Linking, Platform } from "react-native";
import { clearToasts, ToastHost } from "@/ui";
import { renderWithProviders } from "@test/render";
import { AddToCalendarButton } from "./AddToCalendarButton";

jest.mock("expo-calendar", () => ({
  EntityTypes: { EVENT: "event" },
  SourceType: { LOCAL: "local" },
  CalendarAccessLevel: { OWNER: "owner" },
  requestCalendarPermissions: jest.fn(),
  getDefaultCalendarSync: jest.fn(),
  getCalendars: jest.fn(),
  createCalendar: jest.fn(),
}));

const mocked = jest.mocked(Calendar);
const createEvent = jest.fn();
const granted = { granted: true, status: "granted", canAskAgain: true, expires: "never" };
const denied = { granted: false, status: "denied", canAskAgain: false, expires: "never" };

const meeting = {
  title: "Site walk · Villa Haddad",
  startsAt: "2026-10-12T07:00:00Z",
  endsAt: "2026-10-12T08:00:00Z",
};

function renderButton() {
  return renderWithProviders(
    <>
      <AddToCalendarButton event={meeting} />
      <ToastHost />
    </>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  createEvent.mockResolvedValue({ id: "e1" });
});
afterEach(() => act(() => clearToasts()));

describe("AddToCalendarButton on iOS", () => {
  it("asks for write-only access, adds to the default calendar and confirms", async () => {
    mocked.requestCalendarPermissions.mockResolvedValue(granted as never);
    mocked.getDefaultCalendarSync.mockReturnValue({ createEvent } as never);
    await renderButton();

    await fireEvent.press(screen.getByRole("button", { name: "Add to calendar" }));

    expect(mocked.requestCalendarPermissions).toHaveBeenCalledWith(true);
    expect(createEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        title: meeting.title,
        startDate: new Date(meeting.startsAt),
        endDate: new Date(meeting.endsAt),
        allDay: false,
      }),
    );
    expect(await screen.findByText("Added to your calendar")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Added to calendar" })).toBeDisabled();
  });

  it("explains and offers the settings when access is refused, adding nothing", async () => {
    mocked.requestCalendarPermissions.mockResolvedValue(denied as never);
    const openSettings = jest.spyOn(Linking, "openSettings").mockResolvedValue();
    await renderButton();

    await fireEvent.press(screen.getByRole("button", { name: "Add to calendar" }));

    expect(await screen.findByText(/calendar access is turned off/)).toBeTruthy();
    expect(createEvent).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByRole("button", { name: "Open settings" }));
    expect(openSettings).toHaveBeenCalled();
  });

  it("says so when the calendar refuses the event", async () => {
    mocked.requestCalendarPermissions.mockResolvedValue(granted as never);
    mocked.getDefaultCalendarSync.mockReturnValue({ createEvent } as never);
    createEvent.mockRejectedValue(new Error("EKErrorDomain"));
    await renderButton();

    await fireEvent.press(screen.getByRole("button", { name: "Add to calendar" }));

    expect(await screen.findByText("Couldn't add it to your calendar")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Add to calendar" })).toBeEnabled();
  });
});

describe("AddToCalendarButton on Android", () => {
  beforeEach(() => {
    jest.replaceProperty(Platform, "OS", "android");
  });
  afterEach(() => jest.restoreAllMocks());

  it("adds to the primary calendar that takes events", async () => {
    mocked.requestCalendarPermissions.mockResolvedValue(granted as never);
    mocked.getCalendars.mockResolvedValue([
      { id: "1", title: "Holidays", allowsModifications: false, isPrimary: true, createEvent },
      { id: "2", title: "me@company.com", allowsModifications: true, isPrimary: true, createEvent },
    ] as never);
    await renderButton();

    await fireEvent.press(screen.getByRole("button", { name: "Add to calendar" }));

    expect(mocked.requestCalendarPermissions).toHaveBeenCalledWith();
    expect(mocked.createCalendar).not.toHaveBeenCalled();
    expect(createEvent).toHaveBeenCalledTimes(1);
    expect(await screen.findByText("Added to your calendar")).toBeTruthy();
  });

  it("creates an ID InDetails calendar on the phone when none takes events", async () => {
    mocked.requestCalendarPermissions.mockResolvedValue(granted as never);
    mocked.getCalendars.mockResolvedValue([] as never);
    mocked.createCalendar.mockResolvedValue({ id: "9", createEvent } as never);
    await renderButton();

    await fireEvent.press(screen.getByRole("button", { name: "Add to calendar" }));

    expect(await screen.findByText("Added to your calendar")).toBeTruthy();
    expect(mocked.createCalendar).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "ID InDetails",
        source: expect.objectContaining({ isLocalAccount: true }),
      }),
    );
    expect(createEvent).toHaveBeenCalledTimes(1);
  });
});
