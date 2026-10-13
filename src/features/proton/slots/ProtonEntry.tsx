import { router } from "expo-router";
import { P } from "@/permissions/codes";
import type { Domain } from "@/permissions/permissions";
import { usePermissions } from "@/permissions/usePermissions";
import { protonPageHref, type PhonePage } from "../pageContext";
import { AskProtonButton } from "../components/AskProtonButton";

type ProtonEntryProps = {
  /** The page it sits on, so Proton knows where the person is. */
  page: PhonePage;
  /** The area asked from; the person's own domain when left out. */
  domain?: Domain | null;
  compact?: boolean;
};

/** Opens Proton from one of the phone's pages, for anyone who may use it (proton:use); nothing for the rest. */
export function ProtonEntry({ page, domain, compact }: ProtonEntryProps) {
  const perms = usePermissions();
  if (!perms.has(P.PROTON_USE)) return null;
  return (
    <AskProtonButton
      compact={compact}
      onPress={() => router.push(protonPageHref(page, domain ?? perms.homeDomain))}
    />
  );
}
