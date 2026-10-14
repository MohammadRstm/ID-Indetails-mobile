import { screen } from "@testing-library/react-native";
import { renderWithProviders } from "@test/render";
import { chartDescription } from "./core";
import { DayRuler } from "./DayRuler";
import { ProgressRing } from "./ProgressRing";
import { WeekBars } from "./WeekBars";

describe("the charts for screen readers", () => {
  it("puts what a chart shows before its summary", () => {
    expect(chartDescription("Hours this week", "8h on Tuesday.")).toBe(
      "Hours this week. 8h on Tuesday.",
    );
  });

  it("names the week's bars, with the caller's summary", async () => {
    await renderWithProviders(
      <WeekBars
        days={[{ key: "2026-10-05", label: "Mon", minutes: 60 }]}
        accessibilityLabel="Hours this week"
        summary="1h on Monday."
      />,
    );
    expect(screen.getByRole("image", { name: "Hours this week. 1h on Monday." })).toBeTruthy();
  });

  it("names the day ruler, with the caller's summary", async () => {
    await renderWithProviders(
      <DayRuler accessibilityLabel="Where the hours sit" summary="Nothing logged yet." />,
    );
    expect(
      screen.getByRole("image", { name: "Where the hours sit. Nothing logged yet." }),
    ).toBeTruthy();
  });

  it("names the progress ring, with the caller's summary", async () => {
    await renderWithProviders(
      <ProgressRing value={0.5} accessibilityLabel="Hours logged today" summary="4h of 8h." />,
    );
    expect(screen.getByRole("progressbar", { name: "Hours logged today. 4h of 8h." })).toBeTruthy();
  });
});
