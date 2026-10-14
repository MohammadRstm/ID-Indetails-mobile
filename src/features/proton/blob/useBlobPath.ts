import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, AppState } from "react-native";
import { FRAME_MS, frameAt, restingPath, type Motion } from "./blobMotion";
import { isLively, type ProtonMood } from "./protonMood";

/** Whether the blob may move: not while the phone asks for reduced motion, and not while the app is in the background. */
function useMotionAllowed(): boolean {
  const [reduced, setReduced] = useState(true);
  const [active, setActive] = useState(AppState.currentState === "active");

  useEffect(() => {
    let alive = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((on) => {
      if (alive) setReduced(on);
    });
    const motion = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduced);
    const state = AppState.addEventListener("change", (next) => setActive(next === "active"));
    return () => {
      alive = false;
      motion.remove();
      state.remove();
    };
  }, []);

  return !reduced && active;
}

/**
 * The blob's outline. At rest it is the mood's resting shape; while it thinks, works or talks (and motion is
 * allowed) a requestAnimationFrame loop redraws it about 30 times a second. Any other mood runs no loop at all.
 */
export function useBlobPath(mood: ProtonMood): string {
  const allowed = useMotionAllowed();
  const lively = allowed && isLively(mood);
  const [path, setPath] = useState(() => restingPath(mood));
  const motion = useRef<Motion>({ scale: 0, velocity: 0 });

  useEffect(() => {
    if (!lively) return;
    let frame = 0;
    let last = 0;
    const tick = (time: number) => {
      frame = requestAnimationFrame(tick);
      if (last && time - last < FRAME_MS) return;
      const dt = last ? (time - last) / 1000 : 0;
      last = time;
      const next = frameAt(time / 1000, dt, mood, motion.current);
      motion.current = next.motion;
      setPath(next.path);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [lively, mood]);

  return lively ? path : restingPath(mood);
}
