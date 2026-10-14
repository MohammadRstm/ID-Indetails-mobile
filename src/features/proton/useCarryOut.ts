import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import type { ProtonUiCommand } from "@/api/types";
import { requestLogWork } from "@/features/work/logWorkRequest";
import { usePermissions } from "@/permissions/usePermissions";
import { useTheme } from "@/theme/ThemeProvider";
import { setProtonDraft } from "./drafts";
import { describePlan, hrefsToOpen, planCommands } from "./runCommands";

/**
 * Does what Proton's commands came to and returns the line to show for it, or null when there is nothing to say.
 * What a screen needs on arrival (a form's values, a message waiting in a chat) is left first, then the screens
 * open. Nothing is saved or sent: the person does that.
 */
export function useCarryOut() {
  const perms = usePermissions();
  const queryClient = useQueryClient();
  const { setPreference } = useTheme();
  return (commands: ProtonUiCommand[] | null | undefined): string | null => {
    const steps = planCommands(commands, perms);
    for (const step of steps) {
      if (step.kind === "fill_log_work") requestLogWork(step.request);
      if (step.kind === "draft") setProtonDraft(step.chat, step.body);
      if (step.kind === "theme") setPreference(step.theme);
      if (step.kind === "refresh") {
        void queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] !== "proton" });
      }
    }
    for (const href of hrefsToOpen(steps)) router.push(href);
    return describePlan(steps);
  };
}
