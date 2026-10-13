import { fireEvent, screen } from "@testing-library/react-native";
import { renderWithProviders } from "@test/render";
import { contributor } from "../testing";
import { ContributorsList } from "./ContributorsList";

const people = ["Ann", "Ben", "Cleo", "Dara", "Eli", "Fay", "Gus"].map((name, i) =>
  contributor(i + 1, name, 600 - i * 60),
);

describe("ContributorsList", () => {
  it("says so when nobody has logged time", async () => {
    await renderWithProviders(
      <ContributorsList contributors={[]} totalMinutes={0} entryCount={0} />,
    );
    expect(screen.getByText("Nobody has logged time on this project yet.")).toBeTruthy();
  });

  it("lists the most hours first, with overtime and the last day", async () => {
    await renderWithProviders(
      <ContributorsList
        contributors={[
          contributor(1, "Low", 60),
          contributor(2, "High", 300, { overtimeMinutes: 45, entries: 1 }),
        ]}
        totalMinutes={360}
        entryCount={4}
      />,
    );
    const names = screen.getAllByText(/^(High|Low)$/).map((node) => node.props.children as string);
    expect(names).toEqual(["High", "Low"]);
    expect(screen.getByText(/1 entry · 45m overtime · last /)).toBeTruthy();
    expect(screen.getByText("2 people · 4 entries · 6h")).toBeTruthy();
  });

  it("shows the first six and the rest on request", async () => {
    await renderWithProviders(
      <ContributorsList contributors={people} totalMinutes={3000} entryCount={21} />,
    );
    expect(screen.queryByText("Gus")).toBeNull();
    fireEvent.press(screen.getByRole("button", { name: "1 more" }));
    expect(screen.getByText("Gus")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "1 more" })).toBeNull();
  });
});
