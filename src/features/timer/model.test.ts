import { setFormatSettings } from "@/format/time";
import { elapsedMs, fmtElapsed, logSlotOf, parseTimerState } from "./model";
import { removeRun, resetTimerCache, saveRunning, saveStopped, timerState } from "./store";

jest.mock("expo-crypto", () => ({
  randomUUID: () => jest.requireActual("node:crypto").randomUUID(),
}));

beforeAll(() => setFormatSettings({ timeZone: "Asia/Beirut", use24HourTime: false, weekStart: 1 }));

describe("the running time", () => {
  it("is now minus the start, never negative", () => {
    const start = "2026-10-08T06:00:00Z";
    expect(elapsedMs(start, Date.parse("2026-10-08T07:30:15Z"))).toBe(90 * 60_000 + 15_000);
    expect(elapsedMs(start, Date.parse("2026-10-08T05:00:00Z"))).toBe(0);
  });

  it("ticks as minutes and seconds, then hours", () => {
    expect(fmtElapsed(42_000)).toBe("0:42");
    expect(fmtElapsed((3600 + 5 * 60 + 9) * 1000)).toBe("1:05:09");
  });
});

describe("a stopped run as an entry", () => {
  it("counts the clock minutes it started and stopped in, in company time", () => {
    // 09:50:40 to 09:56:10 Beirut (UTC+3) is 9:50 to 9:56.
    const slot = logSlotOf({
      startedAt: "2026-10-08T06:50:40Z",
      stoppedAt: "2026-10-08T06:56:10Z",
    });
    expect(slot).toEqual({
      date: "2026-10-08",
      startMin: 9 * 60 + 50,
      endMin: 9 * 60 + 56,
      shortTimer: undefined,
    });
  });

  it("is at least 5 minutes, and says how long it really ran", () => {
    const slot = logSlotOf({
      startedAt: "2026-10-08T06:00:00Z",
      stoppedAt: "2026-10-08T06:02:30Z",
    });
    expect(slot.endMin - slot.startMin).toBe(5);
    expect(slot.shortTimer).toBe(2);
  });

  it("keeps its evening part when it runs past midnight", () => {
    // 23:30 to 01:15 the next day, Beirut.
    const slot = logSlotOf({
      startedAt: "2026-10-08T20:30:00Z",
      stoppedAt: "2026-10-08T22:15:00Z",
    });
    expect(slot.date).toBe("2026-10-08");
    expect(slot.startMin).toBe(23 * 60 + 30);
    expect(slot.endMin).toBe(23 * 60 + 30 + 105);
  });

  it("is capped at the 16 hours the server takes", () => {
    const slot = logSlotOf({
      startedAt: "2026-10-08T04:00:00Z",
      stoppedAt: "2026-10-09T04:00:00Z",
    });
    expect(slot.endMin - slot.startMin).toBe(16 * 60);
  });
});

describe("the saved timer", () => {
  it("ignores another person's timer and anything malformed", () => {
    const raw = JSON.stringify({
      running: {
        userId: 9,
        projectId: 1,
        projectTitle: "A",
        description: "",
        startedAt: "2026-10-08T06:00:00Z",
      },
      stopped: [{ id: 3 }],
    });
    expect(parseTimerState(raw, 4)).toEqual({ running: null, stopped: [] });
    expect(parseTimerState("{not json", 4)).toEqual({ running: null, stopped: [] });
  });

  it("survives the app being killed: it is read back from the phone's storage", () => {
    saveRunning({
      userId: 4,
      projectId: 7,
      projectTitle: "Villa",
      description: "Plans",
      startedAt: "2026-10-08T06:00:00Z",
    });
    resetTimerCache();
    expect(timerState(4).running?.projectTitle).toBe("Villa");

    const run = saveStopped(4, "2026-10-08T07:00:00Z");
    resetTimerCache();
    expect(timerState(4).running).toBeNull();
    expect(timerState(4).stopped).toHaveLength(1);
    expect(timerState(5).stopped).toHaveLength(0);

    removeRun(4, run!.id);
    resetTimerCache();
    expect(timerState(4).stopped).toHaveLength(0);
  });
});
