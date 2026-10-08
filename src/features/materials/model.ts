import type { MaterialItem } from "@/offline/model";

/*
 * One material being typed in the Add materials sheet, and what it becomes in the outbox. The sheet checks the
 * same shape the API takes (a type, and a cost: quantity with unit cost, or a total); the API works out the rest.
 */

export type MaterialDraft = {
  name: string;
  supplier: string;
  quantity: number | null;
  unit: string;
  unitCost: number | null;
  amount: number | null;
  note: string;
};

export const EMPTY_DRAFT: MaterialDraft = {
  name: "",
  supplier: "",
  quantity: null,
  unit: "",
  unitCost: null,
  amount: null,
  note: "",
};

export function isBlank(d: MaterialDraft): boolean {
  return (
    !d.name.trim() &&
    !d.supplier.trim() &&
    d.quantity == null &&
    !d.unit.trim() &&
    d.unitCost == null &&
    d.amount == null &&
    !d.note.trim()
  );
}

/** What stops a draft from being added, in words; null when it can be. */
export function draftProblem(d: MaterialDraft): string | null {
  if (!d.name.trim()) return "Say what the material is.";
  if (d.name.trim().length > 200) return "The type can be at most 200 characters.";
  const values = [d.quantity, d.unitCost, d.amount];
  if (values.some((v) => v != null && v < 0)) return "Numbers can't be negative.";
  const priced = (d.quantity != null && d.unitCost != null) || d.amount != null;
  if (!priced) return "Give the quantity and unit cost, or the total.";
  return null;
}

const orNull = (text: string) => (text.trim() ? text.trim() : null);

/** The outbox item for a checked draft, with the reference that stays with it through every retry. */
export function toItem(d: MaterialDraft, clientRef: string): MaterialItem {
  return {
    clientRef,
    name: d.name.trim(),
    quantity: d.quantity,
    unit: orNull(d.unit),
    unitCost: d.unitCost,
    amount: d.quantity != null && d.unitCost != null ? null : d.amount,
    supplier: orNull(d.supplier),
    note: orNull(d.note),
  };
}

/** A draft from an item: "Repeat last", or copying a refused record's values to another site. */
export function draftOf(item: Omit<MaterialItem, "clientRef">): MaterialDraft {
  return {
    name: item.name,
    supplier: item.supplier ?? "",
    quantity: item.quantity,
    unit: item.unit ?? "",
    unitCost: item.unitCost,
    amount: item.amount,
    note: item.note ?? "",
  };
}

/** The first few labels, as quick picks: the site's most used types, or its suppliers. */
export function quickPicks(labels: string[], typed: string, max = 6): string[] {
  const needle = typed.trim().toLowerCase();
  return labels
    .filter(
      (label) =>
        !needle || (label.toLowerCase().includes(needle) && label.toLowerCase() !== needle),
    )
    .slice(0, max);
}

/** A material's amount in words, without money: "12 bags", "3.5 m²", or nothing. */
export function quantityText(quantity: number | null, unit: string | null): string | null {
  if (quantity == null) return null;
  return unit ? `${quantity} ${unit}` : String(quantity);
}
