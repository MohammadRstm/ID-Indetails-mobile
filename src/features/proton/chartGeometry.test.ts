import {
  axisRange,
  columnSlots,
  compositionSpans,
  labelEvery,
  lineX,
  linePath,
  rankBarSpans,
  scaleY,
} from "./chartGeometry";

describe("rankBarSpans", () => {
  it("draws the largest value across the whole width", () => {
    const { spans, zero } = rankBarSpans([10, 5], 100);
    expect(zero).toBe(0);
    expect(spans).toEqual([
      { x: 0, width: 100 },
      { x: 0, width: 50 },
    ]);
  });

  it("puts a negative value left of a shared zero line", () => {
    const { spans, zero } = rankBarSpans([10, -5], 150);
    expect(zero).toBe(50);
    expect(spans).toEqual([
      { x: 50, width: 100 },
      { x: 0, width: 50 },
    ]);
  });

  it("keeps a tiny value visible and a zero empty", () => {
    const { spans } = rankBarSpans([1000, 1, 0], 100);
    expect(spans[1].width).toBe(2);
    expect(spans[2].width).toBe(0);
  });
});

describe("axisRange", () => {
  it("reaches a round number above the largest value", () => {
    expect(axisRange([null, 12, 3])).toEqual({ low: 0, high: 20 });
  });

  it("reaches below zero only when a value does", () => {
    expect(axisRange([-30, 5])).toEqual({ low: -50, high: 5 });
  });

  it("gives an axis even when there is no figure at all", () => {
    expect(axisRange([null, null])).toEqual({ low: 0, high: 1 });
  });
});

describe("scaleY", () => {
  it("puts the top of the axis at the top of the plot and zero at the bottom", () => {
    const range = { low: 0, high: 20 };
    expect(scaleY(20, range, 10, 100)).toBe(10);
    expect(scaleY(0, range, 10, 100)).toBe(110);
  });
});

describe("columnSlots", () => {
  it("centres a group of columns in each point's slot", () => {
    const slots = columnSlots(4, 2, 200);
    expect(slots.slot).toBe(50);
    expect(slots.bar).toBeCloseTo(18);
    expect(slots.x(0, 0)).toBeCloseTo(7);
    expect(slots.x(0, 1)).toBeCloseTo(25);
    expect(slots.x(1, 0)).toBeCloseTo(57);
    expect(slots.center(2)).toBe(125);
  });

  it("keeps a lone column from growing past a thumb-sized bar", () => {
    expect(columnSlots(1, 1, 300).bar).toBe(30);
  });

  it("keeps a column of a crowded chart visible", () => {
    expect(columnSlots(60, 3, 300).bar).toBeGreaterThanOrEqual(1);
  });
});

describe("lineX and linePath", () => {
  it("spreads points evenly with a margin at each end", () => {
    const x = lineX(3, 100, 10);
    expect([x(0), x(1), x(2)]).toEqual([10, 50, 90]);
    expect(lineX(1, 100)(0)).toBe(50);
  });

  it("joins the points and lifts the pen over a gap", () => {
    expect(linePath([0, 10, 20], [5, 6, 7])).toBe("M0.0 5.0L10.0 6.0L20.0 7.0");
    expect(linePath([0, 10, 20], [5, null, 15])).toBe("M0.0 5.0M20.0 15.0");
  });
});

describe("labelEvery", () => {
  it("names about seven points whatever the count", () => {
    expect(labelEvery(5)).toBe(1);
    expect(labelEvery(8)).toBe(2);
    expect(labelEvery(60)).toBe(9);
  });
});

describe("compositionSpans", () => {
  it("shares the width between the parts and gives a missing part no room", () => {
    expect(compositionSpans([1, 3, null], 100)).toEqual([
      { x: 0, width: 25 },
      { x: 25, width: 75 },
      { x: 100, width: 0 },
    ]);
  });

  it("draws nothing when no part has a positive figure", () => {
    expect(compositionSpans([0, null, -4], 100).map((s) => s.width)).toEqual([0, 0, 0]);
  });
});
