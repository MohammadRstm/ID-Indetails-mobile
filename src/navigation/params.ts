import { useLocalSearchParams } from "expo-router";

/*
 * Route parameters arrive from links and pushes, so they are read defensively: a value that isn't what the route
 * expects reads as null, and the route shows "not available" instead of asking the API for nonsense.
 */

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** A positive whole-number id. */
export function parseId(value: string | string[] | undefined): number | null {
  const text = first(value);
  if (!text || !/^\d{1,15}$/.test(text)) return null;
  const id = Number(text);
  return id > 0 ? id : null;
}

/** A calendar day, "yyyy-MM-dd". */
export function parseDay(value: string | string[] | undefined): string | null {
  const text = first(value);
  return text && /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
}

export function useIdParam(name: string): number | null {
  return parseId(useLocalSearchParams()[name]);
}

export function useDayParam(name: string): string | null {
  return parseDay(useLocalSearchParams()[name]);
}

/** A parameter that must be one of a few known words, such as a section name. */
export function useChoiceParam<T extends string>(name: string, choices: readonly T[]): T | null {
  const text = first(useLocalSearchParams()[name]);
  return choices.find((choice) => choice === text) ?? null;
}
