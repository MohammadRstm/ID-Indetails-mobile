import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import type { ProtonUiCommand } from "@/api/types";
import { usePermissions } from "@/permissions/usePermissions";
import { describePlan, planCommands } from "./runCommands";

/**
 * Does what Proton's commands came to (opens a screen, or refreshes the others) and returns the line to show for
 * it, or null when there were no commands.
 */
export function useCarryOut() {
  const perms = usePermissions();
  const queryClient = useQueryClient();
  return (commands: ProtonUiCommand[] | null | undefined): string | null => {
    const plan = planCommands(commands, perms);
    if (!plan) return null;
    if (plan.kind === "go") router.push(plan.href);
    if (plan.kind === "refresh") {
      void queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] !== "proton" });
    }
    return describePlan(plan);
  };
}
