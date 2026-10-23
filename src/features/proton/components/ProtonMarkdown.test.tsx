import { screen } from "@testing-library/react-native";
import { renderWithProviders } from "@test/render";
import { Bubble } from "./Bubble";
import { ProtonMarkdown } from "./ProtonMarkdown";

const ANSWER = "**Design**\n- **Projects:** 7 active\n- Hours are *down*\n\nSee `P-12` and project_id.";

describe("ProtonMarkdown", () => {
  it("draws bold, lists, italic and code without their markers", async () => {
    await renderWithProviders(<ProtonMarkdown text={ANSWER} />);

    expect(screen.getAllByText("Design").length).toBeGreaterThan(0);
    expect(screen.getByText("Projects:")).toBeTruthy();
    expect(screen.getByText("down")).toBeTruthy();
    expect(screen.getByText("P-12")).toBeTruthy();
    expect(screen.getAllByText("•")).toHaveLength(2);
    expect(screen.queryByText(/\*\*/)).toBeNull();
  });

  it("numbers an ordered list from its first number", async () => {
    await renderWithProviders(<ProtonMarkdown text={"3. Call Acme\n4. Send the invoice"} />);

    expect(screen.getByText("3.")).toBeTruthy();
    expect(screen.getByText("4.")).toBeTruthy();
  });

  it("reads to a screen reader as the plain text", async () => {
    await renderWithProviders(<ProtonMarkdown text={"## Done\n**Bold *and italic***"} />);

    expect(screen.getByLabelText("Done\nBold and italic")).toBeTruthy();
  });
});

describe("Bubble", () => {
  it("draws Proton's markdown but keeps the person's and an error's words literal", async () => {
    await renderWithProviders(
      <>
        <Bubble from="proton" text="A **bold** answer" />
        <Bubble from="you" text="My **own** words" />
        <Bubble from="error" text="Failed **badly**" />
      </>,
    );

    expect(screen.getByText("bold")).toBeTruthy();
    expect(screen.queryByText("A **bold** answer")).toBeNull();
    expect(screen.getByText("My **own** words")).toBeTruthy();
    expect(screen.getByText("Failed **badly**")).toBeTruthy();
  });
});
