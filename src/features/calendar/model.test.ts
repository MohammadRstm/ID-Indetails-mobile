import { chooseAndroidCalendar, companyDayOf, toEventDetails } from "./model";

// Jest runs in America/Los_Angeles (jest.config.js); the company is in Beirut.
const BEIRUT = "Asia/Beirut";

describe("toEventDetails", () => {
  it("keeps a meeting's instants, in the company's zone, whatever the phone's zone", () => {
    const details = toEventDetails(
      {
        title: "Site walk",
        startsAt: "2026-10-12T07:00:00Z",
        endsAt: "2026-10-12T08:30:00Z",
        notes: " Bring the plans ",
      },
      "ios",
      BEIRUT,
    );
    expect(details).toEqual({
      title: "Site walk",
      startDate: new Date("2026-10-12T07:00:00Z"),
      endDate: new Date("2026-10-12T08:30:00Z"),
      allDay: false,
      timeZone: BEIRUT,
      notes: "Bring the plans",
    });
  });

  it("makes a timed event without an end a point in time, and never ends before it starts", () => {
    const noEnd = toEventDetails(
      { title: "x", startsAt: "2026-10-12T07:00:00Z" },
      "android",
      BEIRUT,
    );
    expect(noEnd?.endDate).toEqual(new Date("2026-10-12T07:00:00Z"));
    const backwards = toEventDetails(
      { title: "x", startsAt: "2026-10-12T07:00:00Z", endsAt: "2026-10-12T06:00:00Z" },
      "android",
      BEIRUT,
    );
    expect(backwards?.endDate).toEqual(new Date("2026-10-12T07:00:00Z"));
  });

  it("stores an all-day deadline on Android as UTC midnights of the company day", () => {
    const details = toEventDetails(
      { title: "Deadline", startsAt: "2026-10-12", allDay: true },
      "android",
      BEIRUT,
    );
    expect(details).toMatchObject({
      startDate: new Date("2026-10-12T00:00:00Z"),
      endDate: new Date("2026-10-13T00:00:00Z"),
      allDay: true,
      timeZone: "UTC",
    });
  });

  it("stores an all-day deadline on iOS as the phone's own midnights, a floating date", () => {
    const details = toEventDetails(
      { title: "Deadline", startsAt: "2026-10-12", allDay: true },
      "ios",
      BEIRUT,
    );
    expect(details?.startDate).toEqual(new Date(2026, 9, 12));
    expect(details?.endDate).toEqual(new Date(2026, 9, 13));
    expect(details?.timeZone).toBeUndefined();
  });

  it("takes an all-day instant's day in the company's zone, not the phone's", () => {
    // 23:30 UTC on the 11th is already the 12th in Beirut, and still the 11th in Los Angeles.
    const details = toEventDetails(
      { title: "Deadline", startsAt: "2026-10-11T23:30:00Z", allDay: true },
      "android",
      BEIRUT,
    );
    expect(details?.startDate).toEqual(new Date("2026-10-12T00:00:00Z"));
  });

  it("covers every day up to an all-day event's last day", () => {
    const details = toEventDetails(
      { title: "Leave", startsAt: "2026-10-12", endsAt: "2026-10-14", allDay: true },
      "android",
      BEIRUT,
    );
    expect(details?.endDate).toEqual(new Date("2026-10-15T00:00:00Z"));
  });

  it("refuses a start that isn't a date or time", () => {
    expect(toEventDetails({ title: "x", startsAt: "soon" }, "ios", BEIRUT)).toBeNull();
    expect(
      toEventDetails({ title: "x", startsAt: "soon", allDay: true }, "ios", BEIRUT),
    ).toBeNull();
  });
});

describe("companyDayOf", () => {
  it("reads a date as it is and an instant in the given zone", () => {
    expect(companyDayOf("2026-02-28", BEIRUT)).toEqual({ year: 2026, month: 1, day: 28 });
    expect(companyDayOf("2026-12-31T22:30:00Z", BEIRUT)).toEqual({ year: 2027, month: 0, day: 1 });
  });
});

describe("chooseAndroidCalendar", () => {
  const cal = (id: string, title: string, allowsModifications: boolean, isPrimary = false) => ({
    id,
    title,
    allowsModifications,
    isPrimary,
  });

  it("prefers the primary calendar that takes events", () => {
    expect(
      chooseAndroidCalendar([
        cal("1", "Holidays", false, true),
        cal("2", "ID InDetails", true),
        cal("3", "me@company.com", true, true),
      ]),
    ).toBe("3");
  });

  it("falls back to the app's calendar, then any that takes events", () => {
    expect(chooseAndroidCalendar([cal("1", "Other", true), cal("2", "ID InDetails", true)])).toBe(
      "2",
    );
    expect(chooseAndroidCalendar([cal("1", "Holidays", false), cal("2", "Other", true)])).toBe("2");
  });

  it("asks for a new calendar when none takes events", () => {
    expect(chooseAndroidCalendar([cal("1", "Holidays", false)])).toBe("create");
    expect(chooseAndroidCalendar([])).toBe("create");
  });
});
