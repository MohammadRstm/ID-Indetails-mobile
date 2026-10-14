import { monthlySummary } from "./model";

const month = (m: string, revenue: number, netProfit: number) => ({ month: m, revenue, netProfit });

describe("the monthly chart's summary", () => {
  it("says there is nothing to show without months", () => {
    expect(monthlySummary([])).toBe("No months to show.");
  });

  it("names the latest month, and the one with the most revenue when it is another", () => {
    const text = monthlySummary([
      month("2026-07-01", 9000, 1000),
      month("2026-08-01", 4000, -500),
      month("2026-09-01", 5000, 800),
    ]);
    expect(text).toMatch(/^3 months\. Latest: .*revenue .*net profit .*\. Most revenue: .*\.$/);
    expect(text).toContain("Sep revenue");
    expect(text).toContain("Jul revenue");
  });

  it("names the latest month once when it also has the most revenue", () => {
    const text = monthlySummary([month("2026-08-01", 4000, 500), month("2026-09-01", 5000, 800)]);
    expect(text).toContain("Latest: Sep revenue");
    expect(text).not.toContain("Most revenue");
  });
});
