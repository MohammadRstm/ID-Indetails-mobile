import { randomUUID } from "expo-crypto";
import Storage from "expo-sqlite/kv-store";
import { useSyncExternalStore } from "react";
import { parseTimerState, type RunningTimer, type StoppedRun, type TimerState } from "./model";

/*
 * The timer's state per person, in the phone's key-value store (like the web's localStorage timer), read through
 * useSyncExternalStore. Each person has their own key, so a shared phone never shows one person's timer to
 * another.
 */

const keyOf = (userId: number) => `idi.timer.${userId}`;
const states = new Map<number, TimerState>();
const listeners = new Set<() => void>();

function read(userId: number): TimerState {
  const cached = states.get(userId);
  if (cached) return cached;
  let raw: string | null = null;
  try {
    raw = Storage.getItemSync(keyOf(userId));
  } catch {
    // unreadable storage: no timer
  }
  const state = parseTimerState(raw, userId);
  states.set(userId, state);
  return state;
}

function write(userId: number, next: TimerState) {
  states.set(userId, next);
  try {
    if (next.running || next.stopped.length)
      Storage.setItemSync(keyOf(userId), JSON.stringify(next));
    else void Storage.removeItem(keyOf(userId));
  } catch {
    // storage unavailable: the timer still runs until the app is closed
  }
  listeners.forEach((listener) => listener());
}

export function timerState(userId: number): TimerState {
  return read(userId);
}

export function useTimerState(userId: number): TimerState {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => read(userId),
  );
}

export function saveRunning(timer: RunningTimer) {
  write(timer.userId, { ...read(timer.userId), running: timer });
}

/** Stops the running timer, keeping the run until it is logged or discarded. */
export function saveStopped(userId: number, stoppedAt: string): StoppedRun | null {
  const state = read(userId);
  if (!state.running) return null;
  const { projectId, projectTitle, description, startedAt } = state.running;
  const run: StoppedRun = {
    id: randomUUID(),
    projectId,
    projectTitle,
    description,
    startedAt,
    stoppedAt,
  };
  write(userId, { running: null, stopped: [run, ...state.stopped] });
  return run;
}

/** A stopped run was logged, or discarded. */
export function removeRun(userId: number, runId: string) {
  const state = read(userId);
  write(userId, { ...state, stopped: state.stopped.filter((run) => run.id !== runId) });
}

/** For tests: forgets what was read, so the next read comes from storage again. */
export function resetTimerCache() {
  states.clear();
}
