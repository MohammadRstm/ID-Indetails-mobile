import { useCurrentUser } from "@/auth/session";
import { P } from "@/permissions/codes";
import { usePermissions } from "@/permissions/usePermissions";
import type { Reader } from "./words";

/** The person reading their notifications, as the words need them. */
export function useReader(): Reader {
  const me = useCurrentUser();
  const perms = usePermissions();
  return {
    userId: me.id,
    isAdmin: perms.isAdmin,
    logsWork:
      perms.hasAll(P.WORK_ENTRY_CREATE, P.WORK_ENTRY_VIEW_OWN) && perms.canSeeDomain("design"),
    domain: perms.homeDomain ?? perms.visibleDomains[0] ?? null,
  };
}
