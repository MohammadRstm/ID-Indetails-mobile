import { act, fireEvent, screen, waitFor } from "@testing-library/react-native";
import { AccessibilityInfo } from "react-native";
import { renderWithProviders } from "@test/render";
import { avatarSvg, hash, initials } from "./avatars";
import { icons, type IconName } from "./icons";
import {
  Avatar,
  Button,
  EmptyState,
  Icon,
  InlineError,
  Money,
  NumberField,
  StatusBadge,
  Switch,
  ToastHost,
  clearToasts,
  toast,
} from "./index";

afterEach(() => act(() => clearToasts()));

describe("Button", () => {
  it("reports a press, and none while disabled or loading", async () => {
    const onPress = jest.fn();
    const { rerender } = await renderWithProviders(<Button label="Save" onPress={onPress} />);
    await fireEvent.press(screen.getByRole("button", { name: "Save" }));
    expect(onPress).toHaveBeenCalledTimes(1);

    await rerender(<Button label="Save" onPress={onPress} disabled />);
    await fireEvent.press(screen.getByRole("button", { name: "Save" }));
    await rerender(<Button label="Save" onPress={onPress} loading />);
    await fireEvent.press(screen.getByRole("button", { name: "Save" }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

describe("NumberField", () => {
  it("reads a decimal comma from the keypad as the decimal mark, and commas beside a dot as thousands", async () => {
    const onChange = jest.fn();
    await renderWithProviders(<NumberField label="Amount" value={null} onChange={onChange} />);
    const field = screen.getByLabelText("Amount");
    const typed = async (text: string) => {
      await fireEvent.changeText(field, text);
      return onChange.mock.lastCall?.[0];
    };
    expect(await typed("12,5")).toBe(12.5);
    expect(await typed("1250,50")).toBe(1250.5);
    expect(await typed("12,")).toBe(12);
    expect(await typed("1,250.50")).toBe(1250.5);
    expect(await typed("1,250,000")).toBe(1250000);
    expect(await typed("12.5")).toBe(12.5);
  });

  it("keeps commas as thousands in a whole-number field, whose keypad has no decimal key", async () => {
    const onChange = jest.fn();
    await renderWithProviders(
      <NumberField label="Workers" value={null} onChange={onChange} decimals={0} />,
    );
    await fireEvent.changeText(screen.getByLabelText("Workers"), "1,250");
    expect(onChange).toHaveBeenLastCalledWith(1250);
  });
});

describe("Switch", () => {
  it("reports the opposite value and reads as a switch", async () => {
    const onValueChange = jest.fn();
    await renderWithProviders(
      <Switch value={false} onValueChange={onValueChange} accessibilityLabel="Use Face ID" />,
    );
    const control = screen.getByRole("switch", { name: "Use Face ID" });
    expect(control.props.accessibilityState).toMatchObject({ checked: false });
    await fireEvent.press(control);
    expect(onValueChange).toHaveBeenCalledWith(true);
  });
});

describe("StatusBadge", () => {
  it.each([
    ["active", "Active"],
    ["hold", "On hold"],
    ["completed", "Completed"],
    ["archived", "Archived"],
  ] as const)("labels %s as %s", async (status, label) => {
    await renderWithProviders(<StatusBadge status={status} />);
    expect(screen.getByText(label)).toBeTruthy();
  });
});

describe("Money", () => {
  it("is short on screen, with the full amount read out and on a long press", async () => {
    await renderWithProviders(<Money amount={12_480} />);
    const figure = screen.getByText("$12.5k");
    expect(figure.props.accessibilityLabel).toBe("$12,480");
    await fireEvent(figure, "longPress");
    expect(screen.getByText("$12,480")).toBeTruthy();
  });

  it("writes LBP and negatives like the web", async () => {
    await renderWithProviders(
      <>
        <Money amount={2_500_000} currency="LBP" exact />
        <Money amount={-300} />
      </>,
    );
    expect(screen.getByText("2,500,000 LBP")).toBeTruthy();
    expect(screen.getByText("−$300")).toBeTruthy();
  });
});

describe("EmptyState and InlineError", () => {
  it("says what is missing and what to do", async () => {
    await renderWithProviders(
      <EmptyState title="No requirements assigned to you" text="Enjoy the quiet." />,
    );
    expect(screen.getByText("No requirements assigned to you")).toBeTruthy();
    expect(screen.getByText("Enjoy the quiet.")).toBeTruthy();
  });

  it("offers a retry next to what failed", async () => {
    const onRetry = jest.fn();
    await renderWithProviders(
      <InlineError what="the materials" message="The server can't be reached." onRetry={onRetry} />,
    );
    expect(screen.getByText(/Couldn't load the materials\./)).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalled();
  });
});

describe("Icon", () => {
  it("has the web's 75 icons and draws every one", async () => {
    const names = Object.keys(icons) as IconName[];
    expect(names).toHaveLength(75);
    await renderWithProviders(
      <>
        {names.map((name) => (
          <Icon key={name} name={name} />
        ))}
      </>,
    );
  });
});

describe("Avatar", () => {
  it("draws the same face as the web for the same name", async () => {
    // The web's hash: h = h * 31 + charCode, kept to 32 bits.
    expect(hash("Sarah Test")).toBe(
      Math.abs(Array.from("Sarah Test").reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 0)),
    );
    const svg = avatarSvg("Sarah Test");
    expect(svg).toContain("<svg");
    expect(avatarSvg("Sarah Test")).toBe(svg);
    expect(avatarSvg("Tarek Test")).not.toBe(svg);
  });

  it("has initials for the fallback and reads the name out", async () => {
    expect(initials("Sarah Test")).toBe("ST");
    expect(initials("  Rana  ")).toBe("R");
    await renderWithProviders(<Avatar name="Sarah Test" presence="online" />);
    expect(screen.getByLabelText("Sarah Test, online")).toBeTruthy();
  });
});

describe("toast", () => {
  it("shows a confirmation with its action, then goes", async () => {
    // No slide-in animation to wait for.
    jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(true);
    const undo = jest.fn();
    await renderWithProviders(<ToastHost />);

    await act(() => {
      toast({ text: "Entry deleted", actionLabel: "Undo", action: undo });
    });
    expect(screen.getByText("Entry deleted")).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "Undo" }));
    expect(undo).toHaveBeenCalled();
    expect(screen.queryByText("Entry deleted")).toBeNull();

    await act(() => {
      toast({ text: "Logged 2h 15m", duration: 30 });
    });
    expect(screen.getByText("Logged 2h 15m")).toBeTruthy();
    await waitFor(() => expect(screen.queryByText("Logged 2h 15m")).toBeNull());
  });
});
