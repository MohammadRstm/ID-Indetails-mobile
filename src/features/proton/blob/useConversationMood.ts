import { useEffect, useRef, useState } from "react";
import {
  advanceClock,
  conversationMood,
  nextChangeAt,
  NO_CLOCK,
  NO_SCENE,
  type MoodClock,
  type Scene,
} from "./conversationMood";
import type { ProtonMood } from "./protonMood";

/** The blob's mood as the conversation goes on: it follows the scene, and lingering moods fade on their own. */
export function useConversationMood(scene: Scene): ProtonMood {
  const [time, setTime] = useState<{ clock: MoodClock; now: number }>(() => ({
    clock: NO_CLOCK,
    now: Date.now(),
  }));
  const applied = useRef<Scene>(NO_SCENE);
  const { available, answering, streaming, failures, cardOpen, confirmed } = scene;

  // The clock moves from a timer callback, so a change shows on the next tick rather than inside the effect.
  useEffect(() => {
    const after: Scene = { available, answering, streaming, failures, cardOpen, confirmed };
    const timer = setTimeout(() => {
      const before = applied.current;
      applied.current = after;
      const now = Date.now();
      setTime((t) => ({ clock: advanceClock(before, after, t.clock, now), now }));
    }, 0);
    return () => clearTimeout(timer);
  }, [available, answering, streaming, failures, cardOpen, confirmed]);

  useEffect(() => {
    const at = nextChangeAt(time.clock, time.now);
    if (at == null) return;
    const wake = () => setTime((t) => ({ ...t, now: Date.now() }));
    const timer = setTimeout(wake, at - time.now + 20);
    return () => clearTimeout(timer);
  }, [time]);

  return conversationMood(scene, time.clock, time.now);
}
