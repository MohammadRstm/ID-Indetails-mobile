import { companyToday } from "@/format/time";
import {
  clearTodaySnapshot,
  readTodaySnapshot,
  shapeTodayView,
  WIDGET_LINKS,
  writeTodaySnapshot,
} from "./snapshot";

const NOW = new Date("2026-03-10T09:00:00Z");
const today = companyToday(NOW);

describe("shapeTodayView", () => {
  it("words today's hours", () => {
    expect(shapeTodayView({ day: today, minutes: 200, timerRunning: false }, NOW)).toEqual({
      hours: "3h 20m",
      caption: "Today",
      timerRunning: false,
    });
  });

  it("says when the timer runs and shows zero hours", () => {
    const view = shapeTodayView({ day: today, minutes: 0, timerRunning: true }, NOW);
    expect(view.hours).toBe("0h");
    expect(view.caption).toBe("Today, timer running");
  });

  it("does not show yesterday's hours as today's", () => {
    const view = shapeTodayView({ day: "2026-03-09", minutes: 480, timerRunning: true }, NOW);
    expect(view).toEqual({ hours: "--", caption: "Open the app to refresh", timerRunning: false });
  });

  it("asks to open the app when there is no cache", () => {
    expect(shapeTodayView(null, NOW).hours).toBe("--");
  });
});

describe("the cache", () => {
  it("round-trips and clears", async () => {
    const snapshot = { day: today, minutes: 90, timerRunning: false };
    await writeTodaySnapshot(snapshot);
    await expect(readTodaySnapshot()).resolves.toEqual(snapshot);
    await clearTodaySnapshot();
    await expect(readTodaySnapshot()).resolves.toBeNull();
  });
});

describe("the widget links", () => {
  it("open screens through the app's scheme", () => {
    expect(Object.values(WIDGET_LINKS)).toEqual([
      "idindetails://today",
      "idindetails://log-work",
      "idindetails://materials/add",
    ]);
  });
});
