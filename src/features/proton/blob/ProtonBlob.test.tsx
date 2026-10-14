import { screen } from "@testing-library/react-native";
import { AccessibilityInfo } from "react-native";
import { renderWithProviders } from "@test/render";
import { ProtonMark } from "../components/ProtonMark";
import { ProtonBlob } from "./ProtonBlob";

beforeEach(() => {
  jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(true);
});

describe("ProtonBlob", () => {
  it("is named by what it is doing", async () => {
    await renderWithProviders(<ProtonBlob mood="thinking" />);
    expect(screen.getByLabelText("Proton, thinking")).toBeTruthy();
  });

  it("has a name for each mood", async () => {
    await renderWithProviders(<ProtonBlob mood="proposing" />);
    expect(screen.getByLabelText("Proton, waiting for your confirmation")).toBeTruthy();
  });

  it("says nothing to a screen reader when a button beside it already does", async () => {
    await renderWithProviders(<ProtonBlob mood="idle" decorative />);
    expect(screen.queryByLabelText("Proton, ready")).toBeNull();
  });
});

describe("ProtonMark", () => {
  const quiet = { turns: [], actions: {}, live: null, blocked: false };

  it("is ready when nothing is going on", async () => {
    await renderWithProviders(<ProtonMark {...quiet} />);
    expect(screen.getByLabelText("Proton, ready")).toBeTruthy();
  });

  it("thinks while a question is being answered", async () => {
    await renderWithProviders(<ProtonMark {...quiet} live={{ text: null }} />);
    expect(await screen.findByLabelText("Proton, thinking")).toBeTruthy();
  });

  it("answers while the text arrives", async () => {
    await renderWithProviders(<ProtonMark {...quiet} live={{ text: { text: "Hi" } }} />);
    expect(await screen.findByLabelText("Proton, answering")).toBeTruthy();
  });

  it("rests when Proton can't answer", async () => {
    await renderWithProviders(<ProtonMark {...quiet} blocked />);
    expect(await screen.findByLabelText("Proton, resting")).toBeTruthy();
  });
});
