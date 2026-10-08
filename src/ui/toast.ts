import { useSyncExternalStore } from "react";
import type { IconName } from "./icons";

/*
 * Toasts, as on the web (src/shared/components/Feedback/toast.ts): a short confirmation of something the person
 * just did, with an optional action such as Undo. Failures of what is on screen are shown next to it instead.
 */

export type Toast = {
  id: number;
  text: string;
  sub?: string;
  icon?: IconName;
  actionLabel?: string;
  action?: () => void;
  duration?: number;
};

/** A plain confirmation briefly; one with an action, or saying what went wrong, long enough to act on it. */
export const TOAST_MS = { short: 2000, long: 5000 };

let toasts: Toast[] = [];
let nextId = 1;
const listeners = new Set<() => void>();
const timers = new Map<number, ReturnType<typeof setTimeout>>();

function emit() {
  listeners.forEach((listener) => listener());
}

/** Shows a toast and returns its id. */
export function toast(t: Omit<Toast, "id">): number {
  const shown: Toast = { ...t, id: nextId++ };
  toasts = [...toasts, shown];
  emit();
  const ms =
    shown.duration ?? (shown.action || shown.icon === "alert" ? TOAST_MS.long : TOAST_MS.short);
  timers.set(
    shown.id,
    setTimeout(() => dismissToast(shown.id), ms),
  );
  return shown.id;
}

export function dismissToast(id: number) {
  clearTimeout(timers.get(id));
  timers.delete(id);
  if (!toasts.some((t) => t.id === id)) return;
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

/** Drops every toast (a sign-out: an Undo must not act for the next person). */
export function clearToasts() {
  timers.forEach((timer) => clearTimeout(timer));
  timers.clear();
  toasts = [];
  emit();
}

export function useToasts(): Toast[] {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => toasts,
  );
}
