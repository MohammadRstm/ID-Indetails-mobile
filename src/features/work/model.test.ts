import { ApiError } from "@/api/errors";
import type { WorkEntry } from "@/api/types";
import { setFormatSettings } from "@/format/time";
import {
  checkLog,
  defaultSlot,
  durationOf,
  findSameEntry,
  groupByDay,
  isoAt,
  overtimeTag,
  weekSummary,
  workErrorText,
} from "./model";

beforeAll(() => setFormatSettings({ timeZone: "Asia/Beirut", use24HourTime: false, weekStart: 1 }));

const entry = (id: number, startedAt: string, endedAt: string, projectId = 1): WorkEntry => ({
  id,
  startedAt,
  endedAt,
  minutes: (Date.parse(endedAt) - Date.parse(startedAt)) / 60_000,
  overtimeMinutes: 0,
  description: "",
  canEdit: true,
  commentCount: 0,
  createdAt: startedAt,
  updatedAt: null,
  attachment: null,
  person: { id: 4, name: "Sarah Test" },
  project: { id: projectId, title: "Villa", icon: null, tint: null },
});

describe("times", () => {
  it("reads an end before the start as the next day", () => {
    expect(durationOf(9 * 60, 11 * 60)).toBe(120);
    expect(durationOf(23 * 60, 60)).toBe(120);
    expect(durationOf(600, 600)).toBe(0);
  });

  it("sends company times as UTC instants, whatever the phone's zone", () => {
    expect(isoAt("2026-10-08", 9 * 60)).toBe("2026-10-08T06:00:00.000Z");
    expect(isoAt("2026-10-08", 24 * 60 + 30)).toBe("2026-10-08T21:30:00.000Z");
  });

  it("starts a new log after the day's last entry, up to now", () => {
    expect(defaultSlot([], 9 * 60, false, 0)).toEqual({ s: 540, d: 60 });
    expect(defaultSlot([{ s: 540, e: 600 }], 540, true, 632)).toEqual({ s: 600, d: 30 });
  });
});

describe("checking a log before saving", () => {
  const base = {
    projectId: 1,
    day: "2026-10-08",
    startMin: 600,
    duration: 60,
    others: [],
    allowFuture: false,
    allowOverlap: false,
    now: new Date("2026-10-08T12:00:00Z"),
  };

  it("passes a plain log", () => expect(checkLog(base)).toBeNull());
  it("needs a project", () =>
    expect(checkLog({ ...base, projectId: null })).toBe("Pick a project."));
  it("needs 5 minutes and at most 16 hours", () => {
    expect(checkLog({ ...base, duration: 4 })).toMatch(/at least 5 minutes/);
    expect(checkLog({ ...base, duration: 16 * 60 + 5 })).toMatch(/16 hours/);
  });
  it("refuses the future unless the domain allows it", () => {
    expect(checkLog({ ...base, startMin: 15 * 60 })).toMatch(/future/);
    expect(checkLog({ ...base, startMin: 15 * 60, allowFuture: true })).toBeNull();
  });
  it("refuses an overlap unless allowed, leaving out the edited entry", () => {
    const others = [entry(5, "2026-10-08T07:30:00Z", "2026-10-08T08:00:00Z")];
    expect(checkLog({ ...base, others })).toMatch(/overlaps your entry/);
    expect(checkLog({ ...base, others, ignoreId: 5 })).toBeNull();
    expect(checkLog({ ...base, others, allowOverlap: true })).toBeNull();
  });
});

describe("a log whose answer was lost", () => {
  it("is found on the day by project, start and end", () => {
    const saved = entry(9, "2026-10-08T06:00:00Z", "2026-10-08T07:00:00Z", 3);
    const body = {
      projectId: 3,
      startedAt: "2026-10-08T06:00:00.000Z",
      endedAt: "2026-10-08T07:00:00.000Z",
    };
    expect(findSameEntry([saved], body)?.id).toBe(9);
    expect(findSameEntry([saved], { ...body, projectId: 4 })).toBeNull();
  });
});

it("puts the API's codes into words, and keeps its message otherwise", () => {
  expect(workErrorText(new ApiError(422, { code: "month_closed", message: "x" }))).toMatch(
    /month is closed/,
  );
  expect(workErrorText(new ApiError(422, { code: "other", message: "As the API says." }))).toBe(
    "As the API says.",
  );
});

it("words the overtime preview like the web", () => {
  const preview = {
    afterHoursMinutes: 60,
    beforeHoursMinutes: 0,
    dayEndMinute: 17 * 60,
    dayStartMinute: 9 * 60,
    dayOff: false,
    minutes: 120,
    overtimeMinutes: 60,
    pastRequiredMinutes: 0,
    requiredMinutes: 420,
  };
  expect(overtimeTag(preview)).toBe("1h 00m overtime (outside 9 AM – 5 PM)");
  expect(overtimeTag({ ...preview, overtimeMinutes: 0 })).toBeNull();
  expect(overtimeTag({ ...preview, dayOff: true })).toBe("Day off: all 1h 00m is overtime");
});

it("groups entries by the company day they start on", () => {
  const groups = groupByDay([
    entry(1, "2026-10-08T06:00:00Z", "2026-10-08T07:00:00Z"),
    entry(2, "2026-10-08T04:00:00Z", "2026-10-08T05:00:00Z"),
    entry(3, "2026-10-07T22:00:00Z", "2026-10-07T23:00:00Z"),
  ]);
  // 22:00 UTC on the 7th is 1 AM on the 8th in Beirut.
  expect(groups.map((g) => [g.day, g.entries.length])).toEqual([["2026-10-08", 3]]);
});

describe("the week's chart summary", () => {
  const day = (key: string, label: string, minutes: number) => ({ key, label, minutes });

  it("names the busiest day and the week's total", () => {
    const columns = [
      day("2026-10-05", "Mon", 480),
      day("2026-10-06", "Tue", 525),
      day("2026-10-07", "Wed", 0),
    ];
    expect(weekSummary(columns, 1005)).toBe("16h 45m this week, the most on Tuesday (8h 45m).");
  });

  it("says so when nothing is logged", () => {
    expect(weekSummary([day("2026-10-05", "Mon", 0)], 0)).toBe("Nothing logged this week.");
  });
});
