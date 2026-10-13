import { blobPath, radiiAt, springStep } from "./blobShape";
import type { ProtonMood } from "./protonMood";

/** The blob is drawn in a 100 × 100 box. */
export const CENTRE = 50;
export const RADIUS = 34;

/** While it moves, the shape is redrawn at most this often (about 30 frames a second). */
export const FRAME_MS = 33;

export const restingPath = (mood: ProtonMood) => blobPath(radiiAt(0, mood), CENTRE, CENTRE, RADIUS);

/**
 * How loudly the blob "speaks" at `t` seconds: a steady breath while the answer's text arrives, nothing in any
 * other mood. (The web follows the arriving words; the phone's header only needs it to look alive.)
 */
export const breathAt = (t: number, mood: ProtonMood) =>
  mood === "talking" ? 0.6 + 0.4 * Math.sin(t * 6) : 0;

export type Motion = { scale: number; velocity: number };

/** One frame: the spring moves towards the breath, and the outline is drawn from it. */
export function frameAt(
  time: number,
  dt: number,
  mood: ProtonMood,
  from: Motion,
): { motion: Motion; path: string } {
  const [scale, velocity] = springStep(from.scale, from.velocity, breathAt(time, mood), dt);
  const radii = radiiAt(time, mood, Math.max(0, scale));
  return { motion: { scale, velocity }, path: blobPath(radii, CENTRE, CENTRE, RADIUS) };
}
