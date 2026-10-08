import type { MaterialDraft } from "./model";

/*
 * Materials to start the Add materials sheet with: a refused record's values copied to another site. Left here
 * by whoever opens the sheet, and taken once.
 */

let pending: MaterialDraft[] | null = null;

export function requestMaterialsCopy(drafts: MaterialDraft[]) {
  pending = drafts;
}

export function takeMaterialsCopy(): MaterialDraft[] {
  const drafts = pending ?? [];
  pending = null;
  return drafts;
}
