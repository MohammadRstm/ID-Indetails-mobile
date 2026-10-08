// Ported from the web client: src/shared/components/Identity/avatars.ts (see docs/ported-from-web.md).
// The same seed, hash, tints, options and DiceBear 9 give the same face as on the web. The phone draws the SVG
// text itself (react-native-svg) where the web uses a data URI.
import { createAvatar } from "@dicebear/core";
import * as notionists from "@dicebear/notionists";

/*
 * DiceBear "Notionists" (artwork CC0 1.0, code MIT), drawn from the person's name. The same name always gives the
 * same picture, for everyone, so nothing needs storing. An uploaded photo wins.
 */

const TINTS = ["d9ece7", "e3e2f4", "f4e6d7", "dde8f5", "f3e1e6", "e5eed9", "eee6f4", "dcecee"];
const cache = new Map<string, string>();

export function hash(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** The avatar's SVG markup. */
export function avatarSvg(name: string): string {
  const cached = cache.get(name);
  if (cached) return cached;
  const svg = createAvatar(notionists, {
    seed: name,
    backgroundColor: [TINTS[hash(name) % TINTS.length]],
    radius: 50,
    scale: 96,
    beardProbability: 20,
    glassesProbability: 25,
  }).toString();
  cache.set(name, svg);
  return svg;
}

export function initials(name: string): string {
  const parts = String(name || "")
    .trim()
    .split(/\s+/);
  return ((parts[0] || "")[0] || "") + ((parts[1] || "")[0] || "");
}
