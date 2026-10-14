import { protonDark, protonLight } from "@/theme/tokens";
import { breathAt, frameAt, restingPath } from "./blobMotion";
import { blobPath, POINTS, radiiAt, springStep } from "./blobShape";
import { isLively, moodName, moodOf, WORKING_AFTER_MS, type MoodInputs } from "./protonMood";
import { protonPalette, solidAndOpacity } from "./protonPalette";

const calm: MoodInputs = {
  available: true,
  askedAt: null,
  talkingUntil: 0,
  errorUntil: 0,
  happyUntil: 0,
  cardOpen: false,
  composing: false,
};

describe("Proton's mood", () => {
  it("shows the most important thing first", () => {
    const now = 10_000;
    expect(moodOf(calm, now)).toBe("idle");
    expect(moodOf({ ...calm, composing: true }, now)).toBe("listening");
    expect(moodOf({ ...calm, composing: true, cardOpen: true }, now)).toBe("proposing");
    expect(moodOf({ ...calm, cardOpen: true, happyUntil: now + 1 }, now)).toBe("happy");
    expect(moodOf({ ...calm, happyUntil: now + 1, askedAt: now }, now)).toBe("thinking");
    // text arriving while the question is still open: it talks
    expect(moodOf({ ...calm, talkingUntil: now + 1, askedAt: now - WORKING_AFTER_MS }, now)).toBe(
      "talking",
    );
    expect(moodOf({ ...calm, askedAt: now - WORKING_AFTER_MS }, now)).toBe("working");
    expect(moodOf({ ...calm, askedAt: now, errorUntil: now + 1 }, now)).toBe("error");
    expect(moodOf({ ...calm, available: false, errorUntil: now + 1 }, now)).toBe("asleep");
    // what has passed no longer counts
    expect(moodOf({ ...calm, talkingUntil: now, errorUntil: now - 1, happyUntil: now }, now)).toBe(
      "idle",
    );
  });

  it("names the blob with its mood, and only thinking, working and talking move", () => {
    expect(moodName("thinking")).toBe("Proton, thinking");
    expect(moodName("asleep")).toBe("Proton, resting");
    expect(["thinking", "working", "talking"].every((m) => isLively(m as never))).toBe(true);
    expect(isLively("idle")).toBe(false);
    expect(isLively("proposing")).toBe(false);
  });
});

describe("the blob's shape", () => {
  it("is a closed, soft curve through its radii, the same for the same moment", () => {
    const radii = radiiAt(1.5, "thinking");
    expect(radii).toHaveLength(POINTS);
    expect(radiiAt(1.5, "thinking")).toEqual(radii);
    const d = blobPath(radii, 50, 50, 34);
    expect(d.startsWith("M")).toBe(true);
    expect(d.endsWith("Z")).toBe(true);
    expect(d.match(/C/g)).toHaveLength(POINTS);
  });

  it("inflates while talking and sits lower when asleep", () => {
    const average = (r: number[]) => r.reduce((a, b) => a + b) / r.length;
    expect(average(radiiAt(0, "talking", 1))).toBeGreaterThan(
      average(radiiAt(0, "talking", 0)) + 0.1,
    );
    expect(average(radiiAt(0, "asleep"))).toBeLessThan(average(radiiAt(0, "idle")));
  });

  it("eases towards a new size instead of jumping", () => {
    let [value, velocity] = [0, 0];
    [value, velocity] = springStep(value, velocity, 1, 1 / 60);
    expect(value).toBeGreaterThan(0);
    expect(value).toBeLessThan(0.5);
    for (let i = 0; i < 240; i++) [value, velocity] = springStep(value, velocity, 1, 1 / 60);
    expect(value).toBeCloseTo(1, 2);
  });
});

describe("the blob's motion", () => {
  it("rests on the shape at time zero", () => {
    expect(restingPath("idle")).toBe(blobPath(radiiAt(0, "idle"), 50, 50, 34));
  });

  it("breathes only while talking", () => {
    expect(breathAt(1, "thinking")).toBe(0);
    expect(breathAt(1, "idle")).toBe(0);
    expect(breathAt(0.3, "talking")).toBeGreaterThan(0);
  });

  it("draws a closed outline each frame and carries the spring on", () => {
    const first = frameAt(0.4, 1 / 30, "talking", { scale: 0, velocity: 0 });
    expect(first.path.endsWith("Z")).toBe(true);
    expect(first.motion.scale).not.toBe(0);
    const second = frameAt(0.43, 1 / 30, "talking", first.motion);
    expect(second.path).not.toBe(first.path);
  });
});

describe("the blob's colours", () => {
  it("uses the theme's body and the mood's overrides", () => {
    expect(protonPalette("light", "idle")).toEqual(protonLight);
    expect(protonPalette("dark", "thinking")).toEqual(protonDark);
    expect(protonPalette("light", "asleep")).toMatchObject({
      body1: "#B9C9C6",
      eye: protonLight.eye,
    });
    expect(protonPalette("dark", "error")).toMatchObject({
      body2: "#B4553F",
      sheen: protonDark.sheen,
    });
    // happy only changes the glow
    expect(protonPalette("light", "happy")).toEqual({
      ...protonLight,
      glow: "rgba(120,230,170,.7)",
    });
  });

  it("splits a translucent colour into a solid one and its opacity", () => {
    expect(solidAndOpacity("rgba(54,176,166,.55)")).toEqual({
      solid: "rgb(54,176,166)",
      opacity: 0.55,
    });
    expect(solidAndOpacity("#04211E")).toEqual({ solid: "#04211E", opacity: 1 });
  });
});
