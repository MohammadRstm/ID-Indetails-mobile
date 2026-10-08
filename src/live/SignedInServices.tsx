import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useCurrentUser } from "@/auth/session";
import { startQueryPersistence } from "@/offline/persistence";
import { startSyncEngine } from "@/offline/sync";
import { P } from "@/permissions/codes";
import { usePermissions } from "@/permissions/usePermissions";
import { usePushSetup } from "@/push/usePushSetup";
import { useLiveConnection } from "./useLiveConnection";

/**
 * What runs while someone is signed in, for as long as they are: the outbox sync engine, the kept query cache of
 * site staff, push, and the live connection. Rendered once inside the signed-in, unlocked part of the app
 * (app/(app)/_layout.tsx), so a notification tap opens its screen only after the lock.
 */
export function SignedInServices() {
  const me = useCurrentUser();
  const perms = usePermissions();
  const queryClient = useQueryClient();
  const recordsOnSite = perms.hasAny(
    P.MATERIAL_CREATE,
    P.MATERIAL_MANAGE,
    P.LABOUR_REPORT_CREATE,
    P.LABOUR_REPORT_MANAGE,
  );

  useEffect(() => startSyncEngine(me.id, queryClient), [me.id, queryClient]);
  useEffect(
    () => (recordsOnSite ? startQueryPersistence(queryClient, me.id) : undefined),
    [recordsOnSite, me.id, queryClient],
  );
  usePushSetup();
  useLiveConnection();
  return null;
}
