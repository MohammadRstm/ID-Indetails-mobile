import { renderHook } from "@testing-library/react-native";
import { useSectionScroll } from "./useSectionScroll";

async function setup(target: Parameters<typeof useSectionScroll>[0]) {
  const scrollTo = jest.fn();
  const { result } = await renderHook(() => useSectionScroll(target));
  (result.current.scrollRef as { current: unknown }).current = { scrollTo };
  return { scrollTo, ...result.current };
}

describe("scrolling to a section", () => {
  it("scrolls to the asked section, and follows it when it moves", async () => {
    const { scrollTo, onAnchor } = await setup("meetings");
    onAnchor("meetings", 640);
    onAnchor("meetings", 700);
    expect(scrollTo).toHaveBeenNthCalledWith(1, { y: 640, animated: false });
    expect(scrollTo).toHaveBeenNthCalledWith(2, { y: 700, animated: false });
  });

  it("ignores the other sections", async () => {
    const { scrollTo, onAnchor } = await setup("meetings");
    onAnchor("requirements", 300);
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it("stops following once the person scrolls by hand", async () => {
    const { scrollTo, onAnchor, onScrollBeginDrag } = await setup("meetings");
    onScrollBeginDrag();
    onAnchor("meetings", 700);
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it("stays at the top when no section was asked for", async () => {
    const { scrollTo, onAnchor } = await setup(null);
    onAnchor("meetings", 700);
    expect(scrollTo).not.toHaveBeenCalled();
  });
});
