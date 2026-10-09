import { pathForIncomingLink } from "@/features/shell/links";

/** Expo Router asks here where a link that opened the app should go (features/shell/links.ts). */
export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  return pathForIncomingLink(path);
}
