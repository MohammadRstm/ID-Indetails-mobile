import type { Href } from "expo-router";
import type { ProtonUiCommand, Schemas } from "@/api/types";
import type { Chat } from "@/features/messages/api";
import type { LogWorkRequest } from "@/features/work/logWorkRequest";
import { isId, routeForProtonCommand, routeForProtonSurface } from "@/navigation/targets";
import type { Permissions } from "@/permissions/permissions";

/*
 * What Proton's commands come to on the phone (the web's uiCommands.ts): at most three, in the order the API sent
 * them. Each is checked by the app's own route table and this person's permissions; the API never sends an
 * address. A form is filled for the person to check and save, never submitted, and a message is only drafted.
 */

export type CommandStep =
  | { kind: "go"; href: Href; label: string }
  /** The log-work screen, opened with what Proton filled in. */
  | { kind: "fill_log_work"; href: Href; request: LogWorkRequest; filled: string[]; label: string }
  /** A chat, opened with a message waiting in its composer. */
  | { kind: "draft"; href: Href; chat: Chat; body: string; label: string }
  | { kind: "theme"; theme: "light" | "dark" }
  | { kind: "refresh" }
  /** A display choice the phone has no setting for (message sounds). */
  | { kind: "ignored" }
  | { kind: "unavailable" };

const MAX_COMMANDS = 3;
const MAX_MESSAGE = 4_000;
const MAX_DESCRIPTION = 2_000;
const DAY_MINUTES = 1_440;
const UNAVAILABLE: CommandStep = { kind: "unavailable" };

const isMinute = (v: number | null): v is number =>
  v != null && Number.isInteger(v) && v >= 0 && v < DAY_MINUTES;

/** A real calendar day, "yyyy-MM-dd". */
function isRealDay(value: string | null): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

/** The log-work form's starting values from what Proton filled, and the names of what it filled. */
export function logWorkRequestOf(fill: Schemas["LogWorkFill"]): {
  request: LogWorkRequest;
  filled: string[];
} {
  const request: LogWorkRequest = {};
  const filled: string[] = [];
  if (isId(fill.projectId)) {
    request.projectId = fill.projectId;
    filled.push("project");
  }
  if (isRealDay(fill.day)) {
    request.date = fill.day;
    filled.push("day");
  }
  const start = fill.startMinute;
  if (isMinute(start)) {
    request.startMin = start;
    filled.push("start");
    const end = fill.endMinute;
    // An end before the start runs past midnight, as on the web's form.
    if (isMinute(end) && end !== start) {
      request.endMin = end > start ? end : end + DAY_MINUTES;
      filled.push("end");
    }
  }
  const description = fill.description?.trim();
  if (description && description.length <= MAX_DESCRIPTION) {
    request.description = description;
    filled.push("description");
  }
  return { request: { ...request, filledByProton: filled }, filled };
}

function fillStep(command: ProtonUiCommand, perms: Permissions): CommandStep {
  const fill = command.fill;
  if (fill?.form === "log_work" && fill.logWork) {
    const ask = { surface: "log_work", id: null, domain: command.domain } as const;
    const href = routeForProtonSurface(ask, perms);
    if (!href) return UNAVAILABLE;
    const { request, filled } = logWorkRequestOf(fill.logWork);
    return { kind: "fill_log_work", href, request, filled, label: command.label };
  }
  if (fill?.form === "message" && fill.message) {
    const surface = command.surface;
    const body = fill.message.body;
    if (!isId(fill.id) || !body.trim() || body.length > MAX_MESSAGE) return UNAVAILABLE;
    if (surface !== "message_person" && surface !== "message_team") return UNAVAILABLE;
    const href = routeForProtonSurface({ surface, id: fill.id, domain: command.domain }, perms);
    if (!href) return UNAVAILABLE;
    const chat: Chat =
      surface === "message_team"
        ? { kind: "team", teamId: fill.id }
        : { kind: "direct", userId: fill.id };
    return { kind: "draft", href, chat, body, label: command.label };
  }
  // Every other form is a web form.
  return UNAVAILABLE;
}

function stepOf(command: ProtonUiCommand, perms: Permissions): CommandStep {
  switch (command.type) {
    case "refresh":
      return { kind: "refresh" };
    case "set_preference":
      if (command.theme === "light" || command.theme === "dark") {
        return { kind: "theme", theme: command.theme };
      }
      return typeof command.sounds === "boolean" ? { kind: "ignored" } : UNAVAILABLE;
    case "fill_form":
      return fillStep(command, perms);
    default: {
      const href = routeForProtonCommand(command, perms);
      return href ? { kind: "go", href, label: command.label } : UNAVAILABLE;
    }
  }
}

/** The first three commands as steps, in order. No commands, no steps. */
export function planCommands(
  commands: ProtonUiCommand[] | null | undefined,
  perms: Permissions,
): CommandStep[] {
  return (commands ?? []).slice(0, MAX_COMMANDS).map((command) => stepOf(command, perms));
}

/** The screens the steps open, in order, each once: a chat opened and then drafted in is one screen. */
export function hrefsToOpen(steps: CommandStep[]): Href[] {
  const seen = new Set<string>();
  const hrefs: Href[] = [];
  for (const step of steps) {
    if (step.kind !== "go" && step.kind !== "fill_log_work" && step.kind !== "draft") continue;
    const key = JSON.stringify(step.href);
    if (seen.has(key)) continue;
    seen.add(key);
    hrefs.push(step.href);
  }
  return hrefs;
}

function describeStep(step: CommandStep): string | null {
  switch (step.kind) {
    case "go":
      return `Opened ${step.label}.`;
    case "fill_log_work":
      return step.filled.length > 0
        ? `Filled ${step.filled.join(", ")}: check it and save.`
        : `Opened ${step.label}.`;
    case "draft":
      return `Wrote ${step.label}: read it, then press Send.`;
    case "theme":
      return step.theme === "dark" ? "Switched to dark mode." : "Switched to light mode.";
    case "refresh":
      return "Refreshed the screens.";
    case "ignored":
      return null;
    case "unavailable":
      return "That couldn't be opened here.";
  }
}

/** The line shown in the chat for what was done: each different outcome once; null when there is nothing to say. */
export function describePlan(steps: CommandStep[]): string | null {
  const lines = new Set<string>();
  for (const step of steps) {
    const line = describeStep(step);
    if (line) lines.add(line);
  }
  return lines.size > 0 ? [...lines].join(" ") : null;
}
