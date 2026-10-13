import {
  chartLabel,
  chartSummary,
  chartTable,
  COMPACT_ROWS,
  kpiTiles,
  pointReadout,
  sourceLine,
  tableShape,
  truncationNote,
} from "./figureModel";
import type { ProtonBlock, ProtonChartBlock, ProtonTableBlock } from "./figures";

const table = (rows: ProtonTableBlock["rows"], totalRows = rows.length): ProtonTableBlock => ({
  columns: [
    { key: "name", label: "Project", kind: "text", unit: null },
    { key: "cost", label: "Cost", kind: "number", unit: "usd" },
    { key: "due", label: "Due", kind: "date", unit: null },
  ],
  rows,
  totalRows,
});

const projectRow = (i: number): ProtonTableBlock["rows"][number] => ({
  cells: [{ text: `Project ${i}` }, { number: 9600 }, { date: "2026-03-02" }],
  ref: { type: "project", id: i + 1, name: `Project ${i}`, domain: "design" },
});

describe("tableShape", () => {
  it("writes each cell in its column's words", () => {
    const shape = tableShape(table([projectRow(1)]));
    expect(shape.columns.map((c) => c.right)).toEqual([false, true, false]);
    expect(shape.rows[0].cells).toEqual(["Project 1", "$9.6k", "Mar 2, 2026"]);
  });

  it("shows a missing cell as a dash, never 0", () => {
    const shape = tableShape(table([{ cells: [{ text: "Villa" }, { number: null }], ref: null }]));
    expect(shape.rows[0].cells).toEqual(["Villa", "–", "–"]);
  });

  it("marks a row that is still in progress", () => {
    const shape = tableShape(table([{ ...projectRow(1), partial: true }]));
    expect(shape.rows[0].cells[0]).toBe("Project 1 (so far)");
  });

  it("keeps the record a row is about, with a domain that is never missing", () => {
    const row = { ...projectRow(1), ref: { type: "client" as const, id: 4, name: "Mounir" } };
    expect(tableShape(table([row])).rows[0].ref).toEqual({
      type: "client",
      id: 4,
      name: "Mounir",
      domain: null,
    });
  });

  it("shows only the first rows in the chat and counts the rest", () => {
    const rows = Array.from({ length: 8 }, (_, i) => projectRow(i));
    const compact = tableShape(table(rows), COMPACT_ROWS);
    expect(compact.rows).toHaveLength(5);
    expect(compact.hidden).toBe(3);
    const full = tableShape(table(rows));
    expect(full.rows).toHaveLength(8);
    expect(full.hidden).toBe(0);
  });

  it("says when the server cut a table short", () => {
    const rows = [projectRow(1), projectRow(2)];
    expect(truncationNote(table(rows, 240))).toBe("Showing the first 2 of 240 rows.");
    expect(truncationNote(table(rows))).toBeNull();
  });
});

describe("kpiTiles", () => {
  it("writes the change against the previous period when there is one", () => {
    const [hours, cost] = kpiTiles({
      items: [
        { key: "h", label: "Hours", unit: "hours", value: 3, previous: 5, change: -2 },
        { key: "c", label: "Cost", unit: "usd", value: null },
      ],
    });
    expect(hours).toEqual({ key: "h", label: "Hours", value: "3h", sub: "-2h vs 5h" });
    expect(cost).toEqual({ key: "c", label: "Cost", value: "–", sub: null });
  });
});

const weeks: ProtonChartBlock = {
  kind: "columns",
  axisLabel: "Week",
  axis: "week",
  series: [{ key: "hours", label: "Hours", unit: "hours" }],
  points: [
    { label: "2026-03-02", values: [1] },
    { label: "2026-03-09", values: [2], partial: true },
  ],
};

describe("chartTable", () => {
  it("lists every point with every series, a missing figure as a dash", () => {
    const shape = chartTable({
      ...weeks,
      series: [...weeks.series, { key: "cost", label: "Cost", unit: "usd" }],
      points: [
        { label: "2026-03-02", values: [1, 500] },
        { label: "2026-03-09", values: [2, null], partial: true },
      ],
    });
    expect(shape.columns.map((c) => c.label)).toEqual(["Week", "Hours", "Cost"]);
    expect(shape.rows.map((r) => r.cells)).toEqual([
      ["Week of Mar 2, 2026", "1h", "$500"],
      ["Week of Mar 9, 2026 (so far)", "2h", "–"],
    ]);
  });
});

describe("chartSummary", () => {
  it("gives the span of a trend", () => {
    expect(chartSummary(weeks)).toBe(
      "2 points. First: Week of Mar 2, 2026 1h. Last: Week of Mar 9, 2026 (so far) 2h.",
    );
  });

  it("lists the first ranked values and says how many more there are", () => {
    const points = "ABCDEFGHIJ".split("").map((label, i) => ({ label, values: [i + 1] }));
    const ranked: ProtonChartBlock = {
      kind: "bar",
      axisLabel: "Project",
      axis: "text",
      series: [{ key: "n", label: "Count", unit: "count" }],
      points,
    };
    expect(chartSummary(ranked)).toBe("A 1; B 2; C 3; D 4; E 5; F 6; G 7; H 8; and 2 more.");
  });

  it("names the series when there are several", () => {
    const two: ProtonChartBlock = {
      ...weeks,
      series: [
        { key: "a", label: "This month", unit: "hours" },
        { key: "b", label: "Last month", unit: "hours" },
      ],
      points: [{ label: "2026-03-02", values: [1, null] }],
    };
    expect(chartSummary(two)).toBe("Week of Mar 2, 2026 This month 1h, Last month –");
  });
});

describe("chartLabel", () => {
  it("says what the chart is, its title and its period", () => {
    const block = { title: "Hours by week", period: "March" } as unknown as ProtonBlock;
    expect(chartLabel(block, weeks)).toBe("Column chart: Hours by week, March");
    expect(chartLabel({ ...block, period: null }, { ...weeks, kind: "line" })).toBe(
      "Line chart: Hours by week",
    );
  });
});

describe("sourceLine", () => {
  it("says when the figures were read", () => {
    const block = { source: { tool: "t", dataset: "d1", asOf: "2026-10-13T09:30:00Z" } };
    expect(sourceLine(block as unknown as ProtonBlock)).toMatch(/^Read at \d{1,2}:\d{2}/);
  });
});

describe("pointReadout", () => {
  it("writes the touched point and its figures", () => {
    expect(pointReadout(weeks, 1)).toBe("Week of Mar 9, 2026 (so far): 2h");
  });
});
