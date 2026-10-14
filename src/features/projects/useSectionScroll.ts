import { useCallback, useRef } from "react";
import type { ScrollView } from "react-native";
import type { PhoneSectionKey } from "./model";

/**
 * Brings one section to the top of the project screen. A section's position moves while the ones above it load,
 * so the scroll follows each new position until the person scrolls by hand.
 */
export function useSectionScroll(target: PhoneSectionKey | null) {
  const scrollRef = useRef<ScrollView>(null);
  const following = useRef(target != null);

  const onAnchor = useCallback(
    (section: PhoneSectionKey, y: number) => {
      if (section === target && following.current) {
        scrollRef.current?.scrollTo({ y, animated: false });
      }
    },
    [target],
  );
  const onScrollBeginDrag = useCallback(() => {
    following.current = false;
  }, []);

  return { scrollRef, onAnchor, onScrollBeginDrag };
}
