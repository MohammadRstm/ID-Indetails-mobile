import type { Href } from "expo-router";
import type { PushTarget } from "@/api/mobileTypes";
import { routeForTarget } from "@/navigation/targets";
import type { Permissions } from "@/permissions/permissions";
import type { ProtonRef } from "./api";

function targetOf(ref: ProtonRef): PushTarget | null {
  switch (ref.type) {
    case "project":
      return ref.domain === "design" || ref.domain === "execution"
        ? { type: "project", id: ref.id, domain: ref.domain }
        : null;
    case "client":
      return { type: "client", id: ref.id };
    case "person":
      return { type: "person", id: ref.id };
    case "team":
      return { type: "conversation", teamId: ref.id };
  }
}

/** The screen a name in Proton's answer opens, or null when this person can't open it here. */
export function hrefOfRef(ref: ProtonRef, perms: Permissions): Href | null {
  const target = targetOf(ref);
  return target ? routeForTarget(target, perms) : null;
}
