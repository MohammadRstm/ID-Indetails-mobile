import { useQuery } from "@tanstack/react-query";
import { http } from "@/api/http";
import type { Schemas } from "@/api/types";
import { env } from "@/config/env";

export type Branding = Schemas["BrandingResponse"];

export const brandingKey = ["company", "branding"] as const;

/** The company's name and whether it has a logo. Public, so the signed-out screens show them too. */
export function useBranding() {
  return useQuery({
    queryKey: brandingKey,
    queryFn: async () => (await http.get<Branding>("/company/branding")).data,
    staleTime: 10 * 60_000,
  });
}

/** The logo's address; the file id in it changes with every new logo, so an old cached one never shows. */
export function logoUriOf(branding: Branding | undefined): string | null {
  if (!branding?.hasLogo) return null;
  return `${env.apiUrl}/api/company/logo?v=${branding.logoFileId ?? ""}`;
}

/** What the signed-out screens show at the top; nothing while it loads or when it can't. */
export function useAuthBranding(): { companyName: string | null; logoUri: string | null } {
  const { data } = useBranding();
  return { companyName: data?.name ?? null, logoUri: logoUriOf(data) };
}
