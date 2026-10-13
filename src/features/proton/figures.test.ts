import { formatChange, formatValue, parseBlocks, pointLabel, pointTitle } from "./figures";

const source = { tool: "get_time_summary", dataset: "d1", asOf: "2026-10-13T09:30:00Z" };

const chartBlock = (change: Record<string, unknown> = {}) => ({
  id: "b1",
  type: "chart",
  title: "Hours by project",
  period: "This month",
  chart: {
    kind: "bar",
    axisLabel: "Project",
    axis: "text",
    series: [{ key: "hours", label: "Hours", unit: "hours" }],
    points: [{ label: "Villa Haddad", values: [12.5] }],
  },
  table: null,
  kpis: null,
  notes: [],
  source,
  ...change,
});

describe("parseBlocks", () => {
  it("keeps a block that fits and returns it typed", () => {
    const [block] = parseBlocks([chartBlock()]);
    expect(block.title).toBe("Hours by project");
    expect(block.chart?.points[0].values).toEqual([12.5]);
  });

  it("drops a block that doesn't fit and keeps the others", () => {
    const noChart = chartBlock({ chart: null });
    const badUnit = chartBlock({
      chart: { ...chartBlock().chart, series: [{ key: "x", label: "X", unit: "furlongs" }] },
    });
    const blocks = parseBlocks([noChart, chartBlock({ id: "b2" }), badUnit]);
    expect(blocks.map((b) => b.id)).toEqual(["b2"]);
  });

  it("drops a chart with more points than the web draws", () => {
    const points = Array.from({ length: 61 }, (_, i) => ({ label: `P${i}`, values: [i] }));
    expect(parseBlocks([chartBlock({ chart: { ...chartBlock().chart, points } })])).toEqual([]);
  });

  it("keeps a table and headline figures", () => {
    const table = {
      id: "t1",
      type: "table",
      title: "Projects",
      period: null,
      chart: null,
      table: {
        columns: [{ key: "name", label: "Project", kind: "text", unit: null }],
        rows: [{ cells: [{ text: "Villa Haddad" }], ref: null }],
        totalRows: 1,
      },
      kpis: null,
      notes: [],
      source,
    };
    const kpis = {
      id: "k1",
      type: "kpis",
      title: "Month",
      period: null,
      chart: null,
      table: null,
      kpis: {
        items: [
          { key: "h", label: "Hours", unit: "hours", value: 3, previous: null, change: null },
        ],
      },
      notes: [],
      source,
    };
    expect(parseBlocks([table, kpis]).map((b) => b.type)).toEqual(["table", "kpis"]);
  });

  it("returns nothing for what isn't a list", () => {
    expect(parseBlocks(undefined)).toEqual([]);
    expect(parseBlocks({ id: "b1" })).toEqual([]);
  });

  it("reads at most ten blocks", () => {
    const many = Array.from({ length: 12 }, (_, i) => chartBlock({ id: `b${i}` }));
    expect(parseBlocks(many)).toHaveLength(10);
  });
});

describe("formatValue", () => {
  it("writes a missing figure as a dash, never 0", () => {
    expect(formatValue("hours", null)).toBe("–");
    expect(formatValue("usd", undefined)).toBe("–");
    expect(formatValue("count", null)).toBe("–");
  });

  it("writes each unit the way the web does", () => {
    expect(formatValue("hours", 6.5)).toBe("6h 30m");
    expect(formatValue("usd", 9600)).toBe("$9.6k");
    expect(formatValue("usd", 9600, true)).toBe("$9.6k");
    expect(formatValue("usd", 12)).toBe("$12");
    expect(formatValue("count", 12)).toBe("12");
    expect(formatValue("count", 1234)).toBe("1,234");
    expect(formatValue("count", 2.46)).toBe("2.5");
    expect(formatValue("percent", 39.6)).toBe("40%");
    expect(formatValue("days", 1)).toBe("1 day");
    expect(formatValue("days", 3)).toBe("3 days");
  });
});

describe("formatChange", () => {
  it("signs a change and keeps its unit", () => {
    expect(formatChange("hours", 2)).toBe("+2h");
    expect(formatChange("usd", -1200)).toBe("-$1.2k");
    expect(formatChange("count", 0)).toBe("0");
  });

  it("writes a change of a percentage in points", () => {
    expect(formatChange("percent", 5)).toBe("+5 pts");
    expect(formatChange("percent", -2.4)).toBe("-2 pts");
  });

  it("writes a missing change as a dash", () => {
    expect(formatChange("hours", null)).toBe("–");
  });
});

describe("pointLabel and pointTitle", () => {
  it("shortens a day or a week and names a month with its year", () => {
    expect(pointLabel("week", "2026-03-02")).toBe("Mar 2");
    expect(pointLabel("date", "2026-03-02")).toBe("Mar 2");
    expect(pointLabel("month", "2026-03-01")).toBe("Mar 2026");
  });

  it("leaves a name that isn't a day as it is", () => {
    expect(pointLabel("text", "Villa Haddad")).toBe("Villa Haddad");
    expect(pointTitle("text", "Villa Haddad")).toBe("Villa Haddad");
  });

  it("writes a point in full for a table", () => {
    expect(pointTitle("week", "2026-03-02")).toBe("Week of Mar 2, 2026");
    expect(pointTitle("date", "2026-03-02")).toBe("Mar 2, 2026");
    expect(pointTitle("month", "2026-03-01")).toBe("Mar 2026");
  });
});

