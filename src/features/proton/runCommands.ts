import type { Href } from "expo-router";
import type { ProtonUiCommand } from "@/api/types";
import { routeForProtonCommand } from "@/navigation/targets";
import type { Permissions } from "@/permissions/permissions";

/** What Proton's commands come to on the phone: a screen to open, a refresh, or nothing that can be done here. */
export type CommandPlan =
  { kind: "go"; href: Href; label: string } | { kind: "refresh" } | { kind: "unavailable" };

/**
 * One step at most, from the first two commands (as the web does). Each command is checked by the app's own route
 * table and this person's permissions; the API never sends an address. No commands, no plan.
 */
export function planCommands(
  commands: ProtonUiCommand[] | null | undefined,
  perms: Permissions,
): CommandPlan | null {
  if (!commands || commands.length === 0) return null;
  const firstTwo = commands.slice(0, 2);
  for (const command of firstTwo) {
    const href = routeForProtonCommand(command, perms);
    if (href) return { kind: "go", href, label: command.label };
  }
  if (firstTwo.some((c) => c.type === "refresh")) return { kind: "refresh" };
  return { kind: "unavailable" };
}

/** The line shown in the chat for what was done. */
export function describePlan(plan: CommandPlan): string {
  switch (plan.kind) {
    case "go":
      return `Opened ${plan.label}.`;
    case "refresh":
      return "Refreshed the screens.";
    case "unavailable":
      return "That couldn't be opened here.";
  }
}
